import React from 'react';

interface BookingActionsProps {
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  onCancel?: () => void;
  onModify?: () => void;
}

const BookingActions: React.FC<BookingActionsProps> = ({ status, onCancel, onModify }) => {
  const canModify = status === 'pending' || status === 'confirmed';
  const canCancel = status === 'pending' || status === 'confirmed';

  return (
    <div className="flex gap-3">
      {canModify && (
        <button
          onClick={onModify}
          className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          Modify Booking
        </button>
      )}
      {canCancel && (
        <button
          onClick={onCancel}
          className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Cancel Booking
        </button>
      )}
    </div>
  );
};

export default BookingActions;