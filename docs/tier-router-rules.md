# Tier Router Rules

**Last Updated:** 2025-01-09
**Status:** Implementation Complete

---

## Overview

The Tier Router determines which service tier (1, 2, 3, or 4) a lead should be assigned to based on their intake form responses.

**Configuration Source:** `kaa-app/src/config/sageTiers.ts`
**Router Implementation:** `kaa-app/src/utils/tierRouter.ts`

**Tiers:**
- **Tier 1:** The Concept (No-Touch, Fully Automated)
- **Tier 2:** The Builder (Low-Touch, Systematized with Checkpoints)
- **Tier 3:** The Concierge (Site Visits, Hybrid Tech + Boots on Ground)
- **Tier 4:** KAA White Glove (High-Touch, We Choose the Client)

---

## Budget Thresholds

| Tier | Range | Label |
|------|-------|-------|
| **Tier 1** | $2,500 - $7,500 | Standard automated package |
| **Tier 2** | $7,500 - $15,000 | Low-touch with designer checkpoints |
| **Tier 3** | $15,000 - $35,000 | Site visits and hybrid service |
| **Tier 4** | $35,000+ | White-glove / % of install pricing |

---

## Routing Logic

### Input Factors

**From Intake Form:**
1. **Budget Range** (required) - Dollar amount
2. **Desired Timeline** (required) - Number of weeks
3. **Project Type** (new build, renovation, etc.)
4. **Existing Assets** (survey, drawings, etc.)
5. **Project Address** (location complexity)

### Decision Tree

```
START: Lead Submission
│
├─ Budget < $2,500 → Below minimum (flag for review)
│
├─ Budget $2,500 - $7,500 → Tier 1 (Automated)
│
├─ Budget $7,500 - $15,000 → Tier 2 (Low-Touch)
│
├─ Budget $15,000 - $35,000 → Tier 3 (Site Visits)
│
├─ Budget > $35,000 → Tier 4 (White Glove)
│
├─ Timeline < 2 weeks → Tier 1 or 2 (Fast Track)
│
├─ Timeline > 8 weeks → Tier 3 or 4 (Complex)
│
├─ Has Survey + Drawings → Tier 1 or 2 (Ready to Go)
│
├─ No Survey, No Drawings → Tier 3 or 4 (Site Visit Needed)
│
└─ Project Type = "New Build" → Tier 3 or 4 (Complex)
```

---

## Tier 1: The Concept (No-Touch)

**Criteria:**
- Budget: $2,500 - $7,500
- Timeline: 2-4 weeks
- Has existing survey and/or drawings
- Project type: Simple renovation, small addition
- No site visit required

**Auto-Route:** ✅ Yes (if all criteria met)

**Deliverables:**
- Conceptual Floor Plans
- Basic 3D Renderings
- Digital Delivery
- 1 Revision Round

**Red Flags (→ Manual Review):**
- Budget unclear or below $2,500 minimum
- Timeline unrealistic (< 2 weeks)
- Complex project type
- No existing assets

---

## Tier 2: The Builder (Low-Touch)

**Criteria:**
- Budget: $7,500 - $15,000
- Timeline: 4-8 weeks
- Has some existing assets (survey OR drawings)
- Project type: Standard renovation, medium addition
- Minimal site visit needs

**Auto-Route:** ✅ Yes (if criteria met)

**Deliverables:**
- Detailed Floor Plans
- 3D Renderings
- Designer Kickoff Call
- Mid-project Check-in
- 2 Revision Rounds

**Red Flags (→ Manual Review):**
- Budget at upper limit ($15,000) - might need Tier 3
- Timeline very tight
- Missing critical assets
- Complex requirements

---

## Tier 3: The Concierge (Site Visits)

**Criteria:**
- Budget: $15,000 - $35,000
- Timeline: 8-12 weeks
- No existing survey or drawings
- Project type: New build, major renovation
- Site visit required

**Auto-Route:** ⚠️ Conditional (may need manual review)

**Deliverables:**
- Comprehensive Floor Plans
- Premium 3D Renderings
- Site Survey Visit
- Designer Collaboration Sessions
- 3 Revision Rounds
- Contractor Coordination

**Red Flags (→ Manual Review):**
- Budget at upper limit ($35,000) - might need Tier 4
- Very complex project
- Multiple properties
- Special requirements

---

## Tier 4: KAA White Glove (We Choose)

**Criteria:**
- Budget: > $35,000 OR
- Percentage of install pricing model
- Complex, high-value projects
- Long-term relationship potential
- Special requirements

