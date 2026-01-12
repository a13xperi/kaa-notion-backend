# Freemium Paywall Strategy: AI Sage Agent

## Executive Summary

Transform SAGE from a tier-based checkout model to a **freemium model** where:
- **FREE**: Anyone can create a project and upload assets
- **PAYWALL**: Triggered when users want AI Sage assistance
- **PACKAGES**: Build packages (Seedling → Sprout → Canopy) + White Glove

---

## The Narrative

### Current State
Users hit a paywall before they even start. They must commit financially before experiencing value.

### New State
> "Start your project for free. Upload your inspiration, survey, drawings - all free. When you're ready to bring it to life, SAGE AI guides your journey with the package that fits your vision."

**The Hook**: Let users invest time and emotional energy into their project FIRST. Once they've uploaded photos, described their dream, and started envisioning possibilities - THAT'S when SAGE AI becomes irresistible.

---

## What is the AI Sage Agent?

The **AI Sage Agent** is the intelligent assistant that transforms raw uploads into actionable design guidance:

### Core AI Capabilities (What Users Pay For)

| Feature | Description | Paywall Level |
|---------|-------------|---------------|
| **Site Analysis** | AI analyzes survey/photos to identify opportunities & constraints | Seedling+ |
| **Style Matching** | Matches inspiration images to design styles/elements | Seedling+ |
| **Concept Generation** | AI-generated initial concept suggestions based on inputs | Sprout+ |
| **Budget Optimization** | Smart recommendations to maximize impact within budget | Sprout+ |
| **Plant Recommendations** | Climate/soil-appropriate plant suggestions | Sprout+ |
| **Design Feedback** | AI reviews and suggests improvements on uploaded plans | Canopy+ |
| **3D Visualization** | AI-assisted rendering previews | Canopy+ |
| **Full Design Orchestration** | Complete AI-guided design journey | White Glove |

### Free vs. Paid Experience

**FREE (No AI)**:
- Create project
- Upload unlimited photos, inspiration, surveys, drawings
- Basic organization & storage
- View your uploads
- Edit project details

**PAID (AI Sage Activated)**:
- All free features PLUS
- AI analyzes your uploads
- Personalized recommendations
- Design guidance
- Professional deliverables
- Human designer access (tier-dependent)

---

## Restructured Tier System

### Tier 0: Explorer (FREE)
> "Gather your vision"

**Price**: $0
**What They Get**:
- Create 1 project
- Unlimited uploads (photos, PDFs, inspiration)
- Basic project dashboard
- Asset organization
- No AI features
- No deliverables

**Paywall Triggers**:
- Click "Analyze with SAGE AI"
- Request design recommendations
- Try to access AI features
- Request any deliverable

---

### Tier 1: Seedling ($49 one-time or $29/mo)
> "Plant the seed"

**Price**: Entry-level build package
**What They Get**:
- Everything in Explorer
- AI Site Analysis
- AI Style Matching
- Basic recommendations report (PDF)
- 1 revision round
- Email support

**Best For**: DIYers who want guidance but will do the work themselves

---

### Tier 2: Sprout ($149 one-time or $79/mo)
> "Watch it grow"

**Price**: Mid-level build package
**What They Get**:
- Everything in Seedling
- AI Concept Generation
- AI Budget Optimization
- Plant Recommendations
- Conceptual floor plans
- Basic 3D renderings
- 2 revision rounds
- Designer checkpoint call

**Best For**: Homeowners who want professional concepts with some AI assistance

---

### Tier 3: Canopy ($349 one-time or $149/mo)
> "Full coverage"

**Price**: High-level build package
**What They Get**:
- Everything in Sprout
- AI Design Feedback
- 3D Visualization
- Detailed floor plans
- Multiple rendering angles
- Material specifications
- 3 revision rounds
- 2 designer collaboration sessions
- Priority support

**Best For**: Serious projects requiring comprehensive design packages

---

### Tier 4: White Glove (Custom - $2,500+)
> "We handle everything"

**Price**: Custom quote
**What They Get**:
- Everything in Canopy
- Dedicated designer
- Unlimited AI assistance
- Site visits
- Contractor coordination
- Construction oversight
- Unlimited revisions
- Dedicated project manager
- White-glove concierge service

**Best For**: Premium clients who want full-service experience

---

