// Quick script to check if database enum is correct
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEnum() {
  try {
    // Try to query with each status
    await prisma.bookings.findFirst({
      where: { status: 'Upcoming' },
    });
    console.log('✅ Upcoming status works');

    await prisma.bookings.findFirst({
      where: { status: 'Active' },
    });
    console.log('✅ Active status works');

    await prisma.bookings.findFirst({
      where: { status: 'Completed' },
    });
    console.log('✅ Completed status works');

    await prisma.bookings.findFirst({
      where: { status: 'Cancelled' },
    });
    console.log('✅ Cancelled status works');

    // Try Confirmed (should fail)
    try {
      await prisma.bookings.findFirst({
        where: { status: 'Confirmed' },
      });
      console.log('❌ ERROR: Confirmed still exists!');
    } catch {
      console.log('✅ Confirmed correctly removed from enum');
    }

    console.log('\n✅ All enum values are correct!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkEnum();

