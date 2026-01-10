#!/bin/bash
# Ralph Loop Management Script
# Usage: ./scripts/ralph.sh [command]
#
# Commands:
#   start       - Start a new Ralph loop session
#   stop        - Stop the current Ralph loop gracefully
#   status      - Show current loop status
#   reset       - Reset iteration counter
#   logs        - Show Ralph logs

set -euo pipefail

RALPH_DIR="${HOME}/.ralph"
RALPH_STATE="${RALPH_DIR}/state"
RALPH_LOG="${RALPH_DIR}/ralph.log"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RALPH_STOP_FILE="${PROJECT_DIR}/.ralph-stop"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure directories exist
mkdir -p "${RALPH_DIR}"

show_help() {
    cat << EOF
Ralph Loop Management

Usage: ./scripts/ralph.sh [command]

Commands:
  start [max]   Start Ralph loop (optional: max iterations, default 50)
  stop          Stop the current loop gracefully
  status        Show current loop status
  reset         Reset iteration counter to 0
  logs          Show recent Ralph logs
  help          Show this help message

Environment Variables:
  RALPH_MAX_ITERATIONS      Max iterations (default: 50)
  RALPH_COMPLETION_PROMISE  Completion signal (default: <promise>COMPLETE</promise>)

Files:
  PROMPT.md      - Your task instructions (required)
  @fix_plan.md   - Progress tracking
  .ralph-stop    - Create this file to stop the loop

Example:
  1. Edit PROMPT.md with your task
  2. Edit @fix_plan.md with your task breakdown
  3. Run: ./scripts/ralph.sh start 30
  4. Start Claude Code session
  5. Loop runs until complete or max iterations

EOF
}

cmd_start() {
    local max_iterations="${1:-50}"

    if [[ ! -f "${PROJECT_DIR}/PROMPT.md" ]]; then
        echo -e "${RED}Error: PROMPT.md not found${NC}"
        echo "Create PROMPT.md with your task instructions first."
        exit 1
    fi

    # Reset state
    echo "0" > "${RALPH_STATE}"
    rm -f "${RALPH_STOP_FILE}"

    # Set environment
    export RALPH_MAX_ITERATIONS="${max_iterations}"

    echo -e "${GREEN}Ralph Loop Initialized${NC}"
    echo -e "  Max iterations: ${BLUE}${max_iterations}${NC}"
    echo -e "  Prompt file: ${BLUE}PROMPT.md${NC}"
    echo -e "  Progress file: ${BLUE}@fix_plan.md${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Start a new Claude Code session"
    echo "  2. The loop will run automatically"
    echo "  3. To stop: ./scripts/ralph.sh stop"
    echo ""
    echo -e "${GREEN}Tip:${NC} Run 'claude' with your initial prompt from PROMPT.md"
}

cmd_stop() {
    touch "${RALPH_STOP_FILE}"
    echo -e "${YELLOW}Stop signal sent${NC}"
    echo "The loop will exit on the next iteration."
    echo "File created: ${RALPH_STOP_FILE}"
}

cmd_status() {
    echo -e "${BLUE}=== Ralph Loop Status ===${NC}"
    echo ""

    if [[ -f "${RALPH_STATE}" ]]; then
        local current=$(cat "${RALPH_STATE}")
        local max="${RALPH_MAX_ITERATIONS:-50}"
        echo -e "Current iteration: ${GREEN}${current}${NC} / ${max}"
    else
        echo -e "Status: ${YELLOW}Not initialized${NC}"
    fi

    if [[ -f "${RALPH_STOP_FILE}" ]]; then
        echo -e "Stop requested: ${RED}Yes${NC}"
    else
        echo -e "Stop requested: ${GREEN}No${NC}"
    fi

    if [[ -f "${PROJECT_DIR}/PROMPT.md" ]]; then
        echo -e "PROMPT.md: ${GREEN}Found${NC}"
    else
        echo -e "PROMPT.md: ${RED}Missing${NC}"
    fi

    if [[ -f "${PROJECT_DIR}/@fix_plan.md" ]]; then
        echo -e "@fix_plan.md: ${GREEN}Found${NC}"
    else
        echo -e "@fix_plan.md: ${YELLOW}Missing (optional)${NC}"
    fi

    echo ""
    if [[ -f "${RALPH_LOG}" ]]; then
        echo -e "${BLUE}Recent log entries:${NC}"
        tail -5 "${RALPH_LOG}" 2>/dev/null || echo "(no logs)"
    fi
}

cmd_reset() {
    echo "0" > "${RALPH_STATE}"
    rm -f "${RALPH_STOP_FILE}"
    echo -e "${GREEN}Ralph state reset${NC}"
    echo "Iteration counter set to 0"
}

cmd_logs() {
    if [[ -f "${RALPH_LOG}" ]]; then
        echo -e "${BLUE}=== Ralph Logs ===${NC}"
        tail -50 "${RALPH_LOG}"
    else
        echo "No logs found at ${RALPH_LOG}"
    fi
}

# Main
case "${1:-help}" in
    start)
        cmd_start "${2:-50}"
        ;;
    stop)
        cmd_stop
        ;;
    status)
        cmd_status
        ;;
    reset)
        cmd_reset
        ;;
    logs)
        cmd_logs
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo "Run './scripts/ralph.sh help' for usage"
        exit 1
        ;;
esac
