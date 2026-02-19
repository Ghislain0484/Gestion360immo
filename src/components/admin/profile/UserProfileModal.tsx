import React, { useState } from 'react';
import { X, User, Mail, Lock, Save, Camera } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/config';
import { toast } from 'react-hot-toast';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
    const { admin } = useAuth();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

    const [formData, setFormData] = useState({
        email: admin?.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const handleUpdateProfile = async () => {
        setLoading(true);
        try {
            // Mise à jour de l'email si changé
            if (formData.email !== admin?.email) {
                const { error } = await supabase.auth.updateUser({
                    email: formData.email,
                });

                if (error) throw error;
                toast.success('Email mis à jour avec succès. Vérifiez votre boîte mail pour confirmer.');
            } else {
                toast.info('Aucun changement détecté');
            }
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors de la mise à jour');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (formData.newPassword !== formData.confirmPassword) {
            toast.error('Les mots de passe ne correspondent pas');
            return;
        }

        if (formData.newPassword.length < 6) {
            toast.error('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: formData.newPassword,
            });

            if (error) throw error;

            toast.success('Mot de passe mis à jour avec succès');
            setFormData({
                ...formData,
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors de la mise à jour du mot de passe');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Mon Profil" size="lg">
            <div className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center justify-center">
                    <div className="relative">
                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-3xl font-bold shadow-lg">
                            {admin?.email?.charAt(0).toUpperCase() || 'A'}
                        </div>
                        <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white border-2 border-gray-200 shadow-md hover:bg-gray-50">
                            <Camera className="h-4 w-4 text-gray-600" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'profile'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <User className="h-4 w-4 inline mr-2" />
                        Profil
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'security'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Lock className="h-4 w-4 inline mr-2" />
                        Sécurité
                    </button>
                </div>

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <div className="space-y-4">
                        <Card className="p-4 bg-blue-50 border-blue-200">
                            <div className="flex items-start gap-3">
                                <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-blue-900">Adresse email</p>
                                    <p className="text-xs text-blue-700 mt-1">
                                        Utilisée pour la connexion et les notifications
                                    </p>
                                </div>
                            </div>
                        </Card>

                        <Input
                            label="Email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="admin@gestion360immo.com"
                        />

                        <div className="flex items-center justify-between pt-4 border-t">
                            <p className="text-sm text-gray-500">
                                Membre depuis {new Date(admin?.created_at || Date.now()).toLocaleDateString('fr-FR')}
                            </p>
                            <Button
                                variant="primary"
                                onClick={handleUpdateProfile}
                                isLoading={loading}
                                disabled={formData.email === admin?.email}
                            >
                                <Save className="h-4 w-4 mr-2" />
                                Enregistrer
                            </Button>
                        </div>
                    </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                    <div className="space-y-4">
                        <Card className="p-4 bg-orange-50 border-orange-200">
                            <div className="flex items-start gap-3">
                                <Lock className="h-5 w-5 text-orange-600 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-orange-900">Changement de mot de passe</p>
                                    <p className="text-xs text-orange-700 mt-1">
                                        Utilisez un mot de passe fort avec au moins 6 caractères
                                    </p>
                                </div>
                            </div>
                        </Card>

                        <Input
                            label="Nouveau mot de passe"
                            type="password"
                            value={formData.newPassword}
                            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                            placeholder="••••••••"
                        />

                        <Input
                            label="Confirmer le mot de passe"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            placeholder="••••••••"
                        />

                        {formData.newPassword && formData.confirmPassword && (
                            <div className="p-3 rounded-lg bg-gray-50">
                                <p className="text-sm text-gray-700">
                                    {formData.newPassword === formData.confirmPassword ? (
                                        <span className="text-green-600">✓ Les mots de passe correspondent</span>
                                    ) : (
                                        <span className="text-red-600">✗ Les mots de passe ne correspondent pas</span>
                                    )}
                                </p>
                            </div>
                        )}

                        <div className="flex items-center justify-end pt-4 border-t">
                            <Button
                                variant="primary"
                                onClick={handleUpdatePassword}
                                isLoading={loading}
                                disabled={
                                    !formData.newPassword ||
                                    !formData.confirmPassword ||
                                    formData.newPassword !== formData.confirmPassword
                                }
                            >
                                <Save className="h-4 w-4 mr-2" />
                                Changer le mot de passe
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};
