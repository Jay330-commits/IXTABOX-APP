import React from 'react';

interface BookingSummaryProps {
  booking: {
    id: string;
    standId: string;
    address: string;
    startDate: string;
    endDate: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    model: {
      name: string;
      description: string;
      priceMultiplier: number;
    };
    pricePerDay: number;
  };
}

const BookingSummary: React.FC<BookingSummaryProps> = ({ booking }) => {
  const ms = new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime();
  const days = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  const totalPrice = days * booking.pricePerDay * booking.model.priceMultiplier;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-500">Booking Details</h3>
        <div className="mt-2 bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Booking ID</span>
            <span className="text-sm font-medium text-gray-900">{booking.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Stand</span>
            <span className="text-sm font-medium text-gray-900">#{booking.standId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Address</span>
            <span className="text-sm font-medium text-gray-900">{booking.address}</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-500">Model</h3>
        <div className="mt-2 bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Type</span>
            <span className="text-sm font-medium text-gray-900">{booking.model.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Description</span>
            <span className="text-sm font-medium text-gray-900">{booking.model.description}</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-500">Schedule</h3>
        <div className="mt-2 bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">From</span>
            <span className="text-sm font-medium text-gray-900">
              {new Date(booking.startDate).toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-sm text-gray-600">To</span>
            <span className="text-sm font-medium text-gray-900">
              {new Date(booking.endDate).toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-sm text-gray-600">Days</span>
            <span className="text-sm font-medium text-gray-900">{days}</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-500">Payment</h3>
        <div className="mt-2 bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Base Price</span>
            <span className="text-sm font-medium text-gray-900">${booking.pricePerDay.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Days</span>
            <span className="text-sm font-medium text-gray-900">{days}</span>
          </div>
          <div className="border-t border-gray-200 pt-3 flex justify-between">
            <span className="text-sm font-medium text-gray-900">Total</span>
            <span className="text-sm font-medium text-emerald-600">${totalPrice.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSummary;