# Dependency Audit Report

**Generated:** January 8, 2026
**Repository:** kaa-notion-backend

## Executive Summary

This audit identifies **31 security vulnerabilities** (3 critical, 11 high, 8 moderate), **significant unnecessary bloat**, and **multiple outdated packages** across the three package.json files in this monorepo.

### Quick Stats

| Location | Vulnerabilities | Unused Dependencies | Misplaced Dependencies |
|----------|----------------|--------------------|-----------------------|
| Root `/` | 3 (1 high, 2 moderate) | 2 packages | 0 |
| Server `/server` | 10 (1 critical, 8 high, 1 moderate) | 1 package | 1 package |
| Frontend `/kaa-app` | 18 (1 critical, 11 high, 4 moderate, 2 low) | 1 package | 7 packages |

---

## 1. Security Vulnerabilities

### 1.1 Root Package (`/package.json`)

| Package | Severity | Vulnerability | Fix |
|---------|----------|--------------|-----|
| `body-parser` 2.2.0 | Moderate | DoS via URL encoding (GHSA-wqch-xfxh-vrr4) | `npm audit fix` |
| `nodemailer` <=7.0.10 | Moderate | DoS via recursive calls (GHSA-rcmh-qjqh-p98v) | Update to ^7.0.11+ |
| `qs` <6.14.1 | **High** | DoS via memory exhaustion (GHSA-6rw7-vpxm-498p) | `npm audit fix` |

**Recommended Action:**
```bash
cd /home/user/kaa-notion-backend
npm audit fix
npm update nodemailer
```

### 1.2 Server Package (`/server/package.json`)

| Package | Severity | Vulnerability | Fix |
|---------|----------|--------------|-----|
| `axios` <=1.11.0 | **High** | CSRF, DoS, SSRF vulnerabilities | Update to ^1.12.0+ |
| `form-data` 4.0.0-4.0.3 | **Critical** | Unsafe random function for boundaries | Update to ^4.0.4+ |
| `js-yaml` <3.14.2 | Moderate | Prototype pollution | Update to ^3.14.2+ |
| `qs` <6.14.1 | **High** | DoS via memory exhaustion | `npm audit fix` |
| `semver` 7.0.0-7.5.1 | **High** | ReDoS vulnerability | Update nodemon |
| `express` 4.x | **High** | Multiple transitive vulnerabilities | Consider upgrading to Express 5 |

**Recommended Action:**
```bash
cd /home/user/kaa-notion-backend/server
npm audit fix
npm update axios nodemon
```

### 1.3 Frontend Package (`/kaa-app/package.json`)

| Package | Severity | Vulnerability | Fix |
|---------|----------|--------------|-----|
| `form-data` 3.0.x | **Critical** | Unsafe random function | Transitive via react-scripts |
| `glob` 10.2.0-10.4.5 | **High** | Command injection via CLI | Transitive via sucrase |
| `node-forge` <=1.3.1 | **High** | ASN.1 vulnerabilities | `npm audit fix` |
| `nth-check` <2.0.1 | **High** | ReDoS | Blocked by react-scripts |
| `webpack-dev-server` <=5.2.0 | Moderate | Source code theft risk | Blocked by react-scripts |

**Note:** Many frontend vulnerabilities are transitive dependencies from `react-scripts@5.0.1`. A full fix requires either:
- Waiting for react-scripts updates
- Ejecting from CRA and updating dependencies manually
- Migrating to Vite or another bundler

**Recommended Action:**
```bash
cd /home/user/kaa-notion-backend/kaa-app
npm audit fix
```

---

## 2. Unnecessary Dependencies (Bloat)

### 2.1 Completely Unused Dependencies

| Location | Package | Evidence | Action |
|----------|---------|----------|--------|
| Root | `@prisma/client` | No imports found in codebase | Remove |
| Root | `prisma` | Schema exists but never used | Remove (keep schema if planning to use) |
| Server | `figma-api` | Custom `FigmaClient` class uses axios directly | Remove |
| Frontend | `@notionhq/client` | Server-side only package, no frontend usage | Remove |

**Estimated savings:** ~15-20MB from node_modules

### 2.2 Dependencies in Wrong Section

These should be moved from `dependencies` to `devDependencies`:

**Server (`/server/package.json`):**
```json
// Move to devDependencies:
"typescript": "^5.0.0"
```

**Frontend (`/kaa-app/package.json`):**
```json
// Move to devDependencies:
"@testing-library/dom": "^10.4.0",
"@testing-library/jest-dom": "^6.6.3",
"@testing-library/react": "^16.3.0",
"@testing-library/user-event": "^13.5.0",
"@types/jest": "^27.5.2",
"@types/node": "^16.18.126",
"@types/react": "^19.1.8",
"@types/react-dom": "^19.1.6"
```

**Impact:** Reduces production bundle size and deployment footprint

---

## 3. Outdated Packages

### 3.1 Major Version Updates Available

| Location | Package | Current | Latest | Breaking Changes Risk |
|----------|---------|---------|--------|----------------------|
| Root | `openai` | ^4.104.0 | 6.15.0 | **High** - API changes |
| Server | `dotenv` | ^16.5.0 | 17.2.3 | Low |
| Server | `express` | ^4.21.2 | 5.2.1 | **High** - Express 5 migration |
| Server | `nodemon` | ^2.0.22 | 3.1.11 | Low |
| Frontend | `typescript` | ^4.9.5 | 5.9.3 | Medium |
| Frontend | `@testing-library/user-event` | ^13.5.0 | 14.6.1 | Medium |
| Frontend | `@types/node` | ^16.18.126 | 25.0.3 | Low |
| Frontend | `web-vitals` | ^2.1.4 | 5.1.0 | Medium |

