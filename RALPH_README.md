# RALPH - Production-Grade Autonomous Loop

Run Claude Code autonomously with circuit breakers, error detection, and safety mechanisms.

```
  ╦═╗╔═╗╦  ╔═╗╦ ╦
  ╠╦╝╠═╣║  ╠═╝╠═╣
  ╩╚═╩ ╩╩═╝╩  ╩ ╩
```

**Stack:** Warp + Cursor + Claude Code + Codex

---

## Safety Features

| Feature | Description |
|---------|-------------|
| **Circuit Breaker** | Stops loop when stuck (no progress, same error, test-only) |
| **Two-Stage Error Detection** | Filters false positives from JSON fields |
| **Progress Monitoring** | Tracks file changes to detect stalls |
| **Checkpointing** | Saves state every iteration for recovery |
| **Max Iterations** | Hard limit prevents runaway costs |
| **Manual Stop** | `./ralph stop` or create `.ralph-stop` file |

---

## Quick Start

```bash
# 1. Create task
./ralph new                  # Interactive wizard
# OR
./ralph zone frontend        # Quick zone prompt

# 2. Customize (optional)
./ralph edit                 # Opens in Cursor

# 3. Run
./ralph start 30             # 30 iterations max

# 4. Monitor
./ralph watch                # Live activity feed
```

---

## Platform Zones

### Web/Backend

| Zone | Path | Stack |
|------|------|-------|
| `frontend` | kaa-app/src | React, TypeScript, Tailwind |
| `backend` | server/ | Express, Prisma, Node.js |
| `database` | prisma/ | PostgreSQL, Supabase |
| `fullstack` | ./ | End-to-end features |

### Mobile

| Zone | Path | Stack |
|------|------|-------|
| `react-native` | mobile/ | React Native, Expo, TypeScript |
| `flutter` | flutter_app/ | Flutter, Dart, Riverpod |
| `ios` | ios/ | Swift, SwiftUI, XCTest |
| `android` | android/ | Kotlin, Jetpack Compose |

### Testing

| Zone | Path | Stack |
|------|------|-------|
| `tests` | tests/ | Jest, Vitest |
| `e2e` | e2e/ | Playwright, Detox, Maestro |

---

## Commands

```
TASK CREATION
  ./ralph new              Interactive wizard (all zones)
  ./ralph zone <zone>      Quick zone prompt
  ./ralph edit             Edit PROMPT.md in Cursor

EXECUTION
  ./ralph start [N]        Start with N iterations (default: 30)
  ./ralph stop             Stop gracefully
  ./ralph preflight        Run pre-flight checks only

E2E TESTING
  ./ralph e2e [target] [N] Start E2E continuous test loop
                           Targets: all|web|playwright|mobile|detox|maestro
  ./ralph test [zone]      Run tests for a specific zone

MOBILE
  ./ralph devices          Show simulators/emulators/devices
  ./ralph mobile-check     Mobile environment pre-flight

MONITORING
  ./ralph status           Current state + circuit breaker info
  ./ralph health           Health check with budget status
  ./ralph watch            Live activity feed
  ./ralph logs [N]         Last N log entries
  ./ralph dashboard        Auto-refresh status

RECOVERY
  ./ralph rollback         Revert to git checkpoint
  ./ralph reset            Clear state
```

---

## Circuit Breaker

The circuit breaker prevents infinite loops and wasted API costs.

### Thresholds (configurable in `.ralph.json`)

| Threshold | Default | Triggers When |
|-----------|---------|---------------|
| `noProgressThreshold` | 4 | No file changes for N iterations |
| `sameErrorThreshold` | 5 | Same error repeated N times |
| `testOnlyThreshold` | 5 | Only running tests, no code changes |
| `consecutiveFailures` | 3 | Response quality declining |

### When Circuit Breaker Trips

Ralph stops and provides detailed guidance:
- What triggered the breaker
- Suggested recovery actions
- Option to output `RALPH_COMPLETE` if truly done

### Configure Thresholds

```json
{
  "circuitBreaker": {
    "noProgressThreshold": 4,
    "sameErrorThreshold": 5,
    "testOnlyThreshold": 5,
    "consecutiveFailures": 3
  }
}
```

---

## Comprehensive Testing Loop

The comprehensive testing loop runs **all tests** across **all critical paths** and **edge cases** in a continuous improvement cycle.

### Quick Start

```bash
# Run ALL comprehensive tests
./ralph comprehensive 50

# Target specific areas
./ralph comprehensive 30 auth      # Authentication only
./ralph comprehensive 30 pay       # Payments only
./ralph comprehensive 30 onboard   # Onboarding only
./ralph comprehensive 30 msg       # Messaging only

# View test coverage matrix
./ralph test-matrix
```

