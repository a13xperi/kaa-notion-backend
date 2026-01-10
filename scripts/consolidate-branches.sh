#!/bin/bash
# Branch Consolidation Script
# Consolidates changes from Claude Code, Warp, and Cursor branches into portal-auth-upload

set -e

echo "🔄 Starting Branch Consolidation Process..."
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_BRANCH="portal-auth-upload"
CONSOLIDATION_BRANCH="consolidate/client-workspace-complete-$(date +%Y%m%d-%H%M%S)"
CURRENT_BRANCH=$(git branch --show-current)

echo -e "${BLUE}Current Branch:${NC} $CURRENT_BRANCH"
echo -e "${BLUE}Base Branch:${NC} $BASE_BRANCH"
echo -e "${BLUE}Consolidation Branch:${NC} $CONSOLIDATION_BRANCH"
echo ""

# Step 1: Fetch all remote branches
echo -e "${YELLOW}Step 1: Fetching all remote branches...${NC}"
git fetch --all
echo -e "${GREEN}✅ Fetched all branches${NC}"
echo ""

# Step 2: Check current branch status
echo -e "${YELLOW}Step 2: Checking current branch status...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Uncommitted changes detected:${NC}"
    git status --short
    echo ""
    echo -e "${YELLOW}Options:${NC}"
    echo "1. Commit current changes"
    echo "2. Stash current changes"
    echo "3. Abort"
    read -p "Choose option (1-3): " option
    
    case $option in
        1)
            echo -e "${BLUE}Committing current changes...${NC}"
            git add -A
            git commit -m "feat: Restore ClientWorkspace with all features + add Community component"
            echo -e "${GREEN}✅ Changes committed${NC}"
            ;;
        2)
            echo -e "${BLUE}Stashing current changes...${NC}"
            git stash push -m "WIP: ClientWorkspace consolidation - $(date +%Y%m%d-%H%M%S)"
            echo -e "${GREEN}✅ Changes stashed${NC}"
            ;;
        3)
            echo -e "${RED}Aborted${NC}"
            exit 1
            ;;
        *)
            echo -e "${RED}Invalid option${NC}"
            exit 1
            ;;
    esac
    echo ""
fi

# Step 3: Checkout base branch
echo -e "${YELLOW}Step 3: Checking out base branch ($BASE_BRANCH)...${NC}"
git checkout $BASE_BRANCH
git pull origin $BASE_BRANCH || echo -e "${YELLOW}⚠️  Could not pull $BASE_BRANCH (may not exist on remote)${NC}"
echo -e "${GREEN}✅ On base branch${NC}"
echo ""

# Step 4: Create consolidation branch
echo -e "${YELLOW}Step 4: Creating consolidation branch...${NC}"
git checkout -b $CONSOLIDATION_BRANCH
echo -e "${GREEN}✅ Created branch: $CONSOLIDATION_BRANCH${NC}"
echo ""

# Step 5: Merge Claude Code branch
echo -e "${YELLOW}Step 5: Merging Claude Code branch ($CURRENT_BRANCH)...${NC}"
if git show-ref --verify --quiet refs/heads/$CURRENT_BRANCH || git show-ref --verify --quiet refs/remotes/origin/$CURRENT_BRANCH; then
    echo -e "${BLUE}Attempting merge from $CURRENT_BRANCH...${NC}"
    if git merge $CURRENT_BRANCH --no-commit --no-ff 2>&1; then
        echo -e "${GREEN}✅ Merge successful${NC}"
        
        # Check for conflicts
        if [ -n "$(git diff --check)" ] || [ -n "$(git diff --cached --check)" ]; then
            echo -e "${RED}⚠️  Conflicts detected - manual resolution required${NC}"
            echo -e "${YELLOW}Conflicted files:${NC}"
            git diff --name-only --diff-filter=U
            echo ""
            echo -e "${YELLOW}To resolve conflicts:${NC}"
            echo "1. Review conflicted files"
            echo "2. Resolve conflicts manually"
            echo "3. Stage resolved files: git add <files>"
            echo "4. Complete merge: git commit"
            exit 1
        else
            # Auto-commit if no conflicts
            git commit -m "feat: Merge Claude Code branch - Restore ClientWorkspace with all features

- Restore ClientWorkspace component in /portal route
- Add Community component for sharing designs and ideas
- Integrate all dashboard features (upload, analytics, messaging, notifications, design ideas, deliverables)
- Update navigation order (Community 4th position)
- Add Community quick action to ClientHub

