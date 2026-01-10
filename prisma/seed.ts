/**
 * Prisma Database Seed
 * Seeds the database with initial data for development and testing.
 * 
 * Usage:
 *   npx prisma db seed
 *   npm run prisma:seed
 */

import { PrismaClient, UserType, LeadStatus, ProjectStatus, MilestoneStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================================================
// SEED DATA
// ============================================================================

const TIERS = [
  {
    id: 1,
    name: 'The Concept',
    description: 'DIY guidance for simple landscape projects',
    features: ['Property assessment guide', 'Plant selection checklist', 'Basic layout templates', 'Email support'],
  },
  {
    id: 2,
    name: 'The Builder',
    description: 'Complete design package with professional consultation',
    features: ['Everything in Tier 1', 'Custom design plans', 'Professional consultation', '2 revision rounds'],
  },
  {
    id: 3,
    name: 'The Concierge',
    description: 'Full-service design and project management',
    features: ['Everything in Tier 2', 'Contractor referrals', 'Project management', 'Unlimited revisions'],
  },
  {
    id: 4,
    name: 'KAA White Glove',
    description: 'Invitation-only luxury landscape architecture',
    features: ['Everything in Tier 3', 'Dedicated project team', 'Premium materials sourcing', 'Ongoing maintenance planning'],
  },
];

const TEST_USERS = [
  {
    email: 'admin@sage.design',
    password: 'AdminPassword123!',
    userType: UserType.ADMIN,
    tier: 4,
  },
  {
    email: 'team@sage.design',
    password: 'TeamPassword123!',
    userType: UserType.TEAM,
    tier: 3,
  },
  {
    email: 'client1@example.com',
    password: 'ClientPassword123!',
    userType: UserType.SAGE_CLIENT,
    tier: 1,
  },
  {
    email: 'client2@example.com',
    password: 'ClientPassword123!',
    userType: UserType.SAGE_CLIENT,
    tier: 2,
  },
  {
    email: 'client3@example.com',
    password: 'ClientPassword123!',
    userType: UserType.SAGE_CLIENT,
    tier: 3,
  },
];

const DEMO_LEADS = [
  {
    email: 'lead1@example.com',
    name: 'John Smith',
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
  console.log('🌱 Seeding tiers...');
  
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
  
  console.log(`   ✓ ${TIERS.length} tiers seeded`);
}

async function seedUsers() {
  console.log('🌱 Seeding users...');
  
  for (const userData of TEST_USERS) {
    const passwordHash = await bcrypt.hash(userData.password, 12);
    
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        passwordHash,
        userType: userData.userType,
        tier: userData.tier,
      },
      create: {
        email: userData.email,
        passwordHash,
        userType: userData.userType,
        tier: userData.tier,
      },
    });
  }
  
  console.log(`   ✓ ${TEST_USERS.length} users seeded`);
}

async function seedLeads() {
  console.log('🌱 Seeding leads...');
  
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
  
  console.log(`   ✓ ${DEMO_LEADS.length} leads seeded`);
}

async function seedDemoProject() {
  console.log('🌱 Seeding demo project...');
  
  // Find a client user
  const clientUser = await prisma.user.findFirst({
    where: { userType: UserType.SAGE_CLIENT },
  });
  
  if (!clientUser) {
    console.log('   ⚠ No client user found, skipping project seed');
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
        status: 'ACTIVE',
        projectAddress: '123 Demo Street, Portland, OR 97201',
      },
    });
  }
  
  // Check if demo project exists
  const existingProject = await prisma.project.findFirst({
    where: { clientId: client.id },
  });
  
  if (existingProject) {
    console.log('   ⚠ Demo project already exists, skipping');
    return;
  }
  
  // Create demo project
  const project = await prisma.project.create({
    data: {
      clientId: client.id,
      tier: client.tier,
      status: ProjectStatus.IN_PROGRESS,
      name: 'Demo Backyard Redesign',
      paymentStatus: 'paid',
    },
  });
  
  // Create milestones
  const milestones = [
    { name: 'Project Kickoff', order: 1, status: MilestoneStatus.COMPLETED },
    { name: 'Site Assessment', order: 2, status: MilestoneStatus.COMPLETED },
    { name: 'Concept Design', order: 3, status: MilestoneStatus.IN_PROGRESS },
    { name: 'Design Review', order: 4, status: MilestoneStatus.PENDING },
    { name: 'Final Delivery', order: 5, status: MilestoneStatus.PENDING },
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
  
  console.log('   ✓ Demo project with milestones seeded');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('');
  console.log('🚀 Starting database seed...');
  console.log('');
  
  await seedTiers();
  await seedUsers();
  await seedLeads();
  await seedDemoProject();
  
  console.log('');
  console.log('✅ Database seeding complete!');
  console.log('');
  console.log('Test accounts:');
  console.log('  Admin:  admin@sage.design / AdminPassword123!');
  console.log('  Team:   team@sage.design / TeamPassword123!');
  console.log('  Client: client1@example.com / ClientPassword123!');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
