#!/bin/bash
# Agent Setup Script for Multi-Agent Claude Code Workflow
# Usage: ./scripts/agent-setup.sh <agent-number> <feature-name>

set -e

AGENT_NUM=$1
FEATURE_NAME=$2

if [ -z "$AGENT_NUM" ] || [ -z "$FEATURE_NAME" ]; then
    echo "Usage: ./scripts/agent-setup.sh <agent-number> <feature-name>"
    echo "Example: ./scripts/agent-setup.sh 1 auth-refactor"
    exit 1
fi

if [ "$AGENT_NUM" -lt 1 ] || [ "$AGENT_NUM" -gt 5 ]; then
    echo "Error: Agent number must be between 1 and 5"
    exit 1
fi

BRANCH_NAME="agent-${AGENT_NUM}/${FEATURE_NAME}"

echo "=== Agent $AGENT_NUM Setup ==="
echo ""

# Define scopes
case $AGENT_NUM in
    1) SCOPE="/server/src/routes/*, /server/src/middleware/*" ;;
    2) SCOPE="/server/src/services/*, /server/src/utils/*, /server/src/config/*" ;;
    3) SCOPE="/kaa-app/src/components/*, /kaa-app/src/pages/*" ;;
    4) SCOPE="/kaa-app/src/api/*, /kaa-app/src/contexts/*, /kaa-app/src/hooks/*" ;;
    5) SCOPE="/shared/*, /prisma/*, /e2e/*, /scripts/*" ;;
esac

echo "Agent: $AGENT_NUM"
echo "Scope: $SCOPE"
echo "Branch: $BRANCH_NAME"
echo ""

# Fetch and update
echo ">>> Fetching latest..."
git fetch origin

# Check if integration branch exists
if ! git show-ref --verify --quiet refs/remotes/origin/integration; then
    echo "Error: 'integration' branch not found on remote."
    echo "Please create it first:"
    echo "  git checkout -b integration origin/portal-auth-upload"
    echo "  git push -u origin integration"
    exit 1
fi

# Checkout integration and pull
echo ">>> Updating integration branch..."
git checkout integration
git pull origin integration

# Create or checkout agent branch
if git show-ref --verify --quiet refs/heads/$BRANCH_NAME; then
    echo ">>> Checking out existing branch: $BRANCH_NAME"
    git checkout $BRANCH_NAME
    echo ">>> Rebasing on integration..."
    git rebase integration
else
    echo ">>> Creating new branch: $BRANCH_NAME"
    git checkout -b $BRANCH_NAME integration
fi

# Show coordination status
echo ""
echo "=== Current Coordination Status ==="
cat coordination/status.md 2>/dev/null || echo "(No status file found)"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Remember to:"
echo "1. Update coordination/status.md with your task"
echo "2. Only modify files in your scope: $SCOPE"
echo "3. Commit and push every 30-60 minutes"
echo "4. Check coordination/requests.md for cross-agent requests"
echo ""
echo "Start prompt for Claude Code:"
echo "---"
echo "You are Agent $AGENT_NUM. Your scope is: $SCOPE"
echo "Branch: $BRANCH_NAME"
echo "Read CLAUDE-CODE-MULTI-AGENT.md for full protocol."
echo "---"
