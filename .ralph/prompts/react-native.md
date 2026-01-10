# React Native Task

## Zone
React Native Mobile (cross-platform iOS/Android)

## Stack
- React Native + TypeScript
- Expo or bare workflow
- React Navigation
- State: Redux/Zustand/Context

## Task
{{TASK}}

## Requirements
{{REQUIREMENTS}}

## Mobile Constraints
- Test on both iOS and Android
- Handle platform-specific code (Platform.OS)
- Ensure responsive layouts
- Handle keyboard avoiding views
- Test offline behavior

## Verification
1. Run Metro: `npx react-native start`
2. Run iOS: `npx react-native run-ios`
3. Run Android: `npx react-native run-android`
4. Run tests: `npm test`
5. Run E2E: `npm run e2e` or `maestro test`

## Success Criteria
- [ ] Works on iOS simulator
- [ ] Works on Android emulator
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] No TypeScript errors

When ALL criteria met, output: RALPH_COMPLETE
