import React from 'react';
import PriceBreakdown from './PriceBreakdown';

interface BookingSummaryProps {
  booking: {
    id: string;
    bookingDisplayId?: string | null;
    standId: string;
    boxDisplayId?: string;
    standDisplayId?: string;
    address: string;
    startDate: string;
    endDate: string;
    status: 'upcoming' | 'active' | 'completed' | 'cancelled' | 'confirmed';
    model: {
      name: string;
      description: string;
      priceMultiplier: number;
    };
    pricePerDay: number;
    lockPin?: string | null;
    paymentId?: string;
    paymentStatus?: string | null;
    createdAt?: string;
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
            <span className="text-sm font-medium text-gray-900">
              {booking.bookingDisplayId || booking.id.slice(0, 8)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Stand ID</span>
            <span className="text-sm font-medium text-gray-900">#{booking.standDisplayId || booking.standId}</span>
          </div>
          {booking.boxDisplayId && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Box ID</span>
              <span className="text-sm font-medium text-gray-900">#{booking.boxDisplayId}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Address</span>
            <span className="text-sm font-medium text-gray-900">{booking.address}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Status</span>
            <span className={`text-sm font-medium ${
              booking.status === 'active' || booking.status === 'completed' ? 'text-green-600' :
              booking.status === 'upcoming' || booking.status === 'confirmed' ? 'text-yellow-600' :
              booking.status === 'cancelled' ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </span>
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
        <div className="mt-2 space-y-3">
          {booking.paymentId && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Payment ID</span>
                <span className="text-sm font-medium text-gray-900 font-mono text-xs">{booking.paymentId.slice(0, 8)}...</span>
              </div>
            </div>
          )}
          {booking.paymentStatus && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Payment Status</span>
                <span className={`text-sm font-medium ${
                  booking.paymentStatus === 'Completed' ? 'text-green-600' :
                  booking.paymentStatus === 'Pending' ? 'text-yellow-600' :
                  'text-gray-600'
                }`}>
                  {booking.paymentStatus}
                </span>
              </div>
            </div>
          )}
          <PriceBreakdown
            pricePerDay={booking.pricePerDay}
            days={days}
            modelMultiplier={booking.model.priceMultiplier}
            modelName={booking.model.name}
            currency="USD"
            showModelDetails={booking.model.priceMultiplier !== 1}
          />
        </div>
      </div>
      
      {booking.lockPin && (
        <div>
          <h3 className="text-sm font-medium text-gray-500">Access Information</h3>
          <div className="mt-2 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg p-4 border border-cyan-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Lock Access PIN</span>
              <span className="text-2xl font-bold text-cyan-600 font-mono">{booking.lockPin}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Use this PIN to access your box during the booking period.</p>
          </div>
        </div>
      )}
      
      {booking.createdAt && (
        <div>
          <h3 className="text-sm font-medium text-gray-500">Booking Information</h3>
          <div className="mt-2 bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Booked On</span>
              <span className="text-sm font-medium text-gray-900">
                {new Date(booking.createdAt).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingSummary;