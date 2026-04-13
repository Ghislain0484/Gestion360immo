import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: string;
    itemTitle?: string;
    isLoading?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirmer la suppression",
    message = "Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.",
    itemTitle,
    isLoading = false
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                        <h4 className="text-red-900 font-bold text-sm">Action Irréversible</h4>
                        <p className="text-red-700 text-xs mt-0.5">
                            Cette action sera définitivement enregistrée dans le journal d'audit de l'agence.
                        </p>
                    </div>
                </div>

                <div className="py-2 text-center">
                    <p className="text-gray-600">
                        {message}
                    </p>
                    {itemTitle && (
                        <p className="font-bold text-gray-900 mt-2 text-lg">
                            "{itemTitle}"
                        </p>
                    )}
                </div>

                <div className="flex gap-3 pt-4">
                    <Button
                        variant="ghost"
                        className="flex-1"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Annuler
                    </Button>
                    <Button
                        variant="primary" 
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white border-none shadow-lg shadow-red-200"
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Suppression...
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Trash2 className="w-4 h-4" />
                                Confirmer la suppression
                            </div>
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
