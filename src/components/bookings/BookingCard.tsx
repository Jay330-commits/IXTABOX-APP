import React from 'react';

interface BookingCardProps {
  booking: {
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
  };
  onClick: () => void;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, onClick }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Stand #{booking.standId}</h3>
          <p className="text-sm text-gray-600">{booking.address}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)} border`}>
          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Model</span>
          <span className="text-gray-900">{booking.model.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Dates</span>
          <span className="text-gray-900">
            {new Date(booking.startDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
            {" "}-{" "}
            {new Date(booking.endDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total</span>
          <span className="text-gray-900 font-medium">
            {(() => {
              const ms = new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime();
              const days = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
              const total = days * booking.pricePerDay * booking.model.priceMultiplier;
              return `$${total.toFixed(2)}`;
            })()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BookingCard;