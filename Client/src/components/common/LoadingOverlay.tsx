import React from 'react';

interface LoadingOverlayProps {
  show: boolean;
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ show, message = 'Please wait...' }) => {
  if (!show) return null;

  return (
    <div className="absolute inset-0 z-[130] bg-white/75 backdrop-blur-[1px] flex items-center justify-center">
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-gray-200 shadow-sm text-gray-700">
        <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-[#003049] animate-spin" />
        <span className="text-sm font-semibold">{message}</span>
      </div>
    </div>
  );
};

export default LoadingOverlay;
