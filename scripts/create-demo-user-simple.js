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
      update: { passwordHash },
      create: {
        email,
        passwordHash,
        userType: 'SAGE_CLIENT',
        tier: 2,
      },
    });

    console.log('\n✅ Demo user created!');
    console.log('📧 Email: demo@sage.design');
    console.log('🔑 Password: Demo123!');
    console.log('');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoUser();