## User Journey Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER LANDS ON SITE                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│   "Start Your Project Free" - No payment, no commitment         │
│   • Enter email                                                  │
│   • Name your project                                           │
│   • Add property address                                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FREE PROJECT DASHBOARD                        │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│   │ 📸 Photos   │  │ 💡 Inspo    │  │ 📐 Surveys  │            │
│   │   Upload    │  │   Upload    │  │   Upload    │            │
│   └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                  │
│   User uploads assets freely...building investment               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PAYWALL MOMENTS                             │
│                                                                  │
│   User clicks any of these → Paywall Modal:                     │
│   • "✨ Analyze with SAGE AI"                                   │
│   • "Get Design Recommendations"                                 │
│   • "Generate Concept"                                          │
│   • "See What's Possible"                                       │
│                                                                  │
│   ┌───────────────────────────────────────────────────────┐     │
│   │  🌱 "Ready to bring your vision to life?"             │     │
│   │                                                        │     │
│   │  You've uploaded 12 photos and 3 inspiration images.  │     │
│   │  SAGE AI is ready to analyze your space and create    │     │
│   │  personalized recommendations.                         │     │
│   │                                                        │     │
│   │  Choose your package:                                  │     │
│   │  ○ Seedling - $49  (DIY guidance)                     │     │
│   │  ○ Sprout - $149   (Concepts + plans)                 │     │
│   │  ○ Canopy - $349   (Full design package)              │     │
│   │  ○ White Glove     (Request quote)                    │     │
│   │                                                        │     │
│   │  [Continue with Seedling]                             │     │
│   └───────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PAYMENT & ACTIVATION                          │
│                                                                  │
│   • Stripe checkout                                              │
│   • Project upgraded to paid tier                               │
│   • AI Sage Agent unlocked                                      │
│   • Deliverables queue begins                                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                 PAID EXPERIENCE BEGINS                           │
│                                                                  │
│   AI Sage analyzes uploads → Generates recommendations →        │
│   Creates deliverables → Designer reviews (tier-dependent) →    │
│   Client receives package                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation Plan

### Phase 1: Database & Model Changes

#### 1.1 Update Prisma Schema

```prisma
// Add Explorer tier (tier 0)
model Tier {
  id               Int       @id  // 0, 1, 2, 3, 4
  name             String    // "Explorer", "Seedling", "Sprout", "Canopy", "White Glove"
  price            Int?      // null for free/custom
  priceMonthly     Int?      // monthly subscription option
  isFreeTier       Boolean   @default(false)
  aiFeatures       String[]  // array of enabled AI features
  // ... existing fields
}

// Add AI feature tracking to Project
model Project {
  // ... existing fields
  aiActivated      Boolean   @default(false)
  aiActivatedAt    DateTime?
  aiFeatures       String[]  // which AI features have been used
  uploadCount      Int       @default(0)  // track engagement
}

// New: AI Analysis Results
model AIAnalysis {
  id            String   @id @default(uuid())
  projectId     String
  project       Project  @relation(fields: [projectId], references: [id])
  analysisType  String   // "site", "style", "concept", etc.
  inputAssets   String[] // asset IDs that were analyzed
  results       Json     // AI output
  createdAt     DateTime @default(now())
}
```

#### 1.2 New Tables Needed
- `AIAnalysis` - Store AI analysis results
- `PaywallEvent` - Track paywall interactions (analytics)
- Update `Tier` - Add tier 0, restructure features

---

### Phase 2: Free Project Flow

#### 2.1 New Routes

```typescript
// POST /api/projects/free - Create free project (no payment)
// No authentication required initially (create account on paywall)

interface CreateFreeProjectRequest {
  email: string;
  projectName: string;
  projectAddress?: string;
}

// Response: Creates User (if new) + Project at tier 0
```

#### 2.2 Updated Auth Flow
- Allow project creation without payment
- Create "Explorer" user type
- Defer full account setup until paywall

#### 2.3 Upload Endpoints (Free Access)
- `POST /api/projects/:id/assets` - Upload any asset
- `GET /api/projects/:id/assets` - View uploaded assets
- `DELETE /api/projects/:id/assets/:assetId` - Remove asset
- No tier check on these endpoints (tier 0+ allowed)

---

### Phase 3: Paywall Implementation

#### 3.1 Paywall Trigger Points

Create middleware/utility to check AI access:

```typescript
// server/src/middleware/requireAIAccess.ts
export const requireAIAccess = (feature: AIFeature) => {
  return async (req, res, next) => {
    const project = req.project;

    if (project.tier === 0 || !project.aiActivated) {
      return res.status(402).json({
        error: 'AI_ACCESS_REQUIRED',
        message: 'Upgrade to access AI features',
        requiredTier: getMinTierForFeature(feature),
        currentUploads: project.uploadCount,
        paywallUrl: `/upgrade?project=${project.id}&feature=${feature}`
      });
    }

    if (!hasTierFeature(project.tier, feature)) {
      return res.status(402).json({
        error: 'TIER_UPGRADE_REQUIRED',
        message: `${feature} requires a higher tier`,
        requiredTier: getMinTierForFeature(feature),
        upgradeUrl: `/upgrade?project=${project.id}`
      });
    }

    next();
  };
};
```

