/**
 * SAGE MVP Database Seeding Script
 * Seeds the database with initial data for development and testing.
 *
 * Usage:
 *   npx prisma db seed
 *   npm run prisma:seed
 */

import { PrismaClient, UserType, LeadStatus, ProjectStatus, MilestoneStatus, ClientStatus, PaymentStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================================================
// SEED DATA
// ============================================================================

const TIERS = [
  {
    id: 1,
    name: 'Seedling',
    description: 'Quick consultation and basic guidance for simple projects',
    features: [
      '30-minute consultation',
      'Basic plant recommendations',
      'Simple layout sketch',
      'Email support'
    ],
  },
  {
    id: 2,
    name: 'Sprout',
    description: 'Detailed design package for small to medium projects',
    features: [
      '2 design consultations',
      'Detailed planting plan',
      'Material recommendations',
      '2 revision rounds',
      'Digital deliverables'
    ],
  },
  {
    id: 3,
    name: 'Canopy',
    description: 'Full-service design for comprehensive landscape transformations',
    features: [
      'Site visit included',
      'Complete design package',
      '3D visualization',
      'Contractor coordination',
      'Unlimited revisions',
      'Priority support'
    ],
  },
  {
    id: 4,
    name: 'Forest',
    description: 'Premium white-glove service for luxury projects',
    features: [
      'Dedicated designer',
      'Custom solutions',
      'Project management',
      'Vendor coordination',
      'Ongoing support',
      'VIP treatment'
    ],
  },
];

const TEST_USERS = [
  {
    email: 'admin@sage.design',
    name: 'SAGE Admin',
    password: 'Admin123!',
    role: 'ADMIN',
    userType: UserType.ADMIN,
    tier: 4,
  },
  {
    email: 'team@sage.design',
    name: 'Sarah Designer',
    password: 'Team123!',
    role: 'TEAM',
    userType: UserType.TEAM,
    tier: 3,
  },
  {
    email: 'client1@example.com',
    name: 'Demo Client',
    password: 'Client123!',
    role: 'CLIENT',
    userType: UserType.SAGE_CLIENT,
    tier: 2,
  },
  {
    email: 'client2@example.com',
    name: 'Jane Smith',
    password: 'Client123!',
    role: 'CLIENT',
    userType: UserType.SAGE_CLIENT,
    tier: 3,
  },
];

const DEMO_LEADS = [
  {
    email: 'lead1@example.com',
    name: 'John Doe',
    projectAddress: '123 Oak Street, Portland, OR 97201',
    budgetRange: '$5,000 - $10,000',
    timeline: '3-6 months',
    projectType: 'Backyard redesign',
    hasSurvey: true,
    hasDrawings: false,
    recommendedTier: 2,
    routingReason: 'Medium budget with survey available',
    status: LeadStatus.NEW,
  },
  {
    email: 'lead2@example.com',
    name: 'Sarah Johnson',
    projectAddress: '456 Maple Avenue, Seattle, WA 98101',
    budgetRange: '$1,000 - $3,000',
    timeline: '1-3 months',
    projectType: 'Front yard landscaping',
    hasSurvey: false,
    hasDrawings: false,
    recommendedTier: 1,
    routingReason: 'Budget-conscious DIY candidate',
    status: LeadStatus.QUALIFIED,
  },
  {
    email: 'lead3@example.com',
    name: 'Michael Chen',
    projectAddress: '789 Pine Road, San Francisco, CA 94102',
    budgetRange: '$20,000+',
    timeline: '6+ months',
    projectType: 'Full property transformation',
    hasSurvey: true,
    hasDrawings: true,
    recommendedTier: 3,
    routingReason: 'High budget with complete documentation',
    status: LeadStatus.NEEDS_REVIEW,
  },
];

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function seedTiers() {
  console.log('   Seeding tiers...');

  for (const tier of TIERS) {
    await prisma.tier.upsert({
      where: { id: tier.id },
      update: {
        name: tier.name,
        description: tier.description,
        features: tier.features,
      },
      create: {
        id: tier.id,
        name: tier.name,
        description: tier.description,
        features: tier.features,
      },
    });
  }

  console.log(`   Created ${TIERS.length} tiers`);
}

async function seedUsers() {
  console.log('   Seeding users...');

  for (const userData of TEST_USERS) {
    const passwordHash = await bcrypt.hash(userData.password, 12);

    await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        name: userData.name,
        passwordHash,
        role: userData.role,
        userType: userData.userType,
        tier: userData.tier,
      },
      create: {
        email: userData.email,
        name: userData.name,
        passwordHash,
        role: userData.role,
        userType: userData.userType,
        tier: userData.tier,
      },
    });
  }

  console.log(`   Created ${TEST_USERS.length} users`);
}

async function seedLeads() {
  console.log('   Seeding leads...');

  for (const leadData of DEMO_LEADS) {
    const existingLead = await prisma.lead.findFirst({
      where: { email: leadData.email },
    });

    if (!existingLead) {
      await prisma.lead.create({
        data: leadData,
      });
    }
  }

  console.log(`   Created ${DEMO_LEADS.length} leads`);
}

async function seedDemoProject() {
  console.log('   Seeding demo project...');

  // Find a client user
  const clientUser = await prisma.user.findFirst({
    where: { userType: UserType.SAGE_CLIENT },
  });

  if (!clientUser) {
    console.log('   No client user found, skipping project seed');
    return;
  }

  // Check if client record exists
  let client = await prisma.client.findUnique({
    where: { userId: clientUser.id },
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        userId: clientUser.id,
        tier: clientUser.tier || 2,
        status: ClientStatus.ACTIVE,
        projectAddress: '100 Demo Street, Portland, OR 97201',
      },
    });
  }

  // Check if demo project exists
  const existingProject = await prisma.project.findFirst({
    where: { clientId: client.id },
  });

  if (existingProject) {
    console.log('   Demo project already exists, skipping');
    return;
  }

  // Create demo project
  const project = await prisma.project.create({
    data: {
      clientId: client.id,
      tier: client.tier,
      status: ProjectStatus.IN_PROGRESS,
      name: 'Demo Garden Redesign',
      projectAddress: '100 Demo Street, Portland, OR 97201',
      paymentStatus: 'paid',
    },
  });

  // Create payment record for demo project
  const existingPayment = await prisma.payment.findFirst({
    where: { projectId: project.id },
  });

  if (!existingPayment) {
    const tierPricing: Record<number, number> = {
      1: 29900,   // $299
      2: 149900,  // $1,499
      3: 499900,  // $4,999
    };

    await prisma.payment.create({
      data: {
        projectId: project.id,
        stripePaymentIntentId: `pi_demo_${Date.now()}`,
        stripeCheckoutSessionId: `cs_demo_${Date.now()}`,
        stripeCustomerId: `cus_demo_${Date.now()}`,
        amount: tierPricing[client.tier] || 149900,
        currency: 'usd',
        status: PaymentStatus.SUCCEEDED,
        tier: client.tier,
        paidAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      },
    });
    console.log('   Demo payment record created');
  }

  // Create milestones
  const milestones = [
    { name: 'Intake', order: 1, status: MilestoneStatus.COMPLETED },
    { name: 'Initial Consultation', order: 2, status: MilestoneStatus.COMPLETED },
    { name: 'Design Draft', order: 3, status: MilestoneStatus.IN_PROGRESS },
    { name: 'Client Review', order: 4, status: MilestoneStatus.PENDING },
    { name: 'Revisions', order: 5, status: MilestoneStatus.PENDING },
    { name: 'Final Delivery', order: 6, status: MilestoneStatus.PENDING },
  ];

  for (const milestone of milestones) {
    await prisma.milestone.create({
      data: {
        projectId: project.id,
        tier: project.tier,
        name: milestone.name,
        order: milestone.order,
        status: milestone.status,
        completedAt: milestone.status === MilestoneStatus.COMPLETED ? new Date() : undefined,
      },
    });
  }

  console.log(`   Demo project with ${milestones.length} milestones seeded`);
}

async function seedDemoPayments() {
  console.log('   Seeding additional demo payments...');

  // Create a few additional demo payment scenarios
  const demoPayments = [
    {
      leadEmail: 'lead1@example.com',
      tier: 2,
      amount: 149900,
      status: PaymentStatus.SUCCEEDED,
      projectName: 'Oak Street Garden',
      projectAddress: '123 Oak Street, Portland, OR 97201',
    },
    {
      leadEmail: 'lead2@example.com',
      tier: 1,
      amount: 29900,
      status: PaymentStatus.PENDING,
      projectName: 'Maple Avenue Landscaping',
      projectAddress: '456 Maple Avenue, Seattle, WA 98101',
    },
  ];

  for (const demoPayment of demoPayments) {
    // Check if lead exists
    const lead = await prisma.lead.findFirst({
      where: { email: demoPayment.leadEmail },
    });

    if (!lead) {
      continue;
    }

    // Check if a project already exists for this lead
    const existingProject = await prisma.project.findFirst({
      where: { leadId: lead.id },
    });

    if (existingProject) {
      // Check if payment exists
      const existingPayment = await prisma.payment.findFirst({
        where: { projectId: existingProject.id },
      });

      if (!existingPayment) {
        await prisma.payment.create({
          data: {
            projectId: existingProject.id,
            stripePaymentIntentId: `pi_demo_lead_${lead.id}`,
            stripeCheckoutSessionId: `cs_demo_lead_${lead.id}`,
            stripeCustomerId: `cus_demo_lead_${lead.id}`,
            amount: demoPayment.amount,
            currency: 'usd',
            status: demoPayment.status,
            tier: demoPayment.tier,
            paidAt: demoPayment.status === PaymentStatus.SUCCEEDED ? new Date() : undefined,
          },
        });
      }
    }
  }

  console.log('   Additional demo payments seeded');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('');
  console.log('Starting database seed...');
  console.log('');

  await seedTiers();
  await seedUsers();
  await seedLeads();
  await seedDemoProject();
  await seedDemoPayments();

  console.log('');
  console.log('Database seeding complete!');
  console.log('');
  console.log('Test accounts:');
  console.log('----------------------------------------');
  console.log('Admin:  admin@sage.design / Admin123!');
  console.log('Team:   team@sage.design / Team123!');
  console.log('Client: client1@example.com / Client123!');
  console.log('----------------------------------------');
  console.log('');
  console.log('Demo Payment Endpoints:');
  console.log('----------------------------------------');
  console.log('GET  /api/demo/status              - Check demo mode status');
  console.log('POST /api/demo/seed-lead           - Create a demo lead');
  console.log('POST /api/demo/checkout/create-session - Create mock checkout');
  console.log('POST /api/demo/checkout/complete   - Complete mock payment');
  console.log('POST /api/demo/full-flow           - Run complete demo flow');
  console.log('----------------------------------------');
  console.log('');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
