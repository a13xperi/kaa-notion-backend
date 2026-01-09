# Tier Router Rules

**Last Updated:** 2026-01-09
**Status:** Implemented

---

## Overview

The Tier Router determines which service tier (1, 2, 3, or 4) a lead should be assigned to based on their intake form responses.

**Tiers:**
- **Tier 1:** The Concept (No-Touch, Fully Automated)
- **Tier 2:** The Builder (Low-Touch, Systematized with Checkpoints)
- **Tier 3:** The Concierge (Site Visits, Hybrid Tech + Boots on Ground)
- **Tier 4:** KAA White Glove (High-Touch, We Choose the Client)

**Implementation:**
- Config: `kaa-app/src/config/sageTiers.ts`
- Router: `kaa-app/src/utils/tierRouter.ts`

---

## Budget Thresholds

| Tier | Budget Range | Label |
|------|-------------|-------|
| Tier 1 | $500 - $2,500 | The Concept |
| Tier 2 | $2,500 - $10,000 | The Builder |
| Tier 3 | $10,000 - $50,000 | The Concierge |
| Tier 4 | $50,000+ OR % of Install | KAA White Glove |

---

## Timeline Thresholds

| Category | Duration | Typical Tier |
|----------|----------|--------------|
| Fast Track | < 2 weeks | Tier 1-2 |
| Standard | 2-8 weeks | Tier 1-3 |
| Extended | > 8 weeks | Tier 3-4 |

---

## Routing Logic

### Input Factors

**From Intake Form:**
1. **Budget Range** (required)
2. **Desired Timeline** (required)
3. **Project Type** (new build, renovation, etc.)
4. **Existing Assets** (survey, drawings, etc.)
5. **Project Address** (location complexity)

### Decision Tree

```
START: Lead Submission
│
├─ Budget < $2,500 → Tier 1 (Automated)
│
├─ Budget $2,500 - $10,000 → Tier 2 (Low-Touch)
│
├─ Budget $10,000 - $50,000 → Tier 3 (Site Visits)
│
├─ Budget > $50,000 → Tier 4 (White Glove)
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
- Budget: $500 - $2,500
- Timeline: 2-4 weeks
- Has existing survey and/or drawings
- Project type: Simple renovation, small addition
- No site visit required

**Auto-Route:** ✅ Yes (if all criteria met)

**Red Flags (→ Manual Review):**
- Budget below $500 minimum
- Timeline unrealistic (< 2 weeks)
- Complex project type
- No existing assets

---

## Tier 2: The Builder (Low-Touch)

**Criteria:**
- Budget: $2,500 - $10,000
- Timeline: 4-8 weeks
- Has some existing assets (survey OR drawings)
- Project type: Standard renovation, medium addition
- Minimal site visit needs

**Auto-Route:** ✅ Yes (if criteria met)

**Red Flags (→ Manual Review):**
- Budget at upper limit (might need Tier 3)
- Timeline very tight
- Missing critical assets
- Complex requirements

---

## Tier 3: The Concierge (Site Visits)

**Criteria:**
- Budget: $10,000 - $50,000
- Timeline: 8-12 weeks
- No existing survey or drawings
- Project type: New build, major renovation
- Site visit required

**Auto-Route:** ⚠️ Conditional (may need manual review)

**Red Flags (→ Manual Review):**
- Budget at upper limit (might need Tier 4)
- Very complex project
- Multiple properties
- Special requirements

---

## Tier 4: KAA White Glove (We Choose)

**Criteria:**
- Budget: > $50,000 OR
- Percentage of install pricing model
- Complex, high-value projects
- Long-term relationship potential
- Special requirements

**Auto-Route:** ❌ No (always manual review)

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

**Tier 1:** $500 - $2,500
- Lower budget range
- Standardized packages
- Automated delivery

**Tier 2:** $2,500 - $10,000
- Mid-range budget
- Some customization
- Designer checkpoints

**Tier 3:** $10,000 - $50,000
- Higher budget
- Site visits included
- More customization

**Tier 4:** > $50,000 OR % of install
- Premium budget
- Full-service
- Percentage-based pricing

### Rule 2: Timeline-Based Routing

**Fast Track (< 2 weeks):**
- Usually Tier 1 or 2
- Requires existing assets
- Automated or streamlined process

**Standard (2-8 weeks):**
- Tier 1, 2, or 3
- Based on other factors

**Extended (> 8 weeks):**
- Usually Tier 3 or 4
- Complex projects
- Multiple phases

### Rule 3: Asset-Based Routing

**Has Survey + Drawings:**
- Can start immediately
- Tier 1 or 2 likely
- Can downgrade by 1 tier if applicable

**Has Survey OR Drawings:**
- Some work needed
- Minimum Tier 2

**No Survey, No Drawings:**
- Site visit required
- Minimum Tier 3

### Rule 4: Project Type Routing

| Project Type | Minimum Tier |
|-------------|--------------|
| Simple Renovation | 1 |
| Small Addition | 1 |
| Standard Renovation | 2 |
| Medium Addition | 2 |
| Large Addition | 3 |
| New Build | 3 |
| Multiple Properties | 4 |
| Commercial | 4 |

---

## Implementation

### Tier Recommendation Function

**Location:** `kaa-app/src/utils/tierRouter.ts`

**Configuration:** `kaa-app/src/config/sageTiers.ts`

**Function Signature:**
```typescript
interface IntakeFormData {
  budgetRange: BudgetRangeValue;  // "500_2500", "2500_10000", etc.
  timeline: TimelineValue;         // "2_4_weeks", "4_8_weeks", etc.
  projectType: ProjectTypeValue;   // "renovation", "new_build", etc.
  hasSurvey: boolean;
  hasDrawings: boolean;
  projectAddress?: string;
}

