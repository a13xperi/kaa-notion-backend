#!/bin/bash
# Ralph Wiggum Stop Hook
# Blocks Claude Code exit and re-feeds the prompt for autonomous looping
#
# Usage: Configure in .claude/settings.json as a Stop hook
# The loop continues until:
#   1. Completion promise is found in session output
#   2. Max iterations reached
#   3. RALPH_STOP file exists (manual stop)

set -euo pipefail

RALPH_DIR="${HOME}/.ralph"
RALPH_STATE="${RALPH_DIR}/state"
RALPH_LOG="${RALPH_DIR}/ralph.log"
PROJECT_DIR="$(pwd)"
PROMPT_FILE="${PROJECT_DIR}/PROMPT.md"
RALPH_STOP_FILE="${PROJECT_DIR}/.ralph-stop"

# Configuration (can be overridden by .ralph/config)
MAX_ITERATIONS="${RALPH_MAX_ITERATIONS:-50}"
COMPLETION_PROMISE="${RALPH_COMPLETION_PROMISE:-<promise>COMPLETE</promise>}"

# Ensure ralph directory exists
mkdir -p "${RALPH_DIR}"

# Initialize state file if it doesn't exist
if [[ ! -f "${RALPH_STATE}" ]]; then
    echo "0" > "${RALPH_STATE}"
fi

# Read current iteration
CURRENT_ITERATION=$(cat "${RALPH_STATE}")
NEXT_ITERATION=$((CURRENT_ITERATION + 1))

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "${RALPH_LOG}"
}

log "=== Stop hook triggered (iteration ${NEXT_ITERATION}/${MAX_ITERATIONS}) ==="

# Check for manual stop file
if [[ -f "${RALPH_STOP_FILE}" ]]; then
    log "RALPH_STOP file found - allowing exit"
    rm -f "${RALPH_STOP_FILE}"
    echo "0" > "${RALPH_STATE}"  # Reset for next run
    exit 0  # Allow exit
fi

# Check if PROMPT.md exists (Ralph is active)
if [[ ! -f "${PROMPT_FILE}" ]]; then
    log "No PROMPT.md found - Ralph not active, allowing exit"
    exit 0  # Allow exit
fi

# Check for completion promise in recent output (passed via stdin or env)
if [[ -n "${CLAUDE_OUTPUT:-}" ]] && echo "${CLAUDE_OUTPUT}" | grep -qF "${COMPLETION_PROMISE}"; then
    log "Completion promise found! Task complete."
    echo "0" > "${RALPH_STATE}"  # Reset for next run
    exit 0  # Allow exit
fi

# Check max iterations
if [[ ${NEXT_ITERATION} -gt ${MAX_ITERATIONS} ]]; then
    log "Max iterations (${MAX_ITERATIONS}) reached - allowing exit"
    echo "0" > "${RALPH_STATE}"  # Reset for next run
    exit 0  # Allow exit
fi

# Update iteration count
echo "${NEXT_ITERATION}" > "${RALPH_STATE}"

# Read the prompt
PROMPT_CONTENT=$(cat "${PROMPT_FILE}")

log "Blocking exit and re-feeding prompt (iteration ${NEXT_ITERATION})"

# Output the prompt to be re-fed to Claude
# The hook blocks exit (exit code 2) and provides the next prompt
cat << EOF
Ralph Loop - Iteration ${NEXT_ITERATION}/${MAX_ITERATIONS}

Continue working on the task. Your previous work is saved in the files.

${PROMPT_CONTENT}

---
Remember: Output ${COMPLETION_PROMISE} when the task is fully complete.
EOF

# Exit code 2 = block exit and re-inject the above as next prompt
exit 2
