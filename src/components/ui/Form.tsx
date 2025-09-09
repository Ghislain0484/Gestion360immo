// src/components/ui/Form.tsx
import {
  useFormContext,
  FormProvider,
  Controller,
  type UseFormReturn,
  type FieldValues,
} from 'react-hook-form';
import React from 'react';

// Composant Form (utilise FormProvider de react-hook-form)
export const Form = FormProvider;

// Composant FormField (utilise Controller pour gérer les champs contrôlés)
export const FormField = Controller;

// Composant FormItem (conteneur stylisé pour les champs)
export const FormItem = ({ children }: { children: React.ReactNode }) => (
  <div className="space-y-2">{children}</div>
);

// Composant FormLabel (étiquette stylisée)
export const FormLabel = ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
  <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700">
    {children}
  </label>
);

// Composant FormControl (conteneur pour les champs de formulaire)
export const FormControl = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

// Composant FormMessage (affichage des messages d'erreur)
export const FormMessage = ({ name }: { name?: string }) => {
  const { formState: { errors } } = useFormContext();
  const error = name && errors[name];
  return error ? (
    <p className="text-sm text-red-600">{error.message?.toString()}</p>
  ) : null;
};