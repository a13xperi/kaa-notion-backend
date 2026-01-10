# SAGE MVP Platform - Component Library

A comprehensive guide to all React components available in the platform.

## Table of Contents

- [Common Components](#common-components)
- [Auth Components](#auth-components)
- [Layout Components](#layout-components)
- [Intake Components](#intake-components)
- [Portal Components](#portal-components)
- [Admin Components](#admin-components)
- [Checkout Components](#checkout-components)
- [Context Providers](#context-providers)

---

## Common Components

### NotFoundPage

404 error page with navigation options.

```tsx
import { NotFoundPage } from './components/common';

<NotFoundPage
  title="Page Not Found"
  message="Custom error message"
  showHomeLink={true}
  showBackLink={true}
/>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| title | string | "Page Not Found" | Error title |
| message | string | "Sorry, we couldn't..." | Error description |
| showHomeLink | boolean | true | Show "Return Home" link |
| showBackLink | boolean | true | Show "Go Back" button |

---

### Toast Notifications

Toast notification system with provider and hook.

```tsx
import { ToastProvider, useToast } from './components/common';

// Wrap your app
<ToastProvider position="top-right" maxToasts={5}>
  <App />
</ToastProvider>

// Use in any component
function MyComponent() {
  const { success, error, warning, info } = useToast();

  return (
    <button onClick={() => success('Operation completed!')}>
      Save
    </button>
  );
}
```

**Provider Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| position | string | "top-right" | Toast position |
| maxToasts | number | 5 | Maximum visible toasts |

**Hook Methods:**
| Method | Arguments | Description |
|--------|-----------|-------------|
| success | (message, title?) | Show success toast |
| error | (message, title?) | Show error toast (8s duration) |
| warning | (message, title?) | Show warning toast |
| info | (message, title?) | Show info toast |
| addToast | (toast) | Add custom toast |
| removeToast | (id) | Remove toast by ID |

---

### Skeleton Loading

Placeholder components for loading states.

```tsx
import {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  SkeletonStats,
} from './components/common';

// Basic skeleton
<Skeleton width={200} height={20} borderRadius={4} />

// Text placeholder
<SkeletonText lines={3} />

// Avatar placeholder
<SkeletonAvatar size="md" /> // sm, md, lg, xl

// Card placeholder
<SkeletonCard hasImage={true} imageHeight={200} />

// Table placeholder
<SkeletonTable rows={5} columns={4} />

// List placeholder
<SkeletonList items={3} hasAvatar={true} />

// Stats cards placeholder
<SkeletonStats count={4} />
```

---

## Auth Components

### LoginForm

User login form with validation.

```tsx
import { LoginForm } from './components/auth';

<LoginForm
  onSuccess={() => navigate('/portal')}
  onRegisterClick={() => navigate('/register')}
/>
```

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| onSuccess | () => void | Called after successful login |
| onRegisterClick | () => void | Called when "Get started" clicked |

---

### RegisterForm

User registration with password strength indicator.

```tsx
import { RegisterForm } from './components/auth';

<RegisterForm
  defaultTier={2}
  onSuccess={() => navigate('/portal')}
  onLoginClick={() => navigate('/login')}
/>
```

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| defaultTier | number | Pre-selected tier |
| onSuccess | () => void | Called after successful registration |
| onLoginClick | () => void | Called when "Sign in" clicked |

---

## Layout Components

### AppLayout

Main application layout with header, navigation, and footer.

```tsx
import { AppLayout } from './components/layout';

<AppLayout>
  <YourPageContent />
</AppLayout>
```

Features:
- Sticky header with navigation
- User menu when authenticated
- Admin link for admin users
- Responsive footer with links

---

## Intake Components

### IntakeForm

Multi-step intake form for lead capture.

```tsx
import { IntakeForm } from './components/intake';

<IntakeForm
  onSubmit={(data, recommendation) => {
    console.log('Form data:', data);
    console.log('Tier recommendation:', recommendation);
  }}
/>
```

---

### TierRecommendation

Display recommended tier after intake.

```tsx
import { TierRecommendation } from './components/intake';

<TierRecommendation
  recommendation={tierRecommendation}
  intakeData={formData}
  onSelectTier={(tier) => handleTierSelect(tier)}
  onViewComparison={() => showComparison()}
/>
```

---

### TierCard

Individual tier display card.

```tsx
import { TierCard } from './components/intake';

<TierCard
  tier={2}
  isRecommended={true}
  isSelected={false}
  onSelect={(tier) => handleSelect(tier)}
  compact={false}
/>
```

---

### TierComparison

Side-by-side tier comparison.

```tsx
import { TierComparison } from './components/intake';

<TierComparison
  selectedTier={2}
  onSelectTier={(tier) => handleSelect(tier)}
/>
```

---

## Portal Components

### DashboardWelcome

Client portal welcome section.

```tsx
import { DashboardWelcome } from './components/dashboard';

<DashboardWelcome
  projectCount={3}
  pendingDeliverables={2}
  nextMilestone={{ name: 'Design Review', date: 'Jan 15, 2024' }}
/>
```

---

### UserProfile

User account profile display.

```tsx
import { UserProfile } from './components/profile';

<UserProfile onClose={() => setShowProfile(false)} />
```

---

## Admin Components

### AdminDashboard

Admin overview with statistics.

```tsx
import { AdminDashboard } from './components/admin';

<AdminDashboard />
```

---

### LeadQueue

Lead management table.

```tsx
import { LeadQueue } from './components/admin';

<LeadQueue
  onLeadSelect={(lead) => showLeadDetail(lead)}
  onStatusChange={(id, status) => updateStatus(id, status)}
/>
```

---

## Checkout Components

### CheckoutSuccess

Payment success confirmation page.

```tsx
import { CheckoutSuccess } from './components/checkout';

// Reads session_id from URL params
<CheckoutSuccess />
```

---

### CheckoutCancel

Payment cancelled page.

```tsx
import { CheckoutCancel } from './components/checkout';

<CheckoutCancel />
```

---

## Pricing Components

### PricingPage

Service tier pricing display with checkout.

```tsx
import { PricingPage } from './components/pricing';

<PricingPage
  leadId="lead-123"
  userEmail="user@example.com"
  recommendedTier={2}
/>
```

---

## Context Providers

### AuthProvider

Authentication context provider.

```tsx
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Wrap your app
<AuthProvider>
  <App />
</AuthProvider>

// Use in components
function MyComponent() {
  const {
    user,
    profile,
    isAuthenticated,
    isAdmin,
    isLoading,
    error,
    login,
    register,
    logout,
    refreshProfile,
    clearError,
  } = useAuth();

  return <div>{user?.email}</div>;
}
```

### Guard Components

```tsx
import { RequireAuth, RequireAdmin, RequireTier } from './contexts/AuthContext';

// Require authentication
<RequireAuth fallback={<LoginPage />}>
  <ProtectedContent />
</RequireAuth>

// Require admin role
<RequireAdmin fallback={<AccessDenied />}>
  <AdminPanel />
</RequireAdmin>

// Require specific tier
<RequireTier tier={2} fallback={<UpgradePrompt />}>
  <PremiumFeature />
</RequireTier>
```

---

### ToastProvider

Toast notification provider (see [Toast Notifications](#toast-notifications)).

---

## Styling

All components support:
- **Dark mode** via `prefers-color-scheme: dark`
- **Responsive design** with mobile breakpoints
- **CSS custom properties** for theming

---

## Testing

All components have comprehensive tests. Run tests with:

```bash
cd kaa-app
npm test
```

Current test coverage: **451 tests passing**
