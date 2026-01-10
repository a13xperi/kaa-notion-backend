#!/bin/bash
#
# RALPH Stop Hook - Production Grade
# Implements circuit breaker, error detection, progress monitoring, and safety mechanisms
#
# Based on best practices from:
# - frankbria/ralph-claude-code
# - Anthropic's official ralph-wiggum plugin
# - AI agent safety patterns (circuit breakers, exponential backoff)
#
# Exit Codes:
#   0 = Allow stop (task complete, max iterations, or circuit breaker)
#   2 = Block stop (continue iteration - stderr becomes prompt to Claude)
#

set -uo pipefail

# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ══════════════════════════════════════════════════════════════════════════════

RALPH_DIR="${HOME}/.ralph"
PROJECT_DIR="$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd)" || PROJECT_DIR="$(pwd)"
STATE_FILE="${RALPH_DIR}/state.json"
LOG_FILE="${RALPH_DIR}/ralph.log"
METRICS_FILE="${RALPH_DIR}/metrics.json"
ACTIVITY_LOG="${PROJECT_DIR}/.ralph-output.log"
CONFIG_FILE="${PROJECT_DIR}/.ralph.json"
PROMPT_FILE="${PROJECT_DIR}/PROMPT.md"
STOP_FILE="${PROJECT_DIR}/.ralph-stop"
CHECKPOINT_DIR="${RALPH_DIR}/checkpoints"

# ═══════════════════════════════════════════════════════════════════════════
# CIRCUIT BREAKER THRESHOLDS (can be overridden in .ralph.json)
# ═══════════════════════════════════════════════════════════════════════════

CB_NO_PROGRESS_THRESHOLD="${RALPH_CB_NO_PROGRESS:-4}"        # Iterations without file changes
CB_SAME_ERROR_THRESHOLD="${RALPH_CB_SAME_ERROR:-5}"          # Iterations with identical error
CB_TEST_ONLY_THRESHOLD="${RALPH_CB_TEST_ONLY:-5}"            # Iterations with only test runs
CB_OUTPUT_DECLINE_THRESHOLD="${RALPH_CB_OUTPUT_DECLINE:-70}" # % decline in response quality
CB_CONSECUTIVE_FAILURES="${RALPH_CB_FAILURES:-3}"            # Consecutive non-zero exit codes

# Defaults
DEFAULT_MAX_ITERATIONS=30
DEFAULT_COMPLETION_PROMISE="RALPH_COMPLETE"

# ══════════════════════════════════════════════════════════════════════════════
# INITIALIZATION
# ══════════════════════════════════════════════════════════════════════════════

mkdir -p "${RALPH_DIR}" "${CHECKPOINT_DIR}"

# Initialize state file with full schema
init_state() {
    if [[ ! -f "${STATE_FILE}" ]] || [[ ! -s "${STATE_FILE}" ]]; then
        cat > "${STATE_FILE}" << 'INIT_STATE'
{
  "iteration": 0,
  "status": "idle",
  "started": null,
  "lastUpdate": null,
  "circuitBreaker": {
    "state": "closed",
    "noProgressCount": 0,
    "sameErrorCount": 0,
    "testOnlyCount": 0,
    "failureCount": 0,
    "lastError": null,
    "lastErrorHash": null,
    "lastFileHash": null,
    "lastOutputLength": 0,
    "tripReason": null
  },
  "session": {
    "totalIterations": 0,
    "totalErrors": 0,
    "filesModified": 0,
    "testsRun": 0,
    "testsPassed": 0,
    "testsFailed": 0
  }
}
INIT_STATE
    fi
}

init_state

# ══════════════════════════════════════════════════════════════════════════════
# LOGGING
# ══════════════════════════════════════════════════════════════════════════════

log() {
    local level="$1"
    shift
    local msg="$*"
    local ts
    ts=$(date '+%Y-%m-%d %H:%M:%S')
    local entry="[${ts}] [${level}] ${msg}"

    # Write to log files
    echo "${entry}" >> "${LOG_FILE}" 2>/dev/null || true
    echo "${entry}" >> "${ACTIVITY_LOG}" 2>/dev/null || true

    # Debug output
    [[ "${RALPH_DEBUG:-0}" == "1" ]] && echo "[RALPH] ${entry}" >&2
}