#### 3.2 AI Feature Endpoints (Protected)

```typescript
// All require AI access check
POST /api/projects/:id/ai/analyze-site
POST /api/projects/:id/ai/match-styles
POST /api/projects/:id/ai/generate-concept
POST /api/projects/:id/ai/optimize-budget
POST /api/projects/:id/ai/recommend-plants
POST /api/projects/:id/ai/review-design
POST /api/projects/:id/ai/render-3d
```

#### 3.3 Paywall Analytics

```typescript
// Track paywall events for optimization
POST /api/analytics/paywall-view    // User saw paywall
POST /api/analytics/paywall-click   // User clicked upgrade
POST /api/analytics/paywall-convert // User completed payment
```

---

### Phase 4: Upgrade Flow

#### 4.1 Upgrade Endpoint

```typescript
// POST /api/projects/:id/upgrade
interface UpgradeRequest {
  targetTier: 1 | 2 | 3 | 4;
  paymentType: 'one_time' | 'subscription';
}

// Flow:
// 1. Create Stripe checkout session
// 2. On success webhook:
//    - Update project.tier
//    - Set project.aiActivated = true
//    - Set project.aiActivatedAt = now()
//    - Trigger welcome flow
//    - Queue initial AI analysis
```

#### 4.2 Tier Comparison Component

Frontend component showing:
- Current tier (Explorer/Free)
- What they've uploaded
- What each tier unlocks
- Personalized recommendation based on their uploads

---

### Phase 5: AI Sage Agent Implementation

#### 5.1 AI Service Architecture

```typescript
// server/src/services/sageAI/
├── index.ts              // Main orchestrator
├── siteAnalyzer.ts       // Analyze site photos/surveys
├── styleMatcher.ts       // Match inspiration to styles
├── conceptGenerator.ts   // Generate design concepts
├── budgetOptimizer.ts    // Budget recommendations
├── plantRecommender.ts   // Plant suggestions
├── designReviewer.ts     // Review uploaded designs
└── renderGenerator.ts    // 3D visualization

// Integration options:
// - OpenAI GPT-4 Vision for image analysis
// - Anthropic Claude for design reasoning
// - Midjourney/DALL-E for concept visualization
// - Custom ML models for plant/material matching
```

#### 5.2 AI Analysis Flow

```typescript
// When user triggers AI (post-paywall):
async function runSageAnalysis(projectId: string, feature: AIFeature) {
  // 1. Gather all relevant uploads
  const assets = await getProjectAssets(projectId);

  // 2. Run appropriate AI analysis
  const results = await sageAI.analyze(feature, assets);

  // 3. Store results
  await prisma.aIAnalysis.create({
    projectId,
    analysisType: feature,
    inputAssets: assets.map(a => a.id),
    results
  });

  // 4. Notify user
  await sendNotification(projectId, 'AI_ANALYSIS_COMPLETE', {
    feature,
    summaryUrl: `/projects/${projectId}/ai/${feature}`
  });

  return results;
}
```

---

### Phase 6: Frontend Changes

#### 6.1 New Pages/Components

```
kaa-app/src/
├── pages/
│   ├── StartFree.tsx           // Landing → free project creation
│   ├── ProjectDashboard.tsx    // Updated with paywall CTAs
│   ├── UpgradeModal.tsx        // Tier selection paywall
│   └── AIResults.tsx           // Display AI analysis results
├── components/
│   ├── PaywallBanner.tsx       // "Unlock AI" banner
│   ├── TierComparison.tsx      // Side-by-side tier features
│   ├── UploadProgress.tsx      // Show upload count, encourage more
│   └── AIFeaturePreview.tsx    // Teaser of what AI would show
```

#### 6.2 Paywall UX Patterns

**Soft Paywall** (Teaser):
- Show blurred/partial AI results
- "Upgrade to see full analysis"

**Hard Paywall** (Blocker):
- Feature completely locked
- Clear CTA to upgrade

**Progress Paywall** (Encouragement):
- "You've uploaded 5 photos. Upload 3 more for best AI results!"
- Builds engagement before monetization

---

## Migration Strategy

### Step 1: Add Tier 0 to Existing System
- Add `tier: 0` option to schema
- Create "Explorer" tier in Tier table
- Default new signups to tier 0

