/* eslint-disable @typescript-eslint/no-require-imports */
// Test Prisma connection
const { prisma } = require('./src/lib/prisma/prisma');

async function testConnection() {
  try {
    console.log('Testing Prisma connection...');
    
    // Test 1: Connect to database
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    // Test 2: Try a simple query
    const userCount = await prisma.public_users.count();
    console.log(`✅ Query successful! Found ${userCount} users in database.`);
    
    // Test 3: Check if we can read a table
    const firstUser = await prisma.public_users.findFirst();
    if (firstUser) {
      console.log(`✅ Can read users table! First user: ${firstUser.email || firstUser.id}`);
    } else {
      console.log('✅ Can read users table! (No users found yet)');
    }
    
    await prisma.$disconnect();
    console.log('\n🎉 All tests passed! Prisma is working correctly.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testConnection();

