import React from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
  children,
}) => {
  if (!isOpen) return null;

  const icons = {
    danger: <AlertTriangle className="w-6 h-6 text-rose-400" />,
    warning: <AlertCircle className="w-6 h-6 text-amber-400" />,
    primary: <Info className="w-6 h-6 text-indigo-400" />,
  };

  const buttonStyles = {
    danger: 'bg-rose-600 hover:bg-rose-500 text-white focus:ring-rose-500',
    warning: 'bg-amber-600 hover:bg-amber-500 text-white focus:ring-amber-500',
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white focus:ring-indigo-500',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-zinc-800/80 border border-zinc-700/50 shrink-0">
                {icons[variant]}
              </div>
              <div>
                <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
                <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{description}</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="text-zinc-500 hover:text-zinc-200 p-1 rounded-md transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {children && <div className="mt-4">{children}</div>}
        </div>

        <div className="px-6 py-4 bg-zinc-950/60 border-t border-zinc-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/70 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors shadow-sm whitespace-nowrap shrink-0 disabled:opacity-50 flex items-center gap-2 ${buttonStyles[variant]}`}
          >
            {isLoading && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
