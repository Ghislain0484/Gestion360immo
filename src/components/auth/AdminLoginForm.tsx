import React, { useState } from "react";
import { loginAdmin } from "../lib/auth";

const AdminLoginForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await loginAdmin(email.trim(), password);
    } catch (err: any) {
      const raw = err?.message || String(err);

      if (/invalid login credentials/i.test(raw)) {
        setError("Email ou mot de passe incorrect");
      } else if (/profil administrateur introuvable/i.test(raw)) {
        setError(
          "Profil administrateur introuvable. Vérifiez que ce compte est bien autorisé côté plateforme."
        );
      } else if (/jwt expired/i.test(raw)) {
        setError("Session expirée. Réessayez la connexion.");
      } else {
        setError(raw);
      }

      console.debug("Login admin error (raw):", raw);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-red-600 text-sm bg-red-100 p-2 rounded">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full border rounded p-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Mot de passe</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full border rounded p-2"
          required
        />
      </div>
      <button
        type="submit"
        disabled={!email || !password || isLoading}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {isLoading ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
};

export default AdminLoginForm;
