import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Switch } from "../ui/Switch";
import { Label } from "../ui/Label";
import { Loader2 } from "lucide-react";
import { NotificationSettings } from "../../types/db";

interface Props {
  settings: Partial<NotificationSettings>;
  onChange: (settings: Partial<NotificationSettings>) => void;
  onCancel: () => void;
  onSave: () => void;
  loading?: boolean;
}

export default function NotificationSettingsForm({
  settings,
  onChange,
  onCancel,
  onSave,
  loading = false,
}: Props) {
  const [open, setOpen] = useState(true);

  const handleChange = (key: keyof NotificationSettings, value: boolean) => {
    onChange({ ...settings, [key]: value });
  };

  const notificationTypes = [
    { key: "payment_reminder", label: "Rappels de paiement" },
    { key: "new_message", label: "Nouveaux messages" },
    { key: "contract_expiry", label: "Expiration de contrat" },
    { key: "new_interest", label: "Nouvelle manifestation d'intérêt" },
    { key: "property_update", label: "Mise à jour de propriété" },
  ] as const;

  const notificationChannels = [
    { key: "email", label: "Email" },
    { key: "push", label: "Notifications push" },
    { key: "sms", label: "SMS (urgences)" },
  ] as const;

  return (
    <Modal
      isOpen={open}
      onClose={() => {
        setOpen(false);
        onCancel();
      }}
      title="Paramètres des notifications"
      size="lg"
    >
      <div className="space-y-6">
        {/* Types de notifications */}
        <section>
          <h4 className="text-lg font-semibold text-gray-900 mb-3">
            Types de notifications
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            {notificationTypes.map((item) => (
              <Label
                key={item.key}
                className="flex items-center justify-between rounded-lg border p-3 cursor-pointer"
              >
                {item.label}
                <Switch
                  checked={!!settings[item.key]}
                  onChange={(v: boolean) => handleChange(item.key, v)}
                />
              </Label>
            ))}
          </div>
        </section>

        {/* Canaux de notifications */}
        <section>
          <h4 className="text-lg font-semibold text-gray-900 mb-3">
            Canaux de réception
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            {notificationChannels.map((item) => (
              <Label
                key={item.key}
                className="flex items-center justify-between rounded-lg border p-3 cursor-pointer"
              >
                {item.label}
                <Switch
                  checked={!!settings[item.key]}
                  onChange={(v: boolean) => handleChange(item.key, v)}
                />
              </Label>
            ))}
          </div>
        </section>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button onClick={onSave} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
