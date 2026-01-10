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

### Modal

Reusable modal dialog with overlay, customizable sizes, and keyboard support.

```tsx
import { Modal } from './components/common';

const [isOpen, setIsOpen] = useState(false);

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Edit Profile"
  size="md"
  footer={
    <>
      <button onClick={() => setIsOpen(false)}>Cancel</button>
      <button onClick={handleSave}>Save</button>
    </>
  }
>
  <form>
    {/* Modal content */}
  </form>
</Modal>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| isOpen | boolean | - | Controls modal visibility |
| onClose | () => void | - | Called when modal should close |
| title | string | - | Modal header title |
| children | ReactNode | - | Modal body content |
| size | 'sm' \| 'md' \| 'lg' \| 'xl' \| 'full' | 'md' | Modal size |
| closeOnOverlay | boolean | true | Close when overlay clicked |
| closeOnEscape | boolean | true | Close when Escape pressed |
| showCloseButton | boolean | true | Show X button in header |
| footer | ReactNode | - | Footer content (buttons) |
| className | string | '' | Additional CSS class |

---

### ConfirmDialog

Confirmation dialog with variants for different action types.

```tsx
import { ConfirmDialog } from './components/common';

const [showConfirm, setShowConfirm] = useState(false);

<ConfirmDialog
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={async () => {
    await deleteItem();
  }}
  title="Delete Item?"
  message="This action cannot be undone."
  confirmText="Delete"
  cancelText="Keep"
  variant="danger"
/>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| isOpen | boolean | - | Controls dialog visibility |
| onClose | () => void | - | Called when cancelled |
| onConfirm | () => void \| Promise<void> | - | Called when confirmed |
| title | string | - | Dialog title |
| message | string | - | Confirmation message |
| confirmText | string | 'Confirm' | Confirm button text |
| cancelText | string | 'Cancel' | Cancel button text |
| variant | 'info' \| 'warning' \| 'danger' | 'info' | Visual style variant |
| isLoading | boolean | - | External loading state |

---

### LoadingButton

Button with loading state, spinner, and multiple variants.

```tsx
import { LoadingButton } from './components/common';

<LoadingButton
  onClick={handleSubmit}
  isLoading={isSubmitting}
  loadingText="Saving..."
  variant="primary"
  size="md"
>
  Save Changes
</LoadingButton>

// With icons
<LoadingButton leftIcon={<PlusIcon />}>
  Add Item
</LoadingButton>

// Full width
<LoadingButton fullWidth variant="primary">
  Continue
</LoadingButton>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| isLoading | boolean | false | Shows spinner |
| loadingText | string | - | Text while loading |
| variant | 'primary' \| 'secondary' \| 'danger' \| 'ghost' | 'primary' | Visual style |
| size | 'sm' \| 'md' \| 'lg' | 'md' | Button size |
| fullWidth | boolean | false | Full container width |
| leftIcon | ReactNode | - | Icon before text |
| rightIcon | ReactNode | - | Icon after text |
| children | ReactNode | - | Button label |
| ...props | ButtonHTMLAttributes | - | Standard button props |

---

### Pagination

Page navigation with ellipsis, first/last buttons, and accessibility.

```tsx
import { Pagination } from './components/common';

<Pagination
  currentPage={page}
  totalPages={totalPages}
  onPageChange={setPage}
  showFirstLast={true}
  siblingCount={1}
/>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| currentPage | number | - | Current active page |
| totalPages | number | - | Total number of pages |
| onPageChange | (page: number) => void | - | Called when page changes |
| siblingCount | number | 1 | Pages shown around current |
| showFirstLast | boolean | true | Show first/last buttons |
| disabled | boolean | false | Disable all buttons |
| className | string | '' | Additional CSS class |

---

### SearchInput

Search input with debounce, icon, clear button, and loading state.

```tsx
import { SearchInput } from './components/common';

const [query, setQuery] = useState('');

<SearchInput
  value={query}
  onChange={setQuery}
  placeholder="Search projects..."
  debounceMs={300}
  showIcon={true}
  showClear={true}
  isLoading={isSearching}
/>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | string | - | Controlled input value |
| onChange | (value: string) => void | - | Called with debounced value |
| debounceMs | number | 300 | Debounce delay in ms |
| placeholder | string | 'Search...' | Input placeholder |
| showIcon | boolean | true | Show search icon |
| showClear | boolean | true | Show clear button |
| isLoading | boolean | false | Show loading spinner |
| size | 'sm' \| 'md' \| 'lg' | 'md' | Input size |

---

### Badge / StatusBadge / TierBadge

Status badges and tags with multiple variants.

```tsx
import { Badge, StatusBadge, TierBadge } from './components/common';

// Basic badge
<Badge variant="success" size="sm">Active</Badge>

// With dot indicator
<Badge variant="primary" dot>Processing</Badge>

// Rounded (pill) style
<Badge variant="info" rounded>New</Badge>

// Status preset (auto-maps status to variant)
<StatusBadge status="completed" />
<StatusBadge status="in_progress" />
<StatusBadge status="cancelled" />

// Tier preset
<TierBadge tier={1} /> // "Tier 1 - DIY"
<TierBadge tier={4} /> // "Tier 4 - KAA Premium"
```

**Badge Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | - | Badge text |
| variant | 'default' \| 'primary' \| 'success' \| 'warning' \| 'danger' \| 'info' | 'default' | Color variant |
| size | 'sm' \| 'md' \| 'lg' | 'md' | Badge size |
| dot | boolean | false | Show dot indicator |
| rounded | boolean | false | Pill shape |
| icon | ReactNode | - | Leading icon |

---

### EmptyState

Placeholder components for empty lists and search results.

```tsx
import {
  EmptyState,
  EmptySearch,
  EmptyList,
  EmptyProjects,
  EmptyDeliverables,
} from './components/common';

// Custom empty state
<EmptyState
  icon="📭"
  title="No Items"
  description="Add some items to get started."
  action={<button>Add Item</button>}
/>

// Search results empty
<EmptySearch query={searchQuery} />

// Generic list empty
<EmptyList itemName="projects" action={<button>Create</button>} />

// Preset empty states
<EmptyProjects action={<button>Start Project</button>} />
<EmptyDeliverables />
<EmptyMessages />
<EmptyNotifications />
```

**EmptyState Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| icon | ReactNode | '📭' | Display icon |
| title | string | - | Main heading |
| description | string | - | Supporting text |
| action | ReactNode | - | Call-to-action button |
| size | 'sm' \| 'md' \| 'lg' | 'md' | Component size |

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
npm run test:frontend
```

See [Testing Strategy](./TESTING_STRATEGY.md) for prerequisites and related test commands.

Current test coverage: **451 tests passing**
