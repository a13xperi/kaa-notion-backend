# Android Native Development Task

## Zone
Android Native (Kotlin/Jetpack Compose)

## Stack
- Kotlin 1.9+
- Jetpack Compose
- Hilt (Dependency Injection)
- Room (Database)
- Coroutines / Flow
- JUnit / Espresso

## Task
{{TASK}}

## Requirements
{{REQUIREMENTS}}

## Android Development Workflow

```
┌─────────────────────────────────────┐
│  1. Implement feature in Kotlin     │
│  2. Run tests: ./gradlew test       │
│  3. Fix any compiler errors         │
│  4. Test on emulator                │
│  5. Commit working code             │
└─────────────────────────────────────┘
```

## Commands
- Build: `./gradlew assembleDebug`
- Test: `./gradlew test`
- Instrumented: `./gradlew connectedAndroidTest`
- Lint: `./gradlew lint`
- Run: `./gradlew installDebug && adb shell am start -n com.app/.MainActivity`

## Jetpack Compose Best Practices
- Use `remember` for local state
- Use `rememberSaveable` for surviving config changes
- Use `collectAsStateWithLifecycle` for Flow collection
- Use `LaunchedEffect` for side effects
- Preview with `@Preview` annotation

## Architecture
- MVVM with Compose
- Repository pattern for data
- Use cases for business logic
- Hilt modules for DI

## Testing Requirements
- Unit tests for ViewModels
- Integration tests for repositories
- UI tests with Compose testing
- Screenshot tests (optional)

## Success Criteria
- [ ] Feature implemented correctly
- [ ] All tests pass: ./gradlew test
- [ ] No lint warnings: ./gradlew lint
- [ ] App runs on emulator without crashes
- [ ] Code follows Kotlin style guide

When ALL criteria met, output: RALPH_COMPLETE
