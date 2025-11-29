import React from 'react';
import BookingSummary from './BookingSummary';
import BookingActions from './BookingActions';

interface BookingDetailsModalProps {
  booking: {
    id: string;
    standId: string;
    address: string;
    startDate: string;
    endDate: string;
    status: 'pending' | 'active' | 'completed' | 'cancelled';
    model: {
      name: string;
      description: string;
      priceMultiplier: number;
    };
    pricePerDay: number;
  };
  onClose: () => void;
  onCancel?: () => void;
  onModify?: () => void;
}

const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  booking,
  onClose,
  onCancel,
  onModify,
}) => {
  return (
    <div className="fixed inset-0 z-[1003] bg-black/50 flex items-start justify-center pt-24 px-4 pb-4">
      <div className="max-w-lg w-full max-h-[calc(100vh-120px)] overflow-y-auto bg-white rounded-lg shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Booking Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <BookingSummary booking={booking} />
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <BookingActions 
            status={booking.status}
            onCancel={onCancel}
            onModify={onModify}
          />
        </div>
      </div>
    </div>
  );
};

export default BookingDetailsModal;