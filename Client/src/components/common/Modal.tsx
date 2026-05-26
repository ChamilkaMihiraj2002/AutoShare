import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidthClassName?: string;
    bodyClassName?: string;
}

const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    maxWidthClassName = 'max-w-lg',
    bodyClassName = '',
}) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-5"
            onClick={onClose}
        >
            <div
                className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[28px] bg-white shadow-xl animate-in fade-in zoom-in duration-200 ${maxWidthClassName}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-4 py-4 sm:px-6 sm:py-5">
                    <h2 className="pr-2 text-lg font-bold leading-tight text-gray-900 sm:text-xl">{title}</h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className={`overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 ${bodyClassName}`}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
