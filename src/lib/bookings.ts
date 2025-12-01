import { prisma } from '@/lib/prisma/prisma';
import { BookingStatus } from '@prisma/client';

/**
 * Sets the booking status based on the booking's start date
 * - If start date is in the future: sets status to Pending
 * - If start date is current or past: sets status to Active
 * 
 * @param bookingId - The ID of the booking to update
 * @returns The updated booking with the new status
 */
export async function setBookingStatus(bookingId: string) {
  // Fetch the booking to get the start_date
  const booking = await prisma.bookings.findUnique({
    where: { id: bookingId },
    select: { id: true, start_date: true },
  });

  if (!booking) {
    throw new Error(`Booking with id ${bookingId} not found`);
  }

  // Determine status based on start date
  const now = new Date();
  const startDate = new Date(booking.start_date);
  
  // If start date is in the future, set to Pending, otherwise Active
  const newStatus = startDate > now ? BookingStatus.Pending : BookingStatus.Active;

  // Update the booking status
  const updatedBooking = await prisma.bookings.update({
    where: { id: bookingId },
    data: { status: newStatus },
  });

  return updatedBooking;
}

