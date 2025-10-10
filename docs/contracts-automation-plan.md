# Contrats automatisés : plan d’implémentation

## 1. Objectifs
- Générer automatiquement trois types de contrats conformes au cadre OHADA / législation ivoirienne :
  - **Contrat de gestion** entre propriétaire (mandant) et agence (mandataire) lors de la création d’un propriétaire.
  - **Contrat de bail habitation** entre agence (mandataire du propriétaire) et locataire lorsque le locataire est affecté à un bien d’habitation.
  - **Contrat de bail professionnel** pour les biens à usage commercial / artisanal / industriel.
- Assurer la traçabilité des relations **propriétaire → biens → locataires**, avec gestion du cycle de vie (en cours, historique).
- Offrir une étape de prévisualisation/édition avant validation du contrat et un module de consultation avec filtres, statut, versioning.
- Archiver chaque contrat généré (PDF/HTML) prêt à être imprimé et signé.

## 2. Modèles contractuels
| Type | Déclencheur | Particularités |
|------|-------------|----------------|
| Contrat de gestion immobilière | Création d’un propriétaire | Contrat commercial (AUDCG), durée indéterminée résiliable avec préavis, commission (ex. 10 %) |
| Bail habitation | Association d’un locataire à un bien d’habitation | Durée minimale 1 an renouvelable, montage financier 5 mois (2 avance + 2 caution + 1 frais agence) |
| Bail professionnel | Association d’un locataire à un bien professionnel | Durée minimale 3 ans, clauses AUDCG (cession, indemnité d’éviction, etc.) |

> Les gabarits fournis doivent être stockés en base (table `contract_templates`) avec placeholders structurés (`{{owner.name}}`, `{{property.address}}`, etc.).

## 3. Modèle de données (supabase)
### Tables/colonnes à créer ou compléter
1. **owners**
   - Vérifier présence des champs (nom, adresse, contacts, registre). Ajouter si manquants.
2. **properties**
   - Champ `usage_type` (`habitation` | `professionnel`) pour déterminer le modèle de bail.
   - Relations: `owner_id`, `agency_id`.
3. **tenants**
   - Champs identité, adresse, statut (`active`, `historique`).
4. **contracts**
   - Colonnes proposées:
     - `id` (uuid)  
     - `contract_type` (`gestion`, `bail_habitation`, `bail_professionnel`)  
     - `owner_id`, `property_id`, `tenant_id`, `agency_id` (nullable selon type)  
     - `status` (`draft`, `generated`, `signed`, `archived`)  
     - `effective_date`, `end_date`, `renewal_date`  
     - `financial_terms` (jsonb : loyer, caution, commissions, etc.)  
     - `document_url` (fichier stocké)  
     - `template_version`
4. **contract_versions**
   - `contract_id`, `version_number`, `content`, `created_by`, `created_at`.
5. **contract_templates**
   - `name`, `contract_type`, `usage_type`, `language`, `body`, `placeholders`.
6. **owner_property_assignments**
   - Table pivot si plusieurs propriétaires -> même propriété (optionnel selon business).
7. **property_tenant_assignments**
   - `property_id`, `tenant_id`, `status`, `lease_start`, `lease_end`, `rent_amount`, `charges`, `created_by`.

### Indexes / contraintes
- Unicité : `property_tenant_assignments` (property_id, tenant_id, lease_start) pour éviter doublons.
- Vérifications :
  - `rent_amount > 0`.
  - `lease_end >= lease_start`.
  - `contract_type` cohérent avec champs requis (ex. bail habitation → `tenant_id` non nul).

## 4. Flux fonctionnels
1. **Création propriétaire**
   - Formulaire propriétaire → enregistrement DB.
   - Trigger (RPC ou service backend) qui instancie un `contract` type `gestion` :
     - Pré-remplir placeholders (commission par défaut 10 %, durée indéterminée…).
     - Générer version initiale (HTML/Markdown) et stocker en `contract_versions`.
     - Statut initial `draft`, `document_url` vide tant que PDF non généré.

2. **Association locataire ↔ bien**
   - Étape d’affectation (UI) sélectionne propriété, saisit loyer, caution, dates.
   - Service génère bail selon `usage_type`.
   - Calcul auto du montant total à la signature (5 mois de loyer) pour bail habitation.
   - Possibilité de sélectionner un modèle alternatif (ex. bail professionnel si usage).