### Test Phases

```
┌─────────────────────────────────────────────────────────────────┐
│  Phase 1: Unit Tests (100% pass required)                       │
│  Phase 2: Integration Tests (100% pass required)                │
│  Phase 3: E2E Critical Paths (100% pass required)               │
│  Phase 4: E2E Full Suite (95%+ pass required)                   │
│  Phase 5: Edge Cases (100% pass required)                       │
│  Phase 6: Accessibility (100% pass required)                    │
│  Phase 7: Performance (thresholds required)                     │
│  Phase 8: Final Verification (3 consecutive passes)             │
└─────────────────────────────────────────────────────────────────┘
```

### Test Coverage Areas

| Area | What's Tested |
|------|---------------|
| **Authentication** | Login, OAuth, MFA, password reset, sessions, rate limiting |
| **Payments** | Credit cards, 3DS, subscriptions, refunds, coupons |
| **Onboarding** | Registration, verification, wizard, invites, data import |
| **Messaging** | Real-time chat, notifications, file sharing, offline mode |
| **Core Features** | Dashboard, CRUD, search, export, settings |
| **Accessibility** | Keyboard nav, screen readers, color contrast |
| **Performance** | Load times, API response, memory usage |
| **Security** | XSS, CSRF, SQL injection, authorization |

### Edge Cases Covered

The test matrix includes comprehensive edge cases:

- **Input**: Empty, max length, special chars, XSS/SQL injection
- **State**: First-time user, session timeout, concurrent edits
- **Network**: Offline, slow connection, timeout, reconnection
- **Device**: Mobile, tablet, desktop, screen readers
- **Data**: Empty list, large datasets, pagination

---

## E2E Testing Loop

For quick E2E testing without the full comprehensive suite:

```bash
# Web E2E (Playwright)
./ralph e2e web 20

# Mobile E2E (Detox for React Native)
./ralph e2e detox 20

# Mobile E2E (Maestro)
./ralph e2e maestro 20

# All E2E tests
./ralph e2e all 30
```

### E2E Frameworks

| Framework | Target | Command |
|-----------|--------|---------|
| Playwright | Web | `npx playwright test` |
| Detox | React Native | `detox test -c ios.sim.debug` |
| Maestro | Any Mobile | `maestro test .maestro/` |
| Appium | Cross-platform | `npx appium` |

### Success Criteria

The E2E loop considers tests "passing" when:
1. All tests pass
2. Tests pass 3 consecutive times (no flakiness)
3. No regressions introduced

---

## Mobile Development

### Check Your Environment

```bash
# See all simulators/emulators/devices
./ralph devices

# Run mobile pre-flight checks
./ralph mobile-check
```

### Mobile Zones

```bash
# React Native
./ralph zone react-native "Add login screen"
./ralph start 30

# Flutter
./ralph zone flutter "Fix navigation bug"
./ralph start 20

# Native iOS
./ralph zone ios "Implement SwiftUI dashboard"
./ralph start 25

# Native Android
./ralph zone android "Add Jetpack Compose settings"
./ralph start 25
```

### Running Mobile Tests

```bash
# Run React Native tests
./ralph test react-native

# Run Flutter tests
./ralph test flutter

# Run Detox E2E
./ralph test detox

# Run Maestro flows
./ralph test maestro
```

### Device Management

The `./ralph devices` command shows:
- Running iOS simulators
- Running Android emulators
- Connected physical devices
- Quick commands to boot simulators/emulators

Example output:
```
iOS Simulators
  ✓ Booted simulators: 1
      iPhone 15 Pro (XXXXXXXX-XXXX-...) (Booted)

Android Emulators
  ○ No emulators running

  Available AVDs:
      Pixel_7
      Pixel_8

QUICK COMMANDS
  iOS
    Boot:   xcrun simctl boot 'iPhone 15'
    List:   xcrun simctl list devices

  Android
    Boot:   emulator -avd Pixel_7
    List:   emulator -list-avds
```

---

## Best Practices

### 1. Clear Completion Criteria
```markdown
## Success Criteria
- [ ] All CRUD endpoints working
- [ ] Tests pass (npm test)
- [ ] No TypeScript errors
- [ ] Build succeeds (npm run build)

When ALL criteria met, output: RALPH_COMPLETE
```

### 2. Incremental Phases
```markdown
## Phases
1. Database schema (then test)
2. API endpoints (then test)
3. Frontend components (then test)

Complete each phase before moving on.
```

### 3. Self-Correction Instructions
```markdown
## Workflow
1. Make a change
2. Run tests: npm test
3. If tests fail, fix before continuing
4. Commit working code
5. Move to next item
```

### 4. Escape Hatches
```markdown
## If Stuck
After 3 failed attempts at the same issue:
1. Document the blocker
2. Try a different approach
3. If blocked externally, output RALPH_COMPLETE with notes
```

