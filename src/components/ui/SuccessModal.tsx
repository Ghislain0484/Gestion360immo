import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { CheckCircle, X } from 'lucide-react';
import { Button } from './Button';

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
    isOpen,
    onClose,
    title,
    message,
    actionLabel = "Fermer",
    onAction
}) => {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all border border-green-100">

                                <div className="flex justify-center mb-6">
                                    <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce-slow">
                                        <CheckCircle className="h-10 w-10 text-green-600" />
                                    </div>
                                </div>

                                <Dialog.Title
                                    as="h3"
                                    className="text-xl font-bold leading-6 text-gray-900 text-center mb-2"
                                >
                                    {title}
                                </Dialog.Title>

                                <div className="mt-2">
                                    <p className="text-sm text-gray-500 text-center">
                                        {message}
                                    </p>
                                </div>

                                <div className="mt-8 flex justify-center gap-3">
                                    <Button
                                        onClick={() => {
                                            if (onAction) onAction();
                                            else onClose();
                                        }}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        {actionLabel}
                                    </Button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};