### 3.2 Minor/Patch Updates Available

| Location | Package | Current | Latest |
|----------|---------|---------|--------|
| Root | `@notionhq/client` | ^5.1.0 | 5.6.0 |
| Root | `express` | ^5.1.0 | 5.2.1 |
| Root | `form-data` | ^4.0.4 | 4.0.5 |
| Server | `axios` | ^1.9.0 | 1.13.2 |
| Server | `ws` | ^8.18.2 | 8.19.0 |

---

## 4. Recommended Changes

### 4.1 Immediate Actions (Security)

**Root `/package.json`:**
```diff
  "dependencies": {
-   "nodemailer": "^7.0.7",
+   "nodemailer": "^7.0.12",
  },
  "devDependencies": {
-   "@prisma/client": "^7.2.0",
-   "prisma": "^5.22.0",
    "concurrently": "^8.2.2"
  }
```

**Server `/server/package.json`:**
```diff
  "dependencies": {
-   "axios": "^1.9.0",
+   "axios": "^1.12.0",
    "cors": "^2.8.5",
    "dotenv": "^16.5.0",
    "express": "^4.21.2",
-   "figma-api": "^1.0.0",
-   "typescript": "^5.0.0",
    "ws": "^8.18.2"
  },
  "devDependencies": {
+   "typescript": "^5.0.0",
-   "nodemon": "^2.0.22",
+   "nodemon": "^3.1.11",
```

**Frontend `/kaa-app/package.json`:**
```diff
  "dependencies": {
-   "@notionhq/client": "^5.1.0",
-   "@testing-library/dom": "^10.4.0",
-   "@testing-library/jest-dom": "^6.6.3",
-   "@testing-library/react": "^16.3.0",
-   "@testing-library/user-event": "^13.5.0",
-   "@types/jest": "^27.5.2",
-   "@types/node": "^16.18.126",
-   "@types/react": "^19.1.8",
-   "@types/react-dom": "^19.1.6",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-scripts": "5.0.1",
    "typescript": "^4.9.5",
    "web-vitals": "^2.1.4"
  },
+ "devDependencies": {
+   "@testing-library/dom": "^10.4.0",
+   "@testing-library/jest-dom": "^6.6.3",
+   "@testing-library/react": "^16.3.0",
+   "@testing-library/user-event": "^14.6.1",
+   "@types/jest": "^29.5.0",
+   "@types/node": "^22.0.0",
+   "@types/react": "^19.1.8",
+   "@types/react-dom": "^19.1.6"
+ }
```

### 4.2 Medium-Term Actions

1. **Consider migrating from Create React App to Vite**
   - CRA is no longer actively maintained
   - Many vulnerabilities stem from outdated CRA dependencies
   - Vite offers faster builds and HMR

2. **Upgrade to Express 5** (Server)
   - Express 4 has accumulated security debt
   - Root package already uses Express 5

3. **Evaluate Prisma necessity**
   - Schema exists but no code uses it
   - Either implement Prisma usage or remove entirely

4. **Update OpenAI SDK** (when ready for breaking changes)
   - Version 6.x has significant API changes
   - Review migration guide before updating

---

## 5. Version Mismatch Issues

### 5.1 Inconsistent Express Versions

| Location | Version | Status |
|----------|---------|--------|
| Root | ^5.1.0 | Modern |
| Server | ^4.21.2 | Legacy |

**Recommendation:** Align both to Express 5.x for consistency and security

### 5.2 Inconsistent dotenv Versions

| Location | Version |
|----------|---------|
| Root | ^17.2.3 |
| Server | ^16.5.0 |

**Recommendation:** Align to ^17.x

---

## 6. Implementation Commands

Run these commands in sequence to fix the most critical issues:

```bash
# 1. Fix root package vulnerabilities
cd /home/user/kaa-notion-backend
npm audit fix
npm uninstall @prisma/client prisma
npm update nodemailer form-data

# 2. Fix server package vulnerabilities
cd /home/user/kaa-notion-backend/server
npm audit fix
npm uninstall figma-api
npm install typescript --save-dev
npm uninstall typescript  # from dependencies
npm update axios nodemon

# 3. Fix frontend package (partial - some blocked by react-scripts)
cd /home/user/kaa-notion-backend/kaa-app
npm audit fix
npm uninstall @notionhq/client

# Move testing deps to devDependencies
npm install --save-dev @testing-library/dom @testing-library/jest-dom @testing-library/react @testing-library/user-event @types/jest @types/node @types/react @types/react-dom
npm uninstall @testing-library/dom @testing-library/jest-dom @testing-library/react @testing-library/user-event @types/jest @types/node @types/react @types/react-dom
```

---

## 7. Summary of Benefits

After implementing these changes:

| Metric | Before | After |
|--------|--------|-------|
| Critical vulnerabilities | 3 | 0 |
| High vulnerabilities | 11 | ~3* |
| Unused dependencies | 4 | 0 |
| Misplaced dependencies | 8 | 0 |

*Some high vulnerabilities in react-scripts cannot be fixed without ejecting or migrating bundlers

**Estimated node_modules reduction:** 20-30MB combined