log_info()  { log "INFO " "$@"; }
log_warn()  { log "WARN " "$@"; }
log_error() { log "ERROR" "$@"; }
log_debug() { [[ "${RALPH_DEBUG:-0}" == "1" ]] && log "DEBUG" "$@"; }

# ══════════════════════════════════════════════════════════════════════════════
# STATE MANAGEMENT (atomic operations with temp files)
# ══════════════════════════════════════════════════════════════════════════════

get_state() {
    local path="$1"
    local default="${2:-}"
    local val
    val=$(jq -r "${path} // empty" "${STATE_FILE}" 2>/dev/null) || val=""
    echo "${val:-$default}"
}

set_state() {
    local updates="$1"
    local tmp="${STATE_FILE}.tmp.$$"

    # Atomic update with temp file
    if jq ". * ${updates}" "${STATE_FILE}" > "${tmp}" 2>/dev/null; then
        mv "${tmp}" "${STATE_FILE}"
    else
        rm -f "${tmp}"
        log_error "Failed to update state"
    fi
}

get_config() {
    local path="$1"
    local default="$2"
    local val=""

    if [[ -f "${CONFIG_FILE}" ]]; then
        val=$(jq -r "${path} // empty" "${CONFIG_FILE}" 2>/dev/null) || val=""
    fi

    echo "${val:-$default}"
}

# ══════════════════════════════════════════════════════════════════════════════
# HASHING & FINGERPRINTING
# ══════════════════════════════════════════════════════════════════════════════

get_file_hash() {
    # Get hash of project source files to detect changes
    # Excludes node_modules, .git, build outputs
    find "${PROJECT_DIR}" -type f \
        \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \
           -o -name "*.py" -o -name "*.prisma" -o -name "*.css" -o -name "*.scss" \) \
        ! -path "*/node_modules/*" \
        ! -path "*/.git/*" \
        ! -path "*/dist/*" \
        ! -path "*/build/*" \
        ! -path "*/.next/*" \
        ! -path "*/coverage/*" \
        -exec md5sum {} \; 2>/dev/null | sort | md5sum 2>/dev/null | cut -d' ' -f1 || echo "unknown"
}

get_error_hash() {
    local error="$1"
    echo "${error}" | md5sum 2>/dev/null | cut -d' ' -f1 || echo ""
}

# ══════════════════════════════════════════════════════════════════════════════
# ERROR DETECTION (Two-stage filtering to reduce false positives)
# ══════════════════════════════════════════════════════════════════════════════

extract_error() {
    local transcript="$1"

    # Stage 1: Find lines with error keywords
    local candidates
    candidates=$(echo "${transcript}" | grep -iE \
        '(error|failed|failure|exception|traceback|cannot|unable|fatal|panic|undefined|null reference)' \
        2>/dev/null || true)

    # Stage 2: Filter out false positives
    # - JSON fields like "error": false, "is_error": null
    # - Success messages like "0 errors"
    # - Log level indicators like "[ERROR]" in passing logs
    local filtered
    filtered=$(echo "${candidates}" | grep -vE \
        '("error"|"is_error"|"hasError"):\s*(false|null|0|"")' | \
        grep -vE '0 (errors?|failures?)' | \
        grep -vE 'error(s)? found: 0' | \
        grep -vE '\[error\].*success' | \
        head -3 || true)

    echo "${filtered}"
}

detect_test_only() {
    local transcript="$1"

    # Check if iteration only ran tests without modifying code
    local has_test_run=false
    local has_code_change=false

    if echo "${transcript}" | grep -qiE '(npm test|yarn test|jest|vitest|pytest|go test|cargo test|running tests?)'; then
        has_test_run=true
    fi

    if echo "${transcript}" | grep -qiE '(wrote|created|modified|edited|updated|added|deleted|removed).*(\.ts|\.tsx|\.js|\.jsx|\.py|\.go|\.rs)'; then
        has_code_change=true
    fi

    if [[ "${has_test_run}" == "true" ]] && [[ "${has_code_change}" == "false" ]]; then
        echo "true"
    else
        echo "false"
    fi
}

# ══════════════════════════════════════════════════════════════════════════════
# CIRCUIT BREAKER
# ══════════════════════════════════════════════════════════════════════════════

