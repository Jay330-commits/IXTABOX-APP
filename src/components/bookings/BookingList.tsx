import React from 'react';
import BookingCard from './BookingCard';

interface BookingListProps {
  bookings: Array<{
    id: string;
    standId: string;
    address: string;
    startDate: string;
    endDate: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    model: {
      name: string;
      priceMultiplier: number;
    };
    pricePerDay: number;
  }>;
  onBookingClick: (bookingId: string) => void;
}

const BookingList: React.FC<BookingListProps> = ({ bookings, onBookingClick }) => {
  if (bookings.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No bookings found</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {bookings.map((booking) => (
        <BookingCard
          key={booking.id}
          booking={booking}
          onClick={() => onBookingClick(booking.id)}
        />
      ))}
    </div>
  );
};

export default BookingList;