---

## Warp + Cursor Workflow

**Terminal 1 (Warp) - Run:**
```bash
./ralph new
./ralph start 30
```

**Terminal 2 (Warp) - Monitor:**
```bash
./ralph watch
```

**Cursor:**
- Watch files update in real-time
- Use diff view to review changes
- AI chat for quick questions

---

## Configuration

Edit `.ralph.json`:

```json
{
  "maxIterations": 30,
  "completionPromise": "RALPH_COMPLETE",

  "circuitBreaker": {
    "noProgressThreshold": 4,
    "sameErrorThreshold": 5,
    "testOnlyThreshold": 5,
    "consecutiveFailures": 3
  },

  "safety": {
    "createCheckpoints": true,
    "maxCheckpoints": 10
  }
}
```

### Environment Variables

Override thresholds without editing config:

```bash
export RALPH_CB_NO_PROGRESS=6      # More lenient
export RALPH_CB_SAME_ERROR=3       # Stricter
export RALPH_DEBUG=1               # Enable debug logging
```

---

## Files

```
project/
├── ralph                    # CLI
├── PROMPT.md               # Current task
├── .ralph.json             # Configuration
├── .ralph-output.log       # Activity log
├── .ralph-stop             # Create to stop loop
└── .ralph/
    ├── platform.json       # Platform config
    ├── agents/             # Agent configs
    └── prompts/            # Zone templates

~/.ralph/
├── state.json              # Current state
├── ralph.log               # Full log history
└── checkpoints/            # State checkpoints
```

---

## Cost Estimates

| Iterations | Est. Cost | Use Case |
|------------|-----------|----------|
| 10 | $5-15 | Quick fix |
| 30 | $15-50 | Feature |
| 50 | $25-100 | Large feature |
| 100+ | $50-200+ | Major work |

**Tip:** Start with 10-20 iterations to calibrate, then increase.

---

## Troubleshooting

### Loop exits immediately
```bash
./ralph reset
./ralph start
```

### Circuit breaker trips
```bash
./ralph status              # See which threshold
./ralph logs 20             # Check recent activity
./ralph edit                # Adjust prompt
./ralph reset
./ralph start
```

### Check what's happening
```bash
./ralph status              # State + circuit breaker
./ralph watch               # Live feed
tail -f ~/.ralph/ralph.log  # Full logs
```

### Force stop
```bash
./ralph stop                # Graceful
# OR
touch .ralph-stop           # Creates stop signal
# OR
Ctrl+C                      # Immediate
```

---

## Example Session

```bash
# Morning: Start big feature
./ralph new
# Zone: fullstack
# Task: "Add user authentication with JWT"
./ralph start 40

# Go to meetings...

# Check progress
./ralph status
# Shows: Iteration 15/40, circuit breaker: closed

# Evening: Review
git diff
npm test
git add . && git commit -m "feat: Add JWT auth"
```

---

## Quick Reference

```bash
# Task Creation
./ralph new                 # Interactive wizard (all zones)
./ralph zone frontend       # Quick web zone
./ralph zone react-native   # Quick mobile zone
./ralph edit                # Edit prompt

# Execution
./ralph start 30            # Run loop
./ralph stop                # Stop gracefully
./ralph preflight           # Check environment

# Comprehensive Testing
./ralph comprehensive 50    # All test areas
./ralph comprehensive 30 auth # Auth tests
./ralph comprehensive 30 pay  # Payment tests
./ralph test-matrix         # View test coverage

# E2E Testing
./ralph e2e web 20          # Web E2E loop (Playwright)
./ralph e2e detox 20        # Mobile E2E loop (Detox)
./ralph e2e maestro 20      # Mobile E2E loop (Maestro)
./ralph test all            # Run all tests once

# Mobile
./ralph devices             # Show simulators/emulators
./ralph mobile-check        # Mobile pre-flight

# Monitoring
./ralph status              # State + safety info
./ralph health              # Health check
./ralph watch               # Live feed

# Recovery
./ralph rollback            # Revert to checkpoint
./ralph reset               # Clear all
```

---

## Sources

Based on best practices from:
- [Ralph Wiggum - Awesome Claude](https://awesomeclaude.ai/ralph-wiggum)
- [frankbria/ralph-claude-code](https://github.com/frankbria/ralph-claude-code)
- [AI Agent Safety: Circuit Breakers](https://www.syntaxia.com/post/ai-agent-safety-circuit-breakers-for-autonomous-systems)
- [Claude Code Hooks Documentation](https://code.claude.com/docs/en/hooks)

---

*"Me fail English? That's unpossible!"*
*Also Ralph: Ships production code with circuit breakers.*
