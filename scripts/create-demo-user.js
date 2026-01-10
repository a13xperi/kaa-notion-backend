const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createDemoUser() {
  try {
    const email = 'demo@sage.design';
    const password = 'Demo123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        userType: 'SAGE_CLIENT',
        tier: 2,
      },
      create: {
        email,
        passwordHash,
        userType: 'SAGE_CLIENT',
        tier: 2,
      },
    });

    console.log('\n✅ Demo user created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('User ID:', user.id);
    console.log('');
  } catch (error) {
    console.error('Error creating demo user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoUser();
