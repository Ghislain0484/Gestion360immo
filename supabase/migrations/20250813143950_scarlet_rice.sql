/*
  # Génération automatique de contrats OHADA

  1. Nouvelles fonctions
    - Génération automatique de contrats lors de création propriétaire/locataire
    - Templates conformes législation ivoirienne et OHADA
    - Numérotation automatique des contrats

  2. Triggers
    - Auto-génération contrat de gestion après création propriétaire
    - Auto-génération contrat de location après création locataire

  3. Conformité OHADA
    - Respect Code Civil ivoirien
    - Actes Uniformes OHADA
    - Clauses obligatoires incluses
*/

-- Fonction pour générer un numéro de contrat automatique
CREATE OR REPLACE FUNCTION generate_contract_number(
  agency_id_param uuid,
  contract_type_param text
) RETURNS text AS $$
DECLARE
  agency_code text;
  type_code text;
  year_month text;
  sequence_num integer;
  contract_number text;
BEGIN
  -- Récupérer le code agence (4 premières lettres du nom)
  SELECT UPPER(LEFT(REPLACE(name, ' ', ''), 4)) INTO agency_code
  FROM agencies WHERE id = agency_id_param;
  
  IF agency_code IS NULL THEN
    agency_code := 'AGEN';
  END IF;
  
  -- Code type de contrat
  type_code := CASE 
    WHEN contract_type_param = 'gestion' THEN 'GES'
    WHEN contract_type_param = 'location' THEN 'LOC'
    WHEN contract_type_param = 'vente' THEN 'VTE'
    ELSE 'CTR'
  END;
  
  -- Année et mois
  year_month := TO_CHAR(NOW(), 'YYYYMM');
  
  -- Séquence (nombre de contrats ce mois + 1)
  SELECT COUNT(*) + 1 INTO sequence_num
  FROM contracts 
  WHERE agency_id = agency_id_param 
    AND type = contract_type_param
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW());
  
  -- Construire le numéro
  contract_number := agency_code || '-' || type_code || '-' || year_month || '-' || LPAD(sequence_num::text, 4, '0');
  
  RETURN contract_number;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour générer automatiquement un contrat de gestion
CREATE OR REPLACE FUNCTION auto_generate_management_contract()
RETURNS TRIGGER AS $$
DECLARE
  contract_terms text;
  contract_number text;
  agency_info record;
BEGIN
  -- Récupérer les informations de l'agence
  SELECT name, address, phone, email, commercial_register
  INTO agency_info
  FROM agencies WHERE id = NEW.agency_id;
  
  -- Générer le numéro de contrat
  contract_number := generate_contract_number(NEW.agency_id, 'gestion');
  
  -- Générer les termes du contrat conforme OHADA
  contract_terms := 'CONTRAT DE MANDAT DE GESTION IMMOBILIÈRE

En application des dispositions du Code Civil ivoirien et de l''Acte Uniforme OHADA relatif au Droit Commercial Général

ENTRE LES SOUSSIGNÉS :

D''UNE PART,
' || UPPER(agency_info.name) || '
Société de gestion immobilière
Registre de Commerce : ' || agency_info.commercial_register || '
Siège social : ' || agency_info.address || '
Téléphone : ' || agency_info.phone || '
Email : ' || agency_info.email || '
Ci-après dénommée "L''AGENCE" ou "LE MANDATAIRE"

ET D''AUTRE PART,
Monsieur/Madame ' || UPPER(NEW.first_name) || ' ' || UPPER(NEW.last_name) || '
Domicilié(e) à : ' || NEW.address || '
Téléphone : ' || NEW.phone || '
' || CASE WHEN NEW.email IS NOT NULL THEN 'Email : ' || NEW.email ELSE '' END || '
Propriétaire de biens immobiliers
Titre de propriété : ' || UPPER(NEW.property_title) || '
' || CASE WHEN NEW.property_title_details IS NOT NULL THEN 'Détails : ' || NEW.property_title_details ELSE '' END || '
Ci-après dénommé(e) "LE MANDANT" ou "LE PROPRIÉTAIRE"

IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :

ARTICLE 1 - OBJET DU CONTRAT
Le PROPRIÉTAIRE donne mandat à L''AGENCE pour la gestion, l''administration et la mise en location de ses biens immobiliers, conformément aux dispositions légales en vigueur en Côte d''Ivoire et aux Actes Uniformes OHADA.

ARTICLE 2 - OBLIGATIONS DE L''AGENCE
L''AGENCE s''engage à :
- Rechercher des locataires solvables et de bonne moralité
- Établir les contrats de bail conformément à la législation ivoirienne
- Percevoir les loyers et charges pour le compte du PROPRIÉTAIRE
- Effectuer les reversements dans les délais convenus (10 jours ouvrables)
- Assurer le suivi des relations locatives
- Tenir une comptabilité détaillée des opérations

ARTICLE 3 - RÉMUNÉRATION
En contrepartie de ses services, L''AGENCE percevra une commission de 10% (dix pour cent) du montant des loyers encaissés, TTC.
Cette commission sera prélevée avant reversement au PROPRIÉTAIRE.

ARTICLE 4 - DURÉE ET RÉSILIATION
Le présent contrat est conclu pour une durée indéterminée.
Il peut être résilié par chacune des parties moyennant un préavis de trois (3) mois.

ARTICLE 5 - DROIT APPLICABLE
Le présent contrat est soumis au droit ivoirien et aux Actes Uniformes OHADA.

Fait à Abidjan, le ' || TO_CHAR(NOW(), 'DD/MM/YYYY') || '

LE PROPRIÉTAIRE                    L''AGENCE
' || NEW.first_name || ' ' || NEW.last_name || '                    ' || agency_info.name || '