update_circuit_breaker() {
    local transcript="$1"

    # Get current state
    local no_progress_count same_error_count test_only_count failure_count
    no_progress_count=$(get_state '.circuitBreaker.noProgressCount' '0')
    same_error_count=$(get_state '.circuitBreaker.sameErrorCount' '0')
    test_only_count=$(get_state '.circuitBreaker.testOnlyCount' '0')
    failure_count=$(get_state '.circuitBreaker.failureCount' '0')

    local last_file_hash last_error_hash last_output_length
    last_file_hash=$(get_state '.circuitBreaker.lastFileHash' '')
    last_error_hash=$(get_state '.circuitBreaker.lastErrorHash' '')
    last_output_length=$(get_state '.circuitBreaker.lastOutputLength' '0')

    # Current measurements
    local current_file_hash current_error current_error_hash current_output_length is_test_only
    current_file_hash=$(get_file_hash)
    current_error=$(extract_error "${transcript}")
    current_error_hash=$(get_error_hash "${current_error}")
    current_output_length=${#transcript}
    is_test_only=$(detect_test_only "${transcript}")

    # === Update counters ===

    # No progress detection
    if [[ "${current_file_hash}" == "${last_file_hash}" ]] && [[ -n "${last_file_hash}" ]]; then
        no_progress_count=$((no_progress_count + 1))
        log_debug "No progress: count=${no_progress_count}"
    else
        no_progress_count=0
    fi

    # Same error detection
    if [[ -n "${current_error}" ]]; then
        if [[ "${current_error_hash}" == "${last_error_hash}" ]] && [[ -n "${last_error_hash}" ]]; then
            same_error_count=$((same_error_count + 1))
            log_debug "Same error: count=${same_error_count}"
        else
            same_error_count=1
        fi
    else
        same_error_count=0
    fi

    # Test-only detection
    if [[ "${is_test_only}" == "true" ]]; then
        test_only_count=$((test_only_count + 1))
        log_debug "Test only: count=${test_only_count}"
    else
        test_only_count=0
    fi

    # Output decline detection (check if responses are getting shorter/worse)
    if [[ ${last_output_length} -gt 100 ]] && [[ ${current_output_length} -gt 0 ]]; then
        local decline_pct=$(( (last_output_length - current_output_length) * 100 / last_output_length ))
        if [[ ${decline_pct} -gt ${CB_OUTPUT_DECLINE_THRESHOLD} ]]; then
            failure_count=$((failure_count + 1))
            log_debug "Output declined ${decline_pct}%: failure_count=${failure_count}"
        fi
    fi

    # Escape error for JSON
    local error_json
    error_json=$(echo "${current_error}" | head -1 | jq -Rs . 2>/dev/null || echo '""')

    # Update state
    set_state "{
        \"circuitBreaker\": {
            \"state\": \"closed\",
            \"noProgressCount\": ${no_progress_count},
            \"sameErrorCount\": ${same_error_count},
            \"testOnlyCount\": ${test_only_count},
            \"failureCount\": ${failure_count},
            \"lastError\": ${error_json},
            \"lastErrorHash\": \"${current_error_hash}\",
            \"lastFileHash\": \"${current_file_hash}\",
            \"lastOutputLength\": ${current_output_length}
        }
    }"
}

check_circuit_breaker() {
    local no_progress same_error test_only failures
    no_progress=$(get_state '.circuitBreaker.noProgressCount' '0')
    same_error=$(get_state '.circuitBreaker.sameErrorCount' '0')
    test_only=$(get_state '.circuitBreaker.testOnlyCount' '0')
    failures=$(get_state '.circuitBreaker.failureCount' '0')

    # Check thresholds
    if [[ ${no_progress} -ge ${CB_NO_PROGRESS_THRESHOLD} ]]; then
        echo "no_progress:${no_progress}"
        return 1
    fi

    if [[ ${same_error} -ge ${CB_SAME_ERROR_THRESHOLD} ]]; then
        echo "same_error:${same_error}"
        return 1
    fi

    if [[ ${test_only} -ge ${CB_TEST_ONLY_THRESHOLD} ]]; then
        echo "test_only:${test_only}"
        return 1
    fi

    if [[ ${failures} -ge ${CB_CONSECUTIVE_FAILURES} ]]; then
        echo "failures:${failures}"
        return 1
    fi

    echo "ok"
    return 0
}

get_circuit_breaker_message() {
    local reason="$1"
    local type count
    type=$(echo "${reason}" | cut -d: -f1)
    count=$(echo "${reason}" | cut -d: -f2)

    case "${type}" in
        no_progress)
            cat << EOF