**Auto-Route:** ❌ No (always manual review)

**Deliverables:**
- Full Architectural Design
- Unlimited Revisions
- Multiple Site Visits
- Dedicated Design Team
- Project Management
- Contractor Selection Support
- Construction Oversight

**Process:**
1. Lead flagged for Tier 4
2. Team reviews lead
3. If approved → Show booking link / human follow-up
4. If not fit → Route to Tier 3 or close

**We Choose the Client:**
- Not all Tier 4 leads are accepted
- Team evaluates fit, capacity, project alignment
- Premium service for select clients

---

## Routing Rules (Detailed)

### Rule 1: Budget-Based Routing

| Tier | Budget Range | Description |
|------|-------------|-------------|
| **Tier 1** | $2,500 - $7,500 | Lower budget range, standardized packages, automated delivery |
| **Tier 2** | $7,500 - $15,000 | Mid-range budget, some customization, designer checkpoints |
| **Tier 3** | $15,000 - $35,000 | Higher budget, site visits included, more customization |
| **Tier 4** | $35,000+ or % of install | Premium budget, full-service, percentage-based pricing |

### Rule 2: Timeline-Based Routing

| Timeline | Weeks | Eligible Tiers |
|----------|-------|----------------|
| **Fast Track** | < 2 weeks | Tier 1, 2 (requires existing assets) |
| **Standard** | 2-8 weeks | Tier 1, 2, 3 |
| **Extended** | > 8 weeks | Tier 3, 4 |

### Rule 3: Asset-Based Routing

| Assets | Eligible Tiers | Notes |
|--------|----------------|-------|
| **Has Survey + Drawings** | Tier 1, 2 | Can start immediately |
| **Has Survey OR Drawings** | Tier 2, 3 | Some work needed |
| **No Survey, No Drawings** | Tier 3, 4 | Site visit required |

### Rule 4: Project Type Routing

| Project Type | Eligible Tiers | Site Visit Required |
|--------------|----------------|---------------------|
| Simple Renovation | Tier 1, 2 | No |
| Standard Renovation | Tier 1, 2, 3 | No |
| Small Addition | Tier 1, 2 | No |
| Standard Addition | Tier 2, 3 | No |
| Major Renovation | Tier 3, 4 | Yes |
| New Build | Tier 3, 4 | Yes |
| Complex Project | Tier 4 | Yes |
| Multiple Properties | Tier 4 | Yes |

---

## Implementation

### Configuration Module

**Location:** `kaa-app/src/config/sageTiers.ts`

This is the **single source of truth** for all tier-related configuration:

```typescript
import {
  TIER_DEFINITIONS,      // Tier names, deliverables, touch levels
  BUDGET_BANDS,          // Budget thresholds
  BUDGET_THRESHOLDS,     // Convenience constants
  TIMELINE_THRESHOLDS,   // Timeline categories
  PROJECT_TYPE_ROUTING,  // Project type to tier mapping
  ASSET_ROUTING,         // Asset requirements
  STRIPE_CONFIG,         // Stripe price IDs (env-driven)
  RED_FLAGS,             // Manual review triggers
} from '@/config/sageTiers';
```

### Tier Router Function

**Location:** `kaa-app/src/utils/tierRouter.ts`

**Function Signature:**
```typescript
interface IntakeFormData {
  budget: number;           // Dollar amount
  timelineWeeks: number;    // Number of weeks
  projectType: ProjectType; // 'simple_renovation', 'new_build', etc.
  hasSurvey: boolean;
  hasDrawings: boolean;
  projectAddress?: string;
}

interface TierRecommendation {
  tier: 1 | 2 | 3 | 4;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  needsManualReview: boolean;
  factors: RoutingReason[];
  redFlags: string[];
  alternativeTiers: TierId[];
}

function recommendTier(data: IntakeFormData): TierRecommendation
```

### Algorithm

The router uses weighted scoring across four factors:

| Factor | Weight |
|--------|--------|
| Budget | 40% |
| Assets | 25% |
| Timeline | 20% |
| Project Type | 15% |

**Hard Rules (override weighted calculation):**
1. No assets → Always at least Tier 3
2. New build/complex → Always at least Tier 3
3. Multiple properties → Always Tier 4
4. Budget ≥ $35,000 → Always at least Tier 4

**Confidence Calculation:**
- High: ≥75% of factors agree with final tier
- Medium: 50-75% agreement
- Low: <50% agreement

---

## Manual Review Queue

### When Review is Required