Signature :                        Signature et cachet :';

  -- Insérer le contrat automatiquement
  INSERT INTO contracts (
    agency_id,
    owner_id,
    tenant_id,
    property_id,
    type,
    start_date,
    commission_rate,
    commission_amount,
    status,
    terms
  ) VALUES (
    NEW.agency_id,
    NEW.id,
    NULL,
    NULL,
    'gestion',
    CURRENT_DATE,
    10.0,
    0,
    'active',
    contract_terms
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour générer automatiquement un contrat de location
CREATE OR REPLACE FUNCTION auto_generate_rental_contract()
RETURNS TRIGGER AS $$
DECLARE
  contract_terms text;
  contract_number text;
  agency_info record;
  default_rent numeric := 350000;
  default_deposit numeric := 700000;
  default_charges numeric := 25000;
BEGIN
  -- Récupérer les informations de l'agence
  SELECT name, address, phone, email, commercial_register
  INTO agency_info
  FROM agencies WHERE id = NEW.agency_id;
  
  -- Générer le numéro de contrat
  contract_number := generate_contract_number(NEW.agency_id, 'location');
  
  -- Générer les termes du contrat conforme OHADA
  contract_terms := 'CONTRAT DE BAIL D''HABITATION

En application du Code Civil ivoirien, de la Loi n°96-669 du 29 août 1996 et des Actes Uniformes OHADA

ENTRE LES SOUSSIGNÉS :

D''UNE PART,
' || UPPER(agency_info.name) || '
Société de gestion immobilière
Registre de Commerce : ' || agency_info.commercial_register || '
Siège social : ' || agency_info.address || '
Téléphone : ' || agency_info.phone || '
Email : ' || agency_info.email || '
Agissant en qualité de mandataire du propriétaire
Ci-après dénommée "LE BAILLEUR"

ET D''AUTRE PART,
Monsieur/Madame ' || UPPER(NEW.first_name) || ' ' || UPPER(NEW.last_name) || '
Profession : ' || NEW.profession || '
Nationalité : ' || NEW.nationality || '
Domicilié(e) à : ' || NEW.address || '
Téléphone : ' || NEW.phone || '
' || CASE WHEN NEW.email IS NOT NULL THEN 'Email : ' || NEW.email ELSE '' END || '
Ci-après dénommé(e) "LE PRENEUR" ou "LE LOCATAIRE"

IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :

ARTICLE 1 - OBJET DE LA LOCATION
Le BAILLEUR donne à bail au PRENEUR qui accepte, un bien immobilier à usage d''habitation.
(Propriété à définir lors de l''attribution)

ARTICLE 2 - DESTINATION
Le bien loué est destiné exclusivement à l''habitation du PRENEUR et de sa famille.
Toute autre utilisation est formellement interdite.

ARTICLE 3 - DURÉE
Le présent bail est consenti pour une durée de 12 (douze) mois, renouvelable par tacite reconduction.

ARTICLE 4 - LOYER ET CHARGES
Le loyer mensuel est fixé à ' || default_rent || ' (trois cent cinquante mille) FRANCS CFA.
Les charges s''élèvent à ' || default_charges || ' (vingt-cinq mille) FRANCS CFA par mois.
Le loyer est payable d''avance, le 5 de chaque mois.

ARTICLE 5 - DÉPÔT DE GARANTIE
Le PRENEUR verse un dépôt de garantie de ' || default_deposit || ' (sept cent mille) FRANCS CFA.

ARTICLE 6 - OBLIGATIONS DU PRENEUR
Le PRENEUR s''engage à :
- Payer le loyer et charges aux échéances
- User du bien en bon père de famille
- Souscrire une assurance multirisques habitation
- Ne pas sous-louer sans autorisation

ARTICLE 7 - RÉSILIATION
Résiliation possible moyennant préavis de 3 mois pour le PRENEUR.

ARTICLE 8 - DROIT APPLICABLE
Contrat soumis au droit ivoirien et aux Actes Uniformes OHADA.

Fait à Abidjan, le ' || TO_CHAR(NOW(), 'DD/MM/YYYY') || '

LE PRENEUR                         LE BAILLEUR
' || NEW.first_name || ' ' || NEW.last_name || '                    ' || agency_info.name || '

Signature :                        Signature et cachet :';

  -- Insérer le contrat automatiquement
  INSERT INTO contracts (
    agency_id,
    owner_id,
    tenant_id,
    property_id,
    type,
    start_date,
    end_date,
    monthly_rent,
    deposit,
    charges,
    commission_rate,
    commission_amount,
    status,
    terms
  ) VALUES (
    NEW.agency_id,
    NULL,
    NEW.id,
    NULL,
    'location',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '12 months',
    default_rent,
    default_deposit,
    default_charges,
    10.0,
    default_rent * 0.1,
    'draft',
    contract_terms
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer les triggers pour génération automatique
DROP TRIGGER IF EXISTS trigger_auto_management_contract ON owners;
CREATE TRIGGER trigger_auto_management_contract
  AFTER INSERT ON owners
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_management_contract();

DROP TRIGGER IF EXISTS trigger_auto_rental_contract ON tenants;
CREATE TRIGGER trigger_auto_rental_contract
  AFTER INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_rental_contract();

-- Ajouter une colonne pour le numéro de contrat si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'contract_number'
  ) THEN
    ALTER TABLE contracts ADD COLUMN contract_number text UNIQUE;
  END IF;
END $$;

-- Mettre à jour les contrats existants avec des numéros
UPDATE contracts 
SET contract_number = 'AGEN-' || 
  CASE 
    WHEN type = 'gestion' THEN 'GES'
    WHEN type = 'location' THEN 'LOC'
    WHEN type = 'vente' THEN 'VTE'
    ELSE 'CTR'
  END || '-' ||
  TO_CHAR(created_at, 'YYYYMM') || '-' ||
  LPAD(ROW_NUMBER() OVER (PARTITION BY agency_id, type, DATE_TRUNC('month', created_at) ORDER BY created_at)::text, 4, '0')
WHERE contract_number IS NULL;