RALPH CIRCUIT BREAKER TRIGGERED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reason: No file changes detected for ${count} consecutive iterations.

The task may be:
1. Stuck in a loop - try a completely different approach
2. Already complete - verify and output RALPH_COMPLETE
3. Blocked by an external dependency - document the blocker

Actions to take:
- Review recent changes with: git diff
- Check if success criteria are actually met
- Try an alternative implementation strategy
- If truly complete, output: RALPH_COMPLETE
EOF
            ;;
        same_error)
            local last_error
            last_error=$(get_state '.circuitBreaker.lastError' 'Unknown error')
            cat << EOF
RALPH CIRCUIT BREAKER TRIGGERED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reason: Same error repeated for ${count} consecutive iterations.

Error: ${last_error}

The fix attempts are not working. Try:
1. Read the error message carefully
2. Search for similar issues online
3. Try a fundamentally different approach
4. If this is a blocking issue, document it and output RALPH_COMPLETE

Do NOT repeat the same fix that isn't working.
EOF
            ;;
        test_only)
            cat << EOF
RALPH CIRCUIT BREAKER TRIGGERED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reason: Only running tests for ${count} consecutive iterations without code changes.

You're in a test loop. To make progress:
1. Analyze WHY tests are failing
2. Make actual code changes to fix the issues
3. Don't just re-run tests hoping for different results

If all tests pass and task is complete, output: RALPH_COMPLETE
EOF
            ;;
        failures)
            cat << EOF
RALPH CIRCUIT BREAKER TRIGGERED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reason: ${count} consecutive quality declines detected.

Response quality is degrading. This may indicate:
1. Task complexity exceeds current approach
2. Missing context or requirements
3. Conflicting constraints

Take a step back and reassess the approach.
EOF
            ;;
        *)
            echo "RALPH: Circuit breaker triggered (${reason}). Review and adjust approach."
            ;;
    esac
}

# ══════════════════════════════════════════════════════════════════════════════
# COMPLETION DETECTION
# ══════════════════════════════════════════════════════════════════════════════

check_completion() {
    local transcript="$1"
    local promise
    promise=$(get_config '.completionPromise' "${DEFAULT_COMPLETION_PROMISE}")

    # Check for completion promise
    if echo "${transcript}" | grep -qF "${promise}"; then
        log_info "Completion promise found: ${promise}"
        return 0
    fi

    return 1
}

check_max_iterations() {
    local current max
    current=$(get_state '.iteration' '0')
    max=$(get_config '.maxIterations' "${DEFAULT_MAX_ITERATIONS}")

    if [[ ${current} -ge ${max} ]]; then
        log_info "Max iterations reached: ${current}/${max}"
        return 0
    fi

    return 1
}

# ══════════════════════════════════════════════════════════════════════════════
# STOP CONDITIONS
# ══════════════════════════════════════════════════════════════════════════════

check_manual_stop() {
    if [[ -f "${STOP_FILE}" ]]; then
        log_info "Manual stop signal received"
        rm -f "${STOP_FILE}"
        return 0
    fi

    local status
    status=$(get_state '.status' 'running')
    if [[ "${status}" == "stopped" ]]; then
        return 0
    fi

    return 1
}

check_prompt_exists() {
    if [[ ! -f "${PROMPT_FILE}" ]]; then
        log_warn "PROMPT.md not found - Ralph inactive"
        return 0
    fi
    return 1
}

# ══════════════════════════════════════════════════════════════════════════════
# CHECKPOINTING
# ══════════════════════════════════════════════════════════════════════════════

create_checkpoint() {
    local iteration="$1"
    local checkpoint_file="${CHECKPOINT_DIR}/iter_${iteration}.json"

    # Save current state as checkpoint
    cp "${STATE_FILE}" "${checkpoint_file}" 2>/dev/null || true

    # Keep only last 10 checkpoints
    ls -t "${CHECKPOINT_DIR}"/iter_*.json 2>/dev/null | tail -n +11 | xargs -r rm -f
}

# ══════════════════════════════════════════════════════════════════════════════
# MAIN LOGIC
# ══════════════════════════════════════════════════════════════════════════════

