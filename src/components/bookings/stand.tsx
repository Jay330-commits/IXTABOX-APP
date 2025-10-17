import React from 'react';

interface StandDetailsProps {
  stand: {
    id: string;
    title: string;
    location: {
      address: string;
      coordinates?: {
        lat: number;
        lng: number;
      };
    };
    pricePerDay: number;
    imageUrl?: string;
    status: 'available' | 'booked' | 'maintenance';
    availableModels?: {
      id: string;
      name: string;
      priceMultiplier: number;
    }[];
    nextAvailableDate?: string; // For booked stands
  };
  onBook?: (standId: string, modelId?: string, startDate?: string, endDate?: string) => void;
  onClose?: () => void;
}

const StandDetails: React.FC<StandDetailsProps> = ({ stand, onBook, onClose }) => {
  const [selectedModel, setSelectedModel] = React.useState<string>('');
  const [startDate, setStartDate] = React.useState<string>('');
  const [endDate, setEndDate] = React.useState<string>('');
  const [startTime, setStartTime] = React.useState<string>('');
  const [endTime, setEndTime] = React.useState<string>('');

  const isTimeOrderValid = React.useMemo(() => {
    if (!startDate || !endDate || !startTime || !endTime) return true;
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    return end > start;
  }, [startDate, endDate, startTime, endTime]);
  
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-emerald-500';
      case 'booked':
        return 'bg-red-500';
      case 'maintenance':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'text-emerald-500';
      case 'booked':
        return 'text-red-500';
      case 'maintenance':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex">
      {/* Status color bar */}
      <div className={`w-2 ${getStatusColor(stand.status)}`} />
      
      <div className="flex-1">
        {/* Header Section */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Stand #{stand.id}</h2>
              <p className="text-sm text-gray-600">{stand.location.address}</p>
            </div>
            <div className="flex items-start gap-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusTextColor(stand.status)} border border-current`}>
                {stand.status.charAt(0).toUpperCase() + stand.status.slice(1)}
              </span>
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
          </div>
        </div>

        {/* Details Section */}
        <div className="px-6 py-4 space-y-4">
          <div>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {formatPrice(stand.pricePerDay)} per day
            </p>
          </div>
        </div>

        {/* Models Section */}
        {stand.availableModels && (
          <div className="px-6 py-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Select IXTAbox Model</h3>
            <div className="grid grid-cols-3 gap-3">
              {stand.availableModels.map((model) => (
                <label
                  key={model.id}
                  className={`relative flex flex-col p-3 border rounded-lg cursor-pointer hover:border-emerald-500 transition-colors
                    ${selectedModel === model.id 
                      ? 'border-emerald-500 bg-emerald-50' 
                      : 'border-gray-200'
                    }`}
                >
                  <input
                    type="radio"
                    name="model"
                    value={model.id}
                    checked={selectedModel === model.id}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-gray-900">{model.name}</span>
                  <span className="text-xs font-medium text-emerald-600 mt-1">
                    {model.priceMultiplier}x
                  </span>
                  {selectedModel === model.id && (
                    <div className="absolute top-2 right-2">
                      <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="px-6 py-4 border-t border-gray-200">
  <h3 className="text-sm font-medium text-gray-500 mb-3">Select Booking Period</h3>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div>
      <label className="block text-xs text-gray-500 mb-1">From</label>
      <input
        type="datetime-local"
        value={startDate ? `${startDate}T${startTime}` : ''}
        onChange={(e) => {
          const [date, time] = e.target.value.split('T');
          setStartDate(date);
          setStartTime(time);
        }}
        min={
          stand.status === 'booked'
            ? stand.nextAvailableDate
            : new Date().toISOString().slice(0, 16)
        }
        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                   focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-gray-900 bg-white"
      />
    </div>
    <div>
      <label className="block text-xs text-gray-500 mb-1">To</label>
      <input
        type="datetime-local"
        value={endDate ? `${endDate}T${endTime}` : ''}
        onChange={(e) => {
          const [date, time] = e.target.value.split('T');
          setEndDate(date);
          setEndTime(time);
        }}
        min={
          startDate
            ? `${startDate}T${startTime || '00:00'}`
            : new Date().toISOString().slice(0, 16)
        }
        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                   focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-gray-900 bg-white"
      />
    </div>
  </div>

  {!isTimeOrderValid && (
    <p className="mt-2 text-sm text-red-600">End time must be after start time.</p>
  )}
  {startDate && endDate && (
    <p className="mt-2 text-sm text-emerald-600">
      {new Date(`${startDate}T${startTime}`).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}{" "}
      –{" "}
      {new Date(`${endDate}T${endTime}`).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}
    </p>
  )}
  {stand.status === 'booked' && stand.nextAvailableDate && (
    <p className="mt-2 text-sm text-gray-500">
      Next available from: {new Date(stand.nextAvailableDate).toLocaleDateString()}
    </p>
  )}
</div>

        {/* Action Section */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={() => {
              if (onBook) {
                onBook(stand.id, selectedModel, startDate, endDate);
              }
              // Calculate total price based on days and model multiplier
              const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
              const modelMultiplier = selectedModel 
                ? stand.availableModels?.find(m => m.id === selectedModel)?.priceMultiplier || 1 
                : 1;
              const totalPrice = stand.pricePerDay * days * modelMultiplier;
              
              // Redirect to payment page with stand details
              window.location.href = `/payment?amount=${totalPrice}&currency=sek&standId=${stand.id}&startDate=${startDate}&endDate=${endDate}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}${selectedModel ? `&modelId=${selectedModel}` : ''}`;
            }}
            disabled={
              stand.status === 'maintenance' ||
              !startDate ||
              !endDate ||
              !startTime ||
              !endTime ||
              !isTimeOrderValid ||
              (stand.availableModels && !selectedModel) ||
              (startDate && endDate ? new Date(endDate) < new Date(startDate) : false)
            }
            className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
              ${
                stand.status !== 'maintenance' && startDate && endDate && (!stand.availableModels || selectedModel) && (new Date(endDate) >= new Date(startDate))
                  ? 'bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-500'
                  : 'bg-gray-400 cursor-not-allowed'
              }
              focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            {stand.status === 'maintenance' 
              ? 'Under Maintenance' 
              : !startDate 
                ? 'Select start date'
                : !endDate
                  ? 'Select end date'
                : stand.availableModels && !selectedModel
                  ? 'Select a Model'
                  : 'Book Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StandDetails;