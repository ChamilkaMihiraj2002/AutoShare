import React from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnTo: string;
}

const AuthRequiredModal: React.FC<AuthRequiredModalProps> = ({ isOpen, onClose, returnTo }) => {
  const navigate = useNavigate();

  const handleNavigate = (path: '/signin' | '/signup') => {
    navigate(path, { state: { from: returnTo } });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sign in to continue">
      <div className="space-y-5">
        <p className="text-sm leading-6 text-gray-600">
          Please sign in or create an account before continuing with your booking.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => handleNavigate('/signin')}
            className="flex-1 rounded-xl bg-[#003049] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#002538]"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('/signup')}
            className="flex-1 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
          >
            Sign Up
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AuthRequiredModal;
