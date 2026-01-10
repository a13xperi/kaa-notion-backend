# iOS Native Development Task

## Zone
iOS Native (Swift/SwiftUI)

## Stack
- Swift 5.9+
- SwiftUI / UIKit
- XCTest / XCUITest
- Combine / async-await
- Core Data / SwiftData

## Task
{{TASK}}

## Requirements
{{REQUIREMENTS}}

## iOS Development Workflow

```
┌─────────────────────────────────────┐
│  1. Implement feature in Swift      │
│  2. Run tests: xcodebuild test      │
│  3. Fix any compiler errors         │
│  4. Test on simulator               │
│  5. Commit working code             │
└─────────────────────────────────────┘
```

## Commands
- Build: `xcodebuild -scheme App -sdk iphonesimulator build`
- Test: `xcodebuild test -scheme App -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 15'`
- Run: `xcrun simctl boot 'iPhone 15' && xcodebuild -scheme App -sdk iphonesimulator`

## SwiftUI Best Practices
- Use `@State` for local view state
- Use `@Binding` for parent-child communication
- Use `@StateObject` for ObservableObject ownership
- Use `@EnvironmentObject` for dependency injection
- Preview with `#Preview` macro

## Testing Requirements
- Unit tests for ViewModels
- Integration tests for services
- UI tests for critical flows
- Accessibility tests with VoiceOver

## Success Criteria
- [ ] Feature implemented correctly
- [ ] All tests pass: xcodebuild test
- [ ] No compiler warnings
- [ ] App runs on simulator without crashes
- [ ] Code follows Swift style guide

When ALL criteria met, output: RALPH_COMPLETE
