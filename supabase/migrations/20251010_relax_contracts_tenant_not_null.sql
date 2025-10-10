alter table public.contracts
  alter column tenant_id drop not null;

comment on column public.contracts.tenant_id is 'Peut être nul lorsque le contrat ne concerne pas encore un locataire identifié.';