3. **Prévisualisation et validation**
   - UI ouvre modal/tableau de bord “Contrat en attente”.
   - Affichage du document (HTML) + possibilité d’ajuster certaines clauses (ex. durée, spécificités charges).
   - Bouton “Valider & générer PDF” → convertit la version finalisée, met à jour `document_url`, `status = generated`.

4. **Module de gestion des contrats**
   - Liste paginée filtrable par type, statut, propriétaire, property, tenant, période.
   - Détails contrat : versions, historique, actions (télécharger PDF, dupliquer, clore).
   - Ajout d’un système de “versioning” : chaque modification crée une nouvelle entrée `contract_versions`.

## 5. Services & automatisations
1. **Service de templating**
   - Implémenter un utilitaire (ex. `renderContract(templateBody, context)`) pour remplacer placeholders.
   - Conserver un “mapping” commun de champs (`owner`, `property`, `agency`, `tenant`, `financial`).
2. **Génération PDF**
   - Option 1 : utilisation d’une librairie côté frontend (ex. `pdfmake`) puis upload vers Supabase Storage.
   - Option 2 : fonction Edge/Cloud (Supabase Functions, Vercel) pour rendre HTML → PDF (plus stable).
3. **Logique métier**
   - Créer hooks dans `dbService` (par ex. `contractsService.generateFromTemplate`) pour centraliser.
   - Garantir idempotence : éviter plusieurs contrats “gestion” pour le même propriétaire (statut actif unique).
4. **Notifications**
   - Toasts/UI pour informer de la génération.
   - Option future : email automatique avec contrat attaché (nécessite configuration SMTP).

## 6. UI / UX
1. **Formulaires**
   - Ajout de champs nécessaires (usage du bien, montant loyer, caution, frais).
2. **Modal de prévisualisation**
   - Composant réutilisable (affiche HTML, champs éditables, boutons valider/annuler).
3. **Page “Contrats”**
   - Filtres (type, statut, propriétaire, locataire).
   - Tableau + actions (voir, éditer, télécharger, archiver).
4. **Page “Relations”**
   - Visualisation propriétaire → biens → locataires.
   - Historique des affectations (locataires précédents).

## 7. Conformité & règles métiers
- Durée minimale bail habitation : 12 mois.
- Calcul automatique du montant initial (5 × loyer).
- Préavis : 3 mois (habitation), 6 mois (professionnel).
- Clause de bonne foi, références articles AUDCG (préciser dans template).
- Vérifier possibilité d’indemnité d’éviction (bail pro).
- Archivage : conserver toutes versions (traçabilité).

## 8. Roadmap proposée
1. **Phase 1 – Préparation données**
   - Migration Supabase (tables `contract_templates`, `contracts`, `contract_versions`, `property_tenant_assignments`).
   - Ajout champ `usage_type` sur propriété.
   - Insertion des modèles de contrat (seed script).
     - SQL proposé : `supabase/migrations/20251009_add_contract_infrastructure.sql` + seed `supabase/seeds/20251009_contract_templates_seed.sql`.
2. **Phase 2 – Services backend**
   - Implémenter `contractsService` (création/maj/fetch).
   - Utilitaire de templating + tests unitaires.
   - Service de génération PDF (première version HTML exportable).
3. **Phase 3 – UI/Workflow**
   - Upgrade formulaire propriétaire (déclencheur contrat gestion).
   - Interface d’affectation locataire ↔ bien avec génération bail.
   - Modal de prévisualisation + validation.
   - Page gestion des contrats (listing + détails).
4. **Phase 4 – Améliorations**
   - Stockage PDF, téléchargement.
   - Versioning avancé, archivage.
   - Notifications / e-mails.
   - Intégration signature électronique (optionnel futur).

## 9. Points à clarifier / validations
- Format final du document : HTML simple suffit-il ou besoin direct PDF ?
- Existe-t-il déjà des identifiants agence (raison sociale, RCCM) à injecter dans contrats ?
- Gestion multi-agences : un contrat de gestion par propriétaire par agence ?
- Processus de résiliation / renouvellement automatisé : à prévoir ?
- Besoin d’export légal (journal des contrats) pour contrôle administratif ?

---
Ce plan sert de référence pour démarrer l’implémentation incrémentale. Chaque phase peut être découpée en tickets techniques (migrations, services, composants UI) pour intégration continue.