### Step 2: Split Project Creation
- New route for free project creation
- Keep existing paid flow for direct purchases
- Both create projects, different starting tiers

### Step 3: Add Paywall Infrastructure
- Create `requireAIAccess` middleware
- Add 402 responses for AI endpoints
- Build upgrade flow

### Step 4: Build AI Features (Iterative)
- Start with Site Analysis (highest value, easiest)
- Add Style Matching
- Build out remaining features over time

### Step 5: Migrate Existing Users
- Existing paid users → Keep their tier, `aiActivated: true`
- New users → Start at tier 0

---

## Success Metrics

### Conversion Funnel
1. **Visits** → Free project starts
2. **Free projects** → Assets uploaded
3. **Engaged users** (3+ uploads) → Paywall views
4. **Paywall views** → Upgrades
5. **Upgrades** → Tier selection

### Key Metrics to Track
- Free-to-paid conversion rate (target: 5-10%)
- Average uploads before conversion
- Most common paywall trigger
- Tier distribution of conversions
- Time from signup to conversion
- Upgrade path (which tier they choose)

---

## Pricing Rationale

| Tier | One-Time | Monthly | Why |
|------|----------|---------|-----|
| Explorer | $0 | $0 | Low barrier, build investment |
| Seedling | $49 | $29 | Impulse buy threshold, DIY market |
| Sprout | $149 | $79 | Mid-market sweet spot |
| Canopy | $349 | $149 | Premium self-service |
| White Glove | $2,500+ | Custom | High-touch requires human time |

**One-Time vs. Subscription**:
- One-time: Project-based buyers
- Subscription: Ongoing access, multiple projects

---

## Open Questions

1. **AI Provider**: Which AI services to use? (OpenAI, Anthropic, specialized APIs)
2. **Rendering**: Build in-house or integrate existing service?
3. **Free Tier Limits**: Any limits on uploads? Storage? Time?
4. **Trial Period**: Offer limited AI trial before payment?
5. **Refund Policy**: What if AI results don't meet expectations?

---

## Next Steps (Priority Order)

1. [ ] **Validate pricing** with target customers
2. [ ] **Design paywall UX** mockups
3. [ ] **Implement Tier 0** in database
4. [ ] **Build free project flow** (backend + frontend)
5. [ ] **Create paywall middleware**
6. [ ] **Build upgrade checkout flow**
7. [ ] **Implement first AI feature** (Site Analysis)
8. [ ] **Add analytics tracking**
9. [ ] **Launch beta** with select users
10. [ ] **Iterate based on data**

---

## Appendix: Feature Matrix

| Feature | Explorer | Seedling | Sprout | Canopy | White Glove |
|---------|----------|----------|--------|--------|-------------|
| Create Project | ✅ | ✅ | ✅ | ✅ | ✅ |
| Upload Assets | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Uploads | ✅ | ✅ | ✅ | ✅ | ✅ |
| AI Site Analysis | ❌ | ✅ | ✅ | ✅ | ✅ |
| AI Style Matching | ❌ | ✅ | ✅ | ✅ | ✅ |
| Recommendations PDF | ❌ | ✅ | ✅ | ✅ | ✅ |
| AI Concept Generation | ❌ | ❌ | ✅ | ✅ | ✅ |
| AI Budget Optimization | ❌ | ❌ | ✅ | ✅ | ✅ |
| AI Plant Recommendations | ❌ | ❌ | ✅ | ✅ | ✅ |
| Conceptual Floor Plans | ❌ | ❌ | ✅ | ✅ | ✅ |
| Basic 3D Renderings | ❌ | ❌ | ✅ | ✅ | ✅ |
| AI Design Feedback | ❌ | ❌ | ❌ | ✅ | ✅ |
| Advanced 3D Visualization | ❌ | ❌ | ❌ | ✅ | ✅ |
| Detailed Floor Plans | ❌ | ❌ | ❌ | ✅ | ✅ |
| Material Specifications | ❌ | ❌ | ❌ | ✅ | ✅ |
| Revision Rounds | 0 | 1 | 2 | 3 | Unlimited |
| Designer Calls | ❌ | ❌ | 1 | 2 | Unlimited |
| Priority Support | ❌ | ❌ | ❌ | ✅ | ✅ |
| Site Visits | ❌ | ❌ | ❌ | ❌ | ✅ |
| Contractor Coordination | ❌ | ❌ | ❌ | ❌ | ✅ |
| Dedicated Project Manager | ❌ | ❌ | ❌ | ❌ | ✅ |

---

*Document created: January 2026*
*Last updated: January 2026*
