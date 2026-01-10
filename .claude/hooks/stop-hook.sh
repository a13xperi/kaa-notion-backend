#!/bin/bash
# Ralph Wiggum Stop Hook - Production Version
# Intercepts Claude Code exit and continues the loop

RALPH_DIR="${HOME}/.ralph"
RALPH_STATE="${RALPH_DIR}/state.json"
RALPH_LOG="${RALPH_DIR}/ralph.log"
PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
PROMPT_FILE="${PROJECT_DIR}/PROMPT.md"
CONFIG_FILE="${PROJECT_DIR}/.ralph.json"

mkdir -p "${RALPH_DIR}"

# Initialize state
if [[ ! -f "${RALPH_STATE}" ]]; then
    echo '{"iteration":0,"started":"","status":"idle"}' > "${RALPH_STATE}"
fi

# Read config
MAX_ITERATIONS=50
COMPLETION_PROMISE="RALPH_COMPLETE"
if [[ -f "${CONFIG_FILE}" ]]; then
    MAX_ITERATIONS=$(jq -r '.maxIterations // 50' "${CONFIG_FILE}" 2>/dev/null || echo 50)
    COMPLETION_PROMISE=$(jq -r '.completionPromise // "RALPH_COMPLETE"' "${CONFIG_FILE}" 2>/dev/null || echo "RALPH_COMPLETE")
fi

# Read current state
CURRENT=$(jq -r '.iteration // 0' "${RALPH_STATE}" 2>/dev/null || echo 0)
NEXT=$((CURRENT + 1))
STATUS=$(jq -r '.status // "idle"' "${RALPH_STATE}" 2>/dev/null || echo "idle")

log() {
    echo "[$(date '+%H:%M:%S')] $*" >> "${RALPH_LOG}"
    echo "[$(date '+%H:%M:%S')] $*" >> "${PROJECT_DIR}/.ralph-output.log"
}

# Check stop conditions
if [[ "${STATUS}" == "stopped" ]] || [[ -f "${PROJECT_DIR}/.ralph-stop" ]]; then
    log "STOP signal received"
    jq '.status = "stopped" | .iteration = 0' "${RALPH_STATE}" > "${RALPH_STATE}.tmp" && mv "${RALPH_STATE}.tmp" "${RALPH_STATE}"
    rm -f "${PROJECT_DIR}/.ralph-stop"
    exit 0
fi

if [[ ! -f "${PROMPT_FILE}" ]]; then
    log "No PROMPT.md - exiting"
    exit 0
fi

# Check completion in transcript (stdin from Claude Code)
TRANSCRIPT=""
if [[ -t 0 ]]; then
    : # No stdin
else
    TRANSCRIPT=$(cat 2>/dev/null || true)
fi

if echo "${TRANSCRIPT}" | grep -qF "${COMPLETION_PROMISE}"; then
    log "=== TASK COMPLETE ==="
    jq '.status = "complete" | .iteration = 0' "${RALPH_STATE}" > "${RALPH_STATE}.tmp" && mv "${RALPH_STATE}.tmp" "${RALPH_STATE}"
    exit 0
fi

if [[ ${NEXT} -gt ${MAX_ITERATIONS} ]]; then
    log "Max iterations (${MAX_ITERATIONS}) reached"
    jq '.status = "max_iterations" | .iteration = 0' "${RALPH_STATE}" > "${RALPH_STATE}.tmp" && mv "${RALPH_STATE}.tmp" "${RALPH_STATE}"
    exit 0
fi

# Update state and continue
jq --arg iter "${NEXT}" --arg now "$(date -Iseconds)" \
   '.iteration = ($iter | tonumber) | .status = "running" | .lastUpdate = $now' \
   "${RALPH_STATE}" > "${RALPH_STATE}.tmp" && mv "${RALPH_STATE}.tmp" "${RALPH_STATE}"

log "Iteration ${NEXT}/${MAX_ITERATIONS} - continuing..."

# Re-inject prompt
PROMPT=$(cat "${PROMPT_FILE}")
cat << EOF

---
RALPH LOOP - Iteration ${NEXT}/${MAX_ITERATIONS}
---

${PROMPT}

---
When complete, output: ${COMPLETION_PROMISE}
EOF

exit 2
