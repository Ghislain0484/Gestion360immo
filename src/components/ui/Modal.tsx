import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  noPadding?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  noPadding = false,
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

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className={cn(
          'relative w-full rounded-2xl border border-white/20 bg-white/95 shadow-2xl backdrop-blur-md transform transition-all animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 dark:border-slate-700 dark:bg-slate-900/95',
          sizeClasses[size]
        )}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-slate-800">
            {title && (
              <h3 className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-xl font-bold text-transparent dark:from-slate-100 dark:to-slate-300">
                {title}
              </h3>
            )}
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-gray-400 transition-all duration-200 hover:bg-gray-100/50 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className={cn(!noPadding && "p-6")}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
