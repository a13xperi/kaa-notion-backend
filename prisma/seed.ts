/**
 * SAGE MVP Database Seeding Script
 *
 * Run with: npx prisma db seed
 * Or directly: npx ts-node prisma/seed.ts
 */

import { PrismaClient, UserType, LeadStatus, ProjectStatus, MilestoneStatus, ClientStatus } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Password hashing (same as auth.ts)
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ========================================
  // 1. Create Tiers
  // ========================================
  console.log('📊 Creating tiers...');

  const tiers = [
    {
      id: 1,
      name: 'Seedling',
      description: 'Quick consultation and basic guidance for simple projects',
      features: JSON.stringify([
        '30-minute consultation',
        'Basic plant recommendations',
        'Simple layout sketch',
        'Email support'
      ]),
    },
    {
      id: 2,
      name: 'Sprout',
      description: 'Detailed design package for small to medium projects',
      features: JSON.stringify([
        '2 design consultations',
        'Detailed planting plan',
        'Material recommendations',
        '2 revision rounds',
        'Digital deliverables'
      ]),
    },
    {
      id: 3,
      name: 'Canopy',
      description: 'Full-service design for comprehensive landscape transformations',
      features: JSON.stringify([
        'Site visit included',
        'Complete design package',
        '3D visualization',
        'Contractor coordination',
        'Unlimited revisions',
        'Priority support'
      ]),
    },
    {
      id: 4,
      name: 'Forest',
      description: 'Premium white-glove service for luxury projects',
      features: JSON.stringify([
        'Dedicated designer',
        'Custom solutions',
        'Project management',
        'Vendor coordination',
        'Ongoing support',
        'VIP treatment'
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
  console.log('   ✅ Created 4 tiers\n');

  // ========================================
  // 2. Create Admin User
  // ========================================
  console.log('👤 Creating admin user...');

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@sage.com' },
    update: {},
    create: {
      email: 'admin@sage.com',
      name: 'SAGE Admin',
      passwordHash: hashPassword('Admin123!'),
      role: 'ADMIN',
      userType: UserType.ADMIN,
    },
  });
  console.log(`   ✅ Admin user: ${adminUser.email}\n`);

  // ========================================
  // 3. Create Team Member
  // ========================================
  console.log('👥 Creating team member...');

  const teamUser = await prisma.user.upsert({
    where: { email: 'designer@sage.com' },
    update: {},
    create: {
      email: 'designer@sage.com',
      name: 'Sarah Designer',
      passwordHash: hashPassword('Team123!'),
      role: 'TEAM',
      userType: UserType.TEAM,
    },
  });
  console.log(`   ✅ Team member: ${teamUser.email}\n`);

  // ========================================
  // 4. Create Sample Leads
  // ========================================
  console.log('📋 Creating sample leads...');

  const leads = [
    {
      email: 'john.doe@example.com',
      name: 'John Doe',
      projectAddress: '123 Oak Street, Portland, OR 97201',
      budgetRange: '2000-5000',
      timeline: '2-4_weeks',
      projectType: 'small_renovation',
      hasSurvey: true,
      hasDrawings: false,
      recommendedTier: 2,
      routingReason: 'Budget and timeline suggest Sprout tier',
      status: LeadStatus.NEW,
    },
    {
      email: 'jane.smith@example.com',
      name: 'Jane Smith',
      projectAddress: '456 Maple Avenue, Seattle, WA 98101',
      budgetRange: '15000-50000',
      timeline: '2-4_months',
      projectType: 'full_redesign',
      hasSurvey: true,
      hasDrawings: true,
      recommendedTier: 3,
      routingReason: 'Large project with existing documentation',
      status: LeadStatus.QUALIFIED,
    },
    {
      email: 'bob.wilson@example.com',
      name: 'Bob Wilson',
      projectAddress: '789 Pine Road, San Francisco, CA 94102',
      budgetRange: 'under_500',
      timeline: 'asap',
      projectType: 'consultation',
      hasSurvey: false,
      hasDrawings: false,
      recommendedTier: 1,
      routingReason: 'Quick consultation requested',
      status: LeadStatus.NEW,
    },
  ];

  for (const lead of leads) {
    await prisma.lead.upsert({
      where: { id: lead.email.replace('@', '-').replace('.', '-') },
      update: lead,
      create: lead,
    });
  }
  console.log(`   ✅ Created ${leads.length} sample leads\n`);

  // ========================================
  // 5. Create Demo Client with Project
  // ========================================
  console.log('🏠 Creating demo client with project...');

  // Create demo client user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo Client',
      passwordHash: hashPassword('Demo123!'),
      role: 'CLIENT',
      userType: UserType.SAGE_CLIENT,
      tier: 2,
    },
  });

  // Create client
  const demoClient = await prisma.client.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: {
      userId: demoUser.id,
      tier: 2,
      status: ClientStatus.ACTIVE,
      projectAddress: '100 Demo Street, Portland, OR 97201',
    },
  });

  // Create project
  const demoProject = await prisma.project.upsert({
    where: { id: 'demo-project-001' },
    update: {},
    create: {
      id: 'demo-project-001',
      clientId: demoClient.id,
      tier: 2,
      status: ProjectStatus.IN_PROGRESS,
      name: 'Demo Garden Redesign',
      projectAddress: '100 Demo Street, Portland, OR 97201',
      paymentStatus: 'paid',
    },
  });

  // Create milestones for the project
  const milestones = [
    { name: 'Intake', order: 1, status: MilestoneStatus.COMPLETED },
    { name: 'Initial Consultation', order: 2, status: MilestoneStatus.COMPLETED },
    { name: 'Design Draft', order: 3, status: MilestoneStatus.IN_PROGRESS },
    { name: 'Client Review', order: 4, status: MilestoneStatus.PENDING },
    { name: 'Revisions', order: 5, status: MilestoneStatus.PENDING },
    { name: 'Final Delivery', order: 6, status: MilestoneStatus.PENDING },
  ];

  for (const milestone of milestones) {
    await prisma.milestone.upsert({
      where: { id: `${demoProject.id}-milestone-${milestone.order}` },
      update: milestone,
      create: {
        id: `${demoProject.id}-milestone-${milestone.order}`,
        projectId: demoProject.id,
        tier: 2,
        ...milestone,
        completedAt: milestone.status === MilestoneStatus.COMPLETED ? new Date() : null,
      },
    });
  }

  console.log(`   ✅ Demo client: ${demoUser.email}`);
  console.log(`   ✅ Demo project: ${demoProject.name}`);
  console.log(`   ✅ Created ${milestones.length} milestones\n`);

  // ========================================
  // Summary
  // ========================================
  console.log('━'.repeat(50));
  console.log('🎉 Database seeding complete!\n');
  console.log('Test Accounts:');
  console.log('━'.repeat(50));
  console.log('Admin:    admin@sage.com     / Admin123!');
  console.log('Team:     designer@sage.com  / Team123!');
  console.log('Client:   demo@example.com   / Demo123!');
  console.log('━'.repeat(50));
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
