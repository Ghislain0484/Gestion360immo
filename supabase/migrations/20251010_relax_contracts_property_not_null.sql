alter table public.contracts
  alter column property_id drop not null;

comment on column public.contracts.property_id is 'Peut être nul pour un contrat de gestion sans bien spécifique.';
