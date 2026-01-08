# Tier Router Rules

**Last Updated:** 2024-12-28  
**Status:** Design Phase

---

## Overview

The Tier Router determines which service tier (1, 2, 3, or 4) a lead should be assigned to based on their intake form responses.

**Tiers:**
- **Tier 1:** The Concept (No-Touch, Fully Automated)
- **Tier 2:** The Builder (Low-Touch, Systematized with Checkpoints)
- **Tier 3:** The Concierge (Site Visits, Hybrid Tech + Boots on Ground)
- **Tier 4:** KAA White Glove (High-Touch, We Choose the Client)

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
├─ Budget < $X → Tier 1 (Automated)
│
├─ Budget $X - $Y → Tier 2 (Low-Touch)
│
├─ Budget $Y - $Z → Tier 3 (Site Visits)
│
├─ Budget > $Z → Tier 4 (White Glove)
│
├─ Timeline < 2 weeks → Tier 1 or 2 (Fast Track)
│
├─ Timeline > 6 months → Tier 3 or 4 (Complex)
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
- Budget: $X - $Y (to be defined)
- Timeline: 2-4 weeks
- Has existing survey and/or drawings
- Project type: Simple renovation, small addition
- No site visit required

**Auto-Route:** ✅ Yes (if all criteria met)

**Red Flags (→ Manual Review):**
- Budget unclear or below minimum
- Timeline unrealistic (< 2 weeks)
- Complex project type
- No existing assets

---

## Tier 2: The Builder (Low-Touch)

**Criteria:**
- Budget: $Y - $Z (to be defined)
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
- Budget: $Z - $W (to be defined)
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
- Budget: > $W (to be defined) OR
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

**Tier 1:** $X - $Y
- Lower budget range
- Standardized packages
- Automated delivery

**Tier 2:** $Y - $Z
- Mid-range budget
- Some customization
- Designer checkpoints

**Tier 3:** $Z - $W
- Higher budget
- Site visits included
- More customization

**Tier 4:** > $W OR % of install
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

**Has Survey OR Drawings:**
- Some work needed
- Tier 2 or 3 likely

**No Survey, No Drawings:**
- Site visit required
- Tier 3 or 4 likely

### Rule 4: Project Type Routing

**Simple Renovation:**
- Tier 1 or 2

**Standard Addition:**
- Tier 2 or 3

**New Build:**
- Tier 3 or 4

**Complex/Multiple Properties:**
- Tier 4 (manual review)

---

## Implementation

### Tier Recommendation Function

**Location:** `kaa-app/src/utils/tierRouter.ts`

**Function Signature:**
```typescript
interface IntakeFormData {
  budgetRange: string; // "$X-$Y", "$Y-$Z", etc.
  timeline: string; // "2-4 weeks", "4-8 weeks", etc.
  projectType: string; // "renovation", "addition", "new_build", etc.
  hasSurvey: boolean;
  hasDrawings: boolean;
  projectAddress: string;
}

interface TierRecommendation {
  tier: 1 | 2 | 3 | 4;
  reason: string; // Why this tier was recommended
  confidence: 'high' | 'medium' | 'low';
  needsManualReview: boolean;
}

function recommendTier(data: IntakeFormData): TierRecommendation
```

### Algorithm

```typescript
function recommendTier(data: IntakeFormData): TierRecommendation {
  let tier = 1;
  let reasons: string[] = [];
  let needsReview = false;

  // Budget analysis
  if (data.budgetRange === 'high' || data.budgetRange.includes('$Z+')) {
    tier = 4;
    reasons.push('High budget range');
    needsReview = true; // Always review Tier 4
  } else if (data.budgetRange.includes('$Y-$Z')) {
    tier = 3;
    reasons.push('Mid-high budget range');
  } else if (data.budgetRange.includes('$X-$Y')) {
    tier = 2;
    reasons.push('Mid-range budget');
  } else {
    tier = 1;
    reasons.push('Standard budget range');
  }

  // Timeline analysis
  if (data.timeline.includes('> 8 weeks') || data.timeline.includes('6+ months')) {
    if (tier < 3) tier = 3;
    reasons.push('Extended timeline requires site visits');
  } else if (data.timeline.includes('< 2 weeks')) {
    if (tier > 2) {
      needsReview = true;
      reasons.push('Tight timeline may not be feasible');
    }
  }

  // Asset analysis
  if (!data.hasSurvey && !data.hasDrawings) {
    if (tier < 3) {
      tier = 3;
      reasons.push('Site visit required (no existing assets)');
    }
  } else if (data.hasSurvey && data.hasDrawings) {
    if (tier > 2) {
      tier = Math.max(1, tier - 1); // Can potentially downgrade
      reasons.push('Existing assets allow for streamlined process');
    }
  }

  // Project type analysis
  if (data.projectType === 'new_build') {
    if (tier < 3) {
      tier = 3;
      reasons.push('New build requires site visits');
    }
  } else if (data.projectType === 'complex' || data.projectType.includes('multiple')) {
    tier = 4;
    needsReview = true;
    reasons.push('Complex project requires white-glove service');
  }

  // Determine confidence
  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (needsReview) confidence = 'low';
  else if (reasons.length > 3) confidence = 'medium';

  return {
    tier: tier as 1 | 2 | 3 | 4,
    reason: reasons.join('; '),
    confidence,
    needsManualReview: needsReview || tier === 4
  };
}
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

**Budget Thresholds (to be defined):**
- Tier 1: $X - $Y
- Tier 2: $Y - $Z
- Tier 3: $Z - $W
- Tier 4: > $W OR % of install

**Timeline Thresholds:**
- Fast: < 2 weeks
- Standard: 2-8 weeks
- Extended: > 8 weeks

**Store in:**
- Postgres `tiers` table (configuration)
- Or environment variables
- Or config file

---

## Testing

### Test Cases

1. **Clear Tier 1:** Budget low, timeline standard, has assets → Tier 1
2. **Clear Tier 2:** Budget mid, timeline standard, has some assets → Tier 2
3. **Clear Tier 3:** Budget high, no assets, new build → Tier 3
4. **Tier 4:** Budget very high OR complex project → Tier 4 (review)
5. **Edge Case:** Budget mid, no timeline → Review
6. **Edge Case:** Budget high, tight timeline → Review

### Validation

- Test all budget ranges
- Test all timeline options
- Test all project types
- Test asset combinations
- Test edge cases

---

## Future Enhancements

- **Machine Learning:** Learn from past routing decisions
- **A/B Testing:** Test different routing logic
- **Client Feedback:** Adjust based on client satisfaction
- **Capacity Management:** Consider team capacity in routing
- **Seasonal Adjustments:** Adjust thresholds by season