Co-authored-by: Claude Code <claude@cursor.sh>"
            echo -e "${GREEN}✅ Merged and committed${NC}"
        fi
    else
        echo -e "${RED}⚠️  Merge failed - manual resolution required${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Branch $CURRENT_BRANCH not found - skipping${NC}"
fi
echo ""

# Step 6: Check for other branches to merge
echo -e "${YELLOW}Step 6: Checking for other branches to merge...${NC}"
CURSOR_BRANCHES=$(git branch -r | grep "cursor/" | head -5)
WARP_BRANCHES=$(git branch -r | grep "warp/" | head -5)
CODEX_BRANCHES=$(git branch -r | grep "codex/" | head -5)

if [ -n "$CURSOR_BRANCHES" ]; then
    echo -e "${BLUE}Found Cursor branches:${NC}"
    echo "$CURSOR_BRANCHES"
    echo ""
fi

if [ -n "$WARP_BRANCHES" ]; then
    echo -e "${BLUE}Found Warp branches:${NC}"
    echo "$WARP_BRANCHES"
    echo ""
fi

if [ -n "$CODEX_BRANCHES" ]; then
    echo -e "${BLUE}Found Codex branches:${NC}"
    echo "$CODEX_BRANCHES"
    echo ""
fi

echo -e "${YELLOW}Note:${NC} Review and merge other branches manually if needed"
echo ""

# Step 7: Verify all components are present
echo -e "${YELLOW}Step 7: Verifying all components are present...${NC}"
COMPONENT_FILE="kaa-app/src/components/ClientWorkspace.tsx"

if [ -f "$COMPONENT_FILE" ]; then
    echo -e "${BLUE}Checking ClientWorkspace.tsx for all required components...${NC}"
    
    COMPONENTS=(
        "DocumentUpload"
        "MessagingSystem"
        "NotificationSystem"
        "AnalyticsDashboard"
        "DesignIdeas"
        "Deliverables"
        "Community"
        "ProjectsView"
        "ClientDocuments"
    )
    
    MISSING=()
    for component in "${COMPONENTS[@]}"; do
        if grep -q "$component" "$COMPONENT_FILE"; then
            echo -e "${GREEN}✅ $component${NC}"
        else
            echo -e "${RED}❌ $component MISSING${NC}"
            MISSING+=("$component")
        fi
    done
    
    if [ ${#MISSING[@]} -eq 0 ]; then
        echo -e "${GREEN}✅ All components present${NC}"
    else
        echo -e "${RED}⚠️  Missing components: ${MISSING[*]}${NC}"
    fi
else
    echo -e "${RED}⚠️  ClientWorkspace.tsx not found${NC}"
fi
echo ""

# Step 8: Run type check
echo -e "${YELLOW}Step 8: Running TypeScript type check...${NC}"
if npm run typecheck 2>&1 | tee /tmp/typecheck.log; then
    echo -e "${GREEN}✅ Type check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Type check found errors (see /tmp/typecheck.log)${NC}"
    echo -e "${YELLOW}Review errors before proceeding${NC}"
fi
echo ""

# Step 9: Run lint check
echo -e "${YELLOW}Step 9: Running lint check...${NC}"
if npm run lint 2>&1 | tee /tmp/lint.log; then
    echo -e "${GREEN}✅ Lint check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Lint check found errors (see /tmp/lint.log)${NC}"
    echo -e "${YELLOW}Review errors before proceeding${NC}"
fi
echo ""

# Step 10: Summary
echo ""
echo "=========================================="
echo -e "${GREEN}✅ Consolidation Complete!${NC}"
echo "=========================================="
echo ""
echo -e "${BLUE}Consolidation Branch:${NC} $CONSOLIDATION_BRANCH"
echo -e "${BLUE}Base Branch:${NC} $BASE_BRANCH"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Review consolidated changes: git diff $BASE_BRANCH..$CONSOLIDATION_BRANCH"
echo "2. Test the application: npm run dev"
echo "3. Verify all components render correctly"
echo "4. Create PR: gh pr create --title 'feat: Consolidate ClientWorkspace with all dashboard features' --body 'Merges ClientWorkspace implementation from Claude Code branch'"
echo "5. After PR approval, merge to $BASE_BRANCH"
echo ""
echo -e "${YELLOW}To push this branch:${NC}"
echo "  git push origin $CONSOLIDATION_BRANCH"
echo ""
