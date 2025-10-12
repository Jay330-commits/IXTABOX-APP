"use client";

import { useState } from 'react';
import PaymentButton from './PaymentButton';

// Example component showing how to integrate payments into your booking flow
export default function PaymentExample() {
  const [selectedStand, setSelectedStand] = useState({
    id: '1',
    title: 'Stockholm Central',
    address: 'Central Station, 111 20 Stockholm',
    pricePerDay: 299.99,
  });

  const [bookingDetails, setBookingDetails] = useState({
    startDate: '2024-02-01',
    endDate: '2024-02-03',
    model: { name: 'IXTAbox Pro', priceMultiplier: 1.2 },
  });

  // Calculate total amount
  const calculateTotal = () => {
    const ms = new Date(bookingDetails.endDate).getTime() - new Date(bookingDetails.startDate).getTime();
    const days = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    return days * selectedStand.pricePerDay * bookingDetails.model.priceMultiplier;
  };

  const totalAmount = calculateTotal();

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-800 rounded-xl border border-white/10">
      <h2 className="text-2xl font-bold text-white mb-6">Booking Summary</h2>
      
      <div className="space-y-4 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-2">{selectedStand.title}</h3>
          <p className="text-gray-300 text-sm">{selectedStand.address}</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Model:</span>
              <span className="text-white ml-2">{bookingDetails.model.name}</span>
            </div>
            <div>
              <span className="text-gray-400">Price/Day:</span>
              <span className="text-white ml-2">${selectedStand.pricePerDay}</span>
            </div>
            <div>
              <span className="text-gray-400">Start Date:</span>
              <span className="text-white ml-2">{bookingDetails.startDate}</span>
            </div>
            <div>
              <span className="text-gray-400">End Date:</span>
              <span className="text-white ml-2">{bookingDetails.endDate}</span>
            </div>
          </div>
        </div>

        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-white">Total Amount:</span>
            <span className="text-2xl font-bold text-cyan-400">${totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <PaymentButton
          amount={totalAmount}
          currency="sek"
          standId={selectedStand.id}
          bookingId={`booking-${Date.now()}`}
          className="w-full"
        >
          Complete Payment
        </PaymentButton>
        
        <p className="text-xs text-gray-400 text-center">
          Secure payment powered by Stripe. Your payment information is encrypted and secure.
        </p>
      </div>
    </div>
  );
}