1. **Tier 4 Recommended** - Always requires review
2. **Confidence = Low** - Unclear criteria
3. **Red Flags Present** - Budget/timeline mismatch, complex requirements
4. **Edge Cases** - Doesn't fit standard criteria

### Red Flags

| Flag | Description | Severity |
|------|-------------|----------|
| `budget_unclear` | Budget unclear or below $2,500 minimum | Warning |
| `timeline_unrealistic` | < 2 weeks for complex project | Warning |
| `budget_timeline_mismatch` | Budget and timeline don't align | Warning |
| `no_assets_fast_timeline` | No assets but expecting fast delivery | Critical |
| `complex_low_budget` | Complex project with < $15,000 budget | Critical |
| `multiple_properties` | Multiple properties need evaluation | Warning |

### Review Process

1. Lead appears in `/admin/leads` queue
2. Team member reviews intake form
3. Options:
   - **Approve Tier** - Confirm recommended tier
   - **Change Tier** - Assign different tier with reason
   - **Request More Info** - Email client for clarification
   - **Close - Not Fit** - Not a good fit for any tier

---

## Tier-Specific Next Steps

### Tier 1 (Auto-Route)
1. Show "Checkout Now" button
2. Redirect to Stripe Checkout
3. After payment → Create project → Auto-onboard

### Tier 2 (Auto-Route)
1. Show "Checkout / Schedule Kickoff" options
2. Redirect to Stripe Checkout OR schedule call
3. After payment → Create project → Onboard with designer

### Tier 3 (Conditional)
1. Show "Deposit / Schedule Site Visit"
2. Collect deposit via Stripe
3. Schedule site visit
4. After site visit → Complete project setup

### Tier 4 (Manual Review)
1. Show "Book Consult" button
2. Display message: "Our team will review your project and contact you"
3. Team reviews → Approves/Declines
4. If approved → Send booking link
5. If declined → Suggest Tier 3 or close

---

## Stripe Configuration

Stripe price IDs are loaded from environment variables:

```bash
# .env
REACT_APP_STRIPE_TIER1_PRODUCT_ID=prod_xxx
REACT_APP_STRIPE_TIER1_PRICE_ID=price_xxx
REACT_APP_STRIPE_TIER2_PRODUCT_ID=prod_xxx
REACT_APP_STRIPE_TIER2_PRICE_ID=price_xxx
REACT_APP_STRIPE_TIER3_PRODUCT_ID=prod_xxx
REACT_APP_STRIPE_TIER3_PRICE_ID=price_xxx
REACT_APP_STRIPE_TIER3_DEPOSIT_PRICE_ID=price_xxx  # For deposits
REACT_APP_STRIPE_TIER4_PRODUCT_ID=prod_xxx
REACT_APP_STRIPE_TIER4_PRICE_ID=price_xxx
```

---

## Testing

### Test Cases

| Test | Input | Expected Output |
|------|-------|-----------------|
| Clear Tier 1 | Budget: $5,000, Timeline: 3 weeks, Has assets, Simple renovation | Tier 1, High confidence |
| Clear Tier 2 | Budget: $10,000, Timeline: 6 weeks, Has survey, Standard renovation | Tier 2, High confidence |
| Clear Tier 3 | Budget: $25,000, No assets, New build | Tier 3, High confidence |
| Tier 4 | Budget: $50,000, Complex project | Tier 4, Needs review |
| Edge Case | Budget: $10,000, < 2 weeks, No assets | Tier 3, Low confidence, Needs review |
| Red Flag | Budget: $5,000, New build | Tier 3, Red flag: complex_low_budget |

### Usage Example

```typescript
import { recommendTier, IntakeFormData } from '@/utils/tierRouter';

const formData: IntakeFormData = {
  budget: 12000,
  timelineWeeks: 6,
  projectType: 'standard_renovation',
  hasSurvey: true,
  hasDrawings: false,
  projectAddress: '123 Main St',
};

const recommendation = recommendTier(formData);
// {
//   tier: 2,
//   reason: 'Budget ($12,000) fits Tier 2 range. Has survey only - some additional work needed.',
//   confidence: 'high',
//   needsManualReview: false,
//   factors: [...],
//   redFlags: [],
//   alternativeTiers: [3]
// }
```

---

## Future Enhancements

- **Machine Learning:** Learn from past routing decisions
- **A/B Testing:** Test different routing logic
- **Client Feedback:** Adjust based on client satisfaction
- **Capacity Management:** Consider team capacity in routing
- **Seasonal Adjustments:** Adjust thresholds by season
- **Location-Based Adjustments:** Factor in project location complexity
