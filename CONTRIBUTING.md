# Contributing to SAGE Platform

This document outlines the contribution guidelines for the SAGE MVP platform.

## Branch Strategy

- `main` - Production branch (protected)
- `staging` - Staging environment (mirrors prod with test data)
- `feat/<short-name>` - Feature branches for new functionality

## Branch Protection Rules

The `main` branch has the following protections:
- ✅ Require PR review (at least 1 approval)
- ✅ Require CI checks to pass (typecheck, lint, tests)
- ❌ Disallow force push
- ❌ Disallow deletion

## Pull Request Process

1. Create a feature branch from `main` or `staging`
2. Make your changes with clear, atomic commits
3. Push to your feature branch
4. Create a Pull Request targeting `main` or `staging`
5. Ensure all checks pass
6. Get at least one approval
7. Merge (squash and merge preferred for clean history)

## Definition of Done Checklist

Every PR must satisfy all of the following:

- [ ] Typecheck passes (`npm run typecheck` or `tsc --noEmit`)
- [ ] Lint passes (`npm run lint`)
- [ ] Unit tests pass (`npm test`)
- [ ] E2E smoke test passes (if applicable)
- [ ] No secrets committed (check `.env` files, API keys)
- [ ] Happy-path flows tested locally
- [ ] Error handling tested
- [ ] Code follows SAGE coding standards (see `.cursorrules`)

## Commit Message Guidelines

Use clear, descriptive commit messages:

**Good:**
```
feat: Add tier routing logic for SAGE intake form
fix: Resolve Supabase connection timeout issue
docs: Update hybrid data architecture documentation
```

**Bad:**
```
updates
fix stuff
WIP
```

## Code Standards

- TypeScript everywhere
- No `any` types unless justified with comment
- Prefer server-side validation + client-side UX validation
- Always add tests for new logic
- Follow existing code style and patterns

## Security Guidelines

- Never log secrets or API keys
- Validate all webhooks (Stripe, Zapier, etc.)
- Use least-privileged database access
- Sanitize all user inputs
- Use environment variables for sensitive data

## Product Guardrails

- Implement tier gating exactly as specified
- Don't ship "nice-to-have" features before MVP cutline
- Maintain backward compatibility with existing KAA App features
- Test both KAA and SAGE flows when making changes

## Getting Help

- Check existing documentation in `/docs`
- Review similar implementations in the codebase
- Ask questions in PR comments or team chat
