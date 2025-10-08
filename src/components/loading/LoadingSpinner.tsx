import React from 'react';

interface LoadingSpinnerProps {
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ text = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 z-[1002] flex flex-col items-center justify-center bg-black/70">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
        <p className="text-white text-lg font-medium">{text}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;