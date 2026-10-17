import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'primary';
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'warning'
}: ConfirmationModalProps) {
    const confirmButtonClass = {
        danger: 'bg-red-600 hover:bg-red-500 text-white',
        warning: 'bg-amber-600 hover:bg-amber-500 text-white',
        primary: 'bg-blue-600 hover:bg-blue-500 text-white'
    }[variant];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
            <div className="flex items-start space-x-3 mb-6">
                <div className="p-2.5 rounded-lg bg-amber-950/50 border border-amber-900/50 text-amber-400 shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="text-sm text-slate-300 leading-relaxed">
                    {message}
                </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                >
                    {cancelText}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        onConfirm();
                        onClose();
                    }}
                    className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors shadow-sm ${confirmButtonClass}`}
                >
                    {confirmText}
                </button>
            </div>
        </Modal>
    );
}
