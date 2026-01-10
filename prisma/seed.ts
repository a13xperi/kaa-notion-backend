/**
 * Prisma Database Seed
 * Populates the database with initial test data for development.
 */

import { PrismaClient, UserType, LeadStatus, ProjectStatus, MilestoneStatus, ClientStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ============================================
  // TIER DEFINITIONS
  // ============================================
  console.log('Creating tier definitions...');
  
  const tiers = [
    {
      id: 1,
      name: 'SAGE Tier 1 - DIY Guidance',
      description: 'Self-guided landscape planning with expert resources',
      features: JSON.stringify([
        'Plant selection guide',
        'Layout templates',
        'Email support',
        'Resource library access',
      ]),
    },
    {
      id: 2,
      name: 'SAGE Tier 2 - Design Package',
      description: 'Professional design consultation and custom plan',
      features: JSON.stringify([
        'All Tier 1 features',
        'Custom design consultation',
        'Professional landscape plan',
        '2 revision rounds',
        'Plant list with sources',
      ]),
    },
    {
      id: 3,
      name: 'SAGE Tier 3 - Full Service',
      description: 'Complete design and project management',
      features: JSON.stringify([
        'All Tier 2 features',
        'Detailed construction documents',
        'Contractor coordination',
        'Project management',
        'Unlimited revisions',
        'On-site consultation',
      ]),
    },
    {
      id: 4,
      name: 'KAA Premium - White Glove',
      description: 'Invitation-only luxury landscape service',
      features: JSON.stringify([
        'All Tier 3 features',
        'Dedicated project manager',
        'Priority scheduling',
        'Concierge service',
        'Lifetime design support',
        'Exclusive material access',
      ]),
    },
  ];

  for (const tier of tiers) {
    await prisma.tier.upsert({
      where: { id: tier.id },
      update: tier,
      create: tier,
    });
  }

  // ============================================
  // ADMIN USER
  // ============================================
  console.log('Creating admin user...');
  
  const adminPasswordHash = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@sage.com' },
    update: {},
    create: {
      email: 'admin@sage.com',
      passwordHash: adminPasswordHash,
      userType: UserType.ADMIN,
      tier: 4,
    },
  });
  console.log(`  Admin: admin@sage.com / admin123`);

  // ============================================
  // TEAM USER
  // ============================================
  console.log('Creating team user...');
  
  const teamPasswordHash = await bcrypt.hash('team123', 12);
  const teamUser = await prisma.user.upsert({
    where: { email: 'team@sage.com' },
    update: {},
    create: {
      email: 'team@sage.com',
      passwordHash: teamPasswordHash,
      userType: UserType.TEAM,
      tier: 4,
    },
  });
  console.log(`  Team: team@sage.com / team123`);

  // ============================================
  // DEMO CLIENT USERS
  // ============================================
  console.log('Creating demo client users...');
  
  const clientPasswordHash = await bcrypt.hash('demo123', 12);

  // Tier 2 Client
  const tier2User = await prisma.user.upsert({
    where: { email: 'client2@demo.com' },
    update: {},
    create: {
      email: 'client2@demo.com',
      passwordHash: clientPasswordHash,
      userType: UserType.SAGE_CLIENT,
      tier: 2,
    },
  });

  const tier2Client = await prisma.client.upsert({
    where: { userId: tier2User.id },
    update: {},
    create: {
      userId: tier2User.id,
      tier: 2,
      status: ClientStatus.ACTIVE,
      projectAddress: '123 Garden Lane, Landscape City, CA 90210',
    },
  });
  console.log(`  Tier 2 Client: client2@demo.com / demo123`);

  // Tier 3 Client
  const tier3User = await prisma.user.upsert({
    where: { email: 'client3@demo.com' },
    update: {},
    create: {
      email: 'client3@demo.com',
      passwordHash: clientPasswordHash,
      userType: UserType.SAGE_CLIENT,
      tier: 3,
    },
  });

  const tier3Client = await prisma.client.upsert({
    where: { userId: tier3User.id },
    update: {},
    create: {
      userId: tier3User.id,
      tier: 3,
      status: ClientStatus.ACTIVE,
      projectAddress: '456 Oak Avenue, Design Town, CA 90211',
    },
  });
  console.log(`  Tier 3 Client: client3@demo.com / demo123`);

  // ============================================
  // DEMO LEADS
  // ============================================
  console.log('Creating demo leads...');

  const leads = [
    {
      email: 'newlead@example.com',
      name: 'John Smith',
      projectAddress: '789 Maple Street, Newtown, CA 90212',
      budgetRange: '$5,000 - $10,000',
      timeline: '3-6 months',
      projectType: 'BACKYARD_REDESIGN',
      hasSurvey: false,
      hasDrawings: false,
      recommendedTier: 2,
      routingReason: 'Budget and timeline suitable for Tier 2',
      status: LeadStatus.NEW,
    },
    {
      email: 'qualified@example.com',
      name: 'Jane Doe',
      projectAddress: '321 Pine Road, Qualtown, CA 90213',
      budgetRange: '$15,000 - $25,000',
      timeline: '1-3 months',
      projectType: 'FULL_PROPERTY',
      hasSurvey: true,
      hasDrawings: true,
      recommendedTier: 3,
      routingReason: 'Large budget with existing documentation',
      status: LeadStatus.QUALIFIED,
    },
    {
      email: 'premium@example.com',
      name: 'Robert Johnson',
      projectAddress: '999 Elite Boulevard, Luxuryville, CA 90214',
      budgetRange: '$50,000+',
      timeline: '6-12 months',
      projectType: 'ESTATE_DESIGN',
      hasSurvey: true,
      hasDrawings: true,
      recommendedTier: 4,
      routingReason: 'Premium budget, complex project - KAA candidate',
      status: LeadStatus.NEEDS_REVIEW,
    },
  ];

  for (const lead of leads) {
    await prisma.lead.create({
      data: lead,
    });
  }
  console.log(`  Created ${leads.length} demo leads`);

  // ============================================
  // DEMO PROJECT WITH MILESTONES
  // ============================================
  console.log('Creating demo project...');

  const demoProject = await prisma.project.create({
    data: {
      clientId: tier2Client.id,
      tier: 2,
      status: ProjectStatus.IN_PROGRESS,
      name: 'Backyard Oasis Design',
      paymentStatus: 'paid',
    },
  });

  // Create milestones for the project
  const milestones = [
    { name: 'Project Kickoff', order: 1, status: MilestoneStatus.COMPLETED, completedAt: new Date('2026-01-05') },
    { name: 'Site Analysis', order: 2, status: MilestoneStatus.COMPLETED, completedAt: new Date('2026-01-09') },
    { name: 'Concept Design', order: 3, status: MilestoneStatus.IN_PROGRESS },
    { name: 'Design Review', order: 4, status: MilestoneStatus.PENDING },
    { name: 'Final Delivery', order: 5, status: MilestoneStatus.PENDING },
  ];

  for (const milestone of milestones) {
    await prisma.milestone.create({
      data: {
        projectId: demoProject.id,
        tier: 2,
        ...milestone,
      },
    });
  }
  console.log(`  Created project with ${milestones.length} milestones`);

  // ============================================
  // DEMO PAYMENT
  // ============================================
  console.log('Creating demo payment...');

  await prisma.payment.create({
    data: {
      projectId: demoProject.id,
      stripePaymentIntentId: 'pi_demo_' + Date.now(),
      stripeCustomerId: 'cus_demo_' + Date.now(),
      amount: 149900, // $1,499.00
      currency: 'usd',
      status: 'SUCCEEDED',
      tier: 2,
    },
  });

  // ============================================
  // SUMMARY
  // ============================================
  console.log('');
  console.log('✅ Database seeded successfully!');
  console.log('');
  console.log('Test Accounts:');
  console.log('  Admin:    admin@sage.com / admin123');
  console.log('  Team:     team@sage.com / team123');
  console.log('  Client 2: client2@demo.com / demo123');
  console.log('  Client 3: client3@demo.com / demo123');
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
