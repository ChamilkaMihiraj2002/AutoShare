import React from 'react';

interface LoadingScreenProps {
  message?: string;
  fullHeight?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  fullHeight = false,
}) => {
  return (
    <div className={`w-full flex items-center justify-center ${fullHeight ? 'min-h-screen' : 'min-h-[280px]'}`}>
      <div className="flex flex-col items-center gap-3 text-gray-600">
        <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-[#003049] animate-spin" />
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