interface TierRecommendation {
  tier: 1 | 2 | 3 | 4;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  needsManualReview: boolean;
  factors: RoutingFactor[];
  tierDefinition: TierDefinition;
}

function recommendTier(data: IntakeFormData): TierRecommendation
```

### Usage Example

```typescript
import { recommendTier } from './utils/tierRouter';

const result = recommendTier({
  budgetRange: '2500_10000',
  timeline: '4_8_weeks',
  projectType: 'standard_renovation',
  hasSurvey: true,
  hasDrawings: false,
});

console.log(result.tier);        // 2
console.log(result.reason);      // "$2,500 - $10,000 budget"
console.log(result.confidence);  // "high"
console.log(result.needsManualReview); // false
```

---

## Manual Review Queue

### When Review is Required

1. **Tier 4 Recommended** - Always requires review
2. **Confidence = Low** - Unclear criteria
3. **Red Flags Present** - Budget/timeline mismatch, complex requirements
4. **Edge Cases** - Doesn't fit standard criteria

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

## Configuration

### Budget Thresholds

```typescript
const BUDGET_THRESHOLDS = {
  TIER_1_MIN: 500,
  TIER_1_MAX: 2500,
  TIER_2_MAX: 10000,
  TIER_3_MAX: 50000,
};
```

### Timeline Thresholds

```typescript
const TIMELINE_THRESHOLDS = {
  FAST_TRACK: 2,     // weeks
  STANDARD_MAX: 8,   // weeks
  EXTENDED: 8,       // weeks
};
```

### Stripe Price IDs

Set via environment variables:
```bash
# Frontend (React)
REACT_APP_STRIPE_PRICE_TIER_1=price_xxx
REACT_APP_STRIPE_PRICE_TIER_2=price_xxx
REACT_APP_STRIPE_PRICE_TIER_3=price_xxx
REACT_APP_STRIPE_PRICE_TIER_4=price_xxx

# Backend (Node)
STRIPE_PRICE_TIER_1=price_xxx
STRIPE_PRICE_TIER_2=price_xxx
STRIPE_PRICE_TIER_3=price_xxx
STRIPE_PRICE_TIER_4=price_xxx
```

---

## Testing

### Test Cases

| Test Case | Input | Expected Tier | Notes |
|-----------|-------|---------------|-------|
| Clear Tier 1 | Budget: $500-$2,500, Timeline: 2-4 weeks, Has assets | 1 | Auto-route |
| Clear Tier 2 | Budget: $2,500-$10,000, Timeline: 4-8 weeks | 2 | Auto-route |
| Clear Tier 3 | Budget: $10,000-$50,000, No assets, New build | 3 | May review |
| Tier 4 | Budget: $50,000+, OR complex project | 4 | Always review |
| Edge: Low budget, no assets | Budget: $500-$2,500, No assets | 3 | Upgrade due to assets |
| Edge: High budget, tight timeline | Budget: $50,000+, < 2 weeks | 4 | Review required |

### Validation

```typescript
import { validateIntakeData, recommendTier } from './utils/tierRouter';

// Validate before routing
const validation = validateIntakeData(formData);
if (!validation.valid) {
  console.error('Missing fields:', validation.missingFields);
  return;
}

// Get recommendation
const result = recommendTier(formData);
```

---

## Future Enhancements

- **Machine Learning:** Learn from past routing decisions
- **A/B Testing:** Test different routing logic
- **Client Feedback:** Adjust based on client satisfaction
- **Capacity Management:** Consider team capacity in routing
- **Seasonal Adjustments:** Adjust thresholds by season
- **Location-Based Routing:** Factor in project address complexity