main() {
    log_info "════════════════════════════════════════"
    log_info "Stop hook triggered"

    # Read transcript from stdin (Claude Code passes session transcript)
    local transcript=""
    if [[ ! -t 0 ]]; then
        # Use timeout to prevent hanging on stdin
        transcript=$(timeout 5 cat 2>/dev/null || true)
    fi

    local transcript_len=${#transcript}
    log_debug "Transcript length: ${transcript_len}"

    # Get iteration info
    local current_iter next_iter max_iter
    current_iter=$(get_state '.iteration' '0')
    next_iter=$((current_iter + 1))
    max_iter=$(get_config '.maxIterations' "${DEFAULT_MAX_ITERATIONS}")

    log_info "Iteration: ${next_iter}/${max_iter}"

    # ═══════════════════════════════════════════════════════════════════════
    # CHECK STOP CONDITIONS (exit 0 = allow Claude to stop)
    # ═══════════════════════════════════════════════════════════════════════

    # 1. Manual stop
    if check_manual_stop; then
        set_state '{"status": "stopped", "iteration": 0}'
        log_info "EXIT: Manual stop"
        exit 0
    fi

    # 2. No prompt file (Ralph not active)
    if check_prompt_exists; then
        set_state '{"status": "idle", "iteration": 0}'
        log_info "EXIT: No PROMPT.md"
        exit 0
    fi

    # 3. Completion promise found
    if check_completion "${transcript}"; then
        set_state '{"status": "complete", "iteration": 0}'
        log_info "═══════════════════════════════════════"
        log_info "TASK COMPLETE"
        log_info "═══════════════════════════════════════"
        exit 0
    fi

    # 4. Max iterations reached
    if check_max_iterations; then
        set_state '{"status": "max_iterations", "iteration": 0}'
        log_warn "═══════════════════════════════════════"
        log_warn "MAX ITERATIONS REACHED"
        log_warn "═══════════════════════════════════════"
        exit 0
    fi

    # 5. Update and check circuit breaker
    update_circuit_breaker "${transcript}"

    local cb_result
    cb_result=$(check_circuit_breaker) || true

    if [[ "${cb_result}" != "ok" ]]; then
        local cb_type
        cb_type=$(echo "${cb_result}" | cut -d: -f1)
        set_state "{\"status\": \"circuit_breaker\", \"circuitBreaker\": {\"state\": \"open\", \"tripReason\": \"${cb_type}\"}}"
        log_error "═══════════════════════════════════════"
        log_error "CIRCUIT BREAKER TRIPPED: ${cb_result}"
        log_error "═══════════════════════════════════════"

        # Output detailed message to stderr for Claude
        get_circuit_breaker_message "${cb_result}" >&2
        exit 0
    fi

    # ═══════════════════════════════════════════════════════════════════════
    # CONTINUE ITERATION (exit 2 = block stop, stderr becomes new prompt)
    # ═══════════════════════════════════════════════════════════════════════

    # Create checkpoint
    create_checkpoint "${next_iter}"

    # Update iteration state
    set_state "{
        \"iteration\": ${next_iter},
        \"status\": \"running\",
        \"lastUpdate\": \"$(date -Iseconds)\",
        \"session\": {
            \"totalIterations\": $(($(get_state '.session.totalIterations' '0') + 1))
        }
    }"

    log_info "Continuing to iteration ${next_iter}"

    # Read prompt
    local prompt=""
    if [[ -f "${PROMPT_FILE}" ]]; then
        prompt=$(cat "${PROMPT_FILE}")
    fi

    local completion_promise
    completion_promise=$(get_config '.completionPromise' "${DEFAULT_COMPLETION_PROMISE}")

    # Output continuation prompt to stderr (Claude sees this with exit 2)
    cat >&2 << EOF

╔══════════════════════════════════════════════════════════════════════════════╗
║  RALPH LOOP - Iteration ${next_iter}/${max_iter}
╚══════════════════════════════════════════════════════════════════════════════╝

Continue working on the task. Your previous work is preserved in the files.

${prompt}

────────────────────────────────────────────────────────────────────────────────
REQUIREMENTS:
• Make incremental, testable progress each iteration
• Run tests after changes: npm test
• Fix any errors before proceeding
• When ALL success criteria are met, output exactly: ${completion_promise}
────────────────────────────────────────────────────────────────────────────────
EOF

    # Exit 2 = block stop, stderr becomes prompt to Claude
    exit 2
}

# ══════════════════════════════════════════════════════════════════════════════
# RUN
# ══════════════════════════════════════════════════════════════════════════════

main "$@"
