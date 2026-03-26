
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-[4px] p-0 sm:p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl w-full max-w-lg flex flex-col max-h-[92dvh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 overflow-hidden" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header: Fixed */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 flex-none">
          <div>
            <h3 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h3>
            <div className="w-8 h-1 bg-[#008069] rounded-full mt-1"></div>
          </div>
          <button id="modal-close-btn" onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body: Scrollable */}
        <div className="p-6 overflow-y-auto flex-1 text-gray-700 bg-white">
          {children}
        </div>

        {/* Footer: Fixed */}
        {footer && (
          <div className="px-6 py-5 bg-gray-50 border-t border-gray-100 flex-none flex justify-end gap-3 rounded-b-none sm:rounded-b-[32px]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
