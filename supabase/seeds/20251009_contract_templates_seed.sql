insert into public.contract_templates (
  name,
  contract_type,
  usage_type,
  language,
  version,
  body,
  variables,
  metadata,
  is_active
)
values
(
  'Contrat de gestion immobilière standard',
  'gestion',
  null,
  'fr',
  1,
  $$<section style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; line-height: 1.6;">
  <header style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #1F2937; padding-bottom:16px; margin-bottom:24px;">
    <div>
      <h1 style="font-size:24px; color:#111827; margin:0;">Contrat de gestion immobilière</h1>
      <p style="margin:4px 0 0; font-size:14px; color:#4B5563;">{{agency.name}} — {{agency.registrationNumber}}</p>
      <p style="margin:0; font-size:14px; color:#4B5563;">{{agency.fullAddress}} | {{agency.phone}} | {{agency.email}}</p>
    </div>
    {{#agency.logoUrl}}
      <img src="{{agency.logoUrl}}" alt="Logo agence" style="max-height:72px; object-fit:contain;">
    {{/agency.logoUrl}}
  </header>

  <article>
    <p><strong>Le Mandant (Propriétaire) :</strong> {{owner.fullName}}, domicilié à {{owner.address}}.</p>
    <p><strong>Le Mandataire (Agence) :</strong> {{agency.name}}, représenté par {{agency.representativeName}}, enregistré sous {{agency.registrationNumber}}.</p>

    <h3 style="font-size:16px; color:#111827; margin-top:24px;">Article 1 - Objet</h3>
    <p>Gestion du bien {{property.description}} situé à {{property.fullAddress}}, comprenant la commercialisation, la sélection des locataires, la rédaction des baux, le recouvrement des loyers et l'entretien courant.</p>

    <h3 style="font-size:16px; color:#111827; margin-top:24px;">Article 2 - Durée</h3>
    <p>Contrat à durée indéterminée prenant effet le {{dates.effectiveDate}}, résiliable par chacune des parties avec un préavis de 3 mois (art. 6 et 24 AUDCG).</p>

    <h3 style="font-size:16px; color:#111827; margin-top:24px;">Article 3 - Rémunération</h3>
    <p>Commission fixée à {{financial.commissionRate}} du montant des loyers encaissés. La commission minimale mensuelle est de {{financial.commissionAmount}}.</p>

    <h3 style="font-size:16px; color:#111827; margin-top:24px;">Article 4 - Obligations du mandataire</h3>
    <ul>
      <li>Mettre en œuvre les actions de promotion et sélection des locataires.</li>
      <li>Rédiger et faire signer les contrats de location conformément aux normes OHADA.</li>
      <li>Encaisser les loyers, reverser le solde au mandant et fournir un relevé mensuel détaillé.</li>
      <li>Autorisation d'engager des réparations jusqu'à {{financial.maintenanceThreshold}} sans accord préalable.</li>
    </ul>

    <h3 style="font-size:16px; color:#111827; margin-top:24px;">Article 5 - Obligations du mandant</h3>
    <ul>
      <li>Fournir tous documents nécessaires à la gestion (titres de propriété, attestations).</li>
      <li>Prendre en charge les dépenses non couvertes par les loyers (travaux lourds, taxes foncières).</li>
      <li>Informer immédiatement le mandataire de tout changement affectant la propriété.</li>
    </ul>

    <h3 style="font-size:16px; color:#111827; margin-top:24px;">Article 6 - Responsabilité</h3>
    <p>Le mandataire n'est pas responsable des impayés locatifs s'il justifie de diligences raisonnables. Les cas de force majeure (art. 7 AUDCG) exonèrent toute responsabilité.</p>

    <h3 style="font-size:16px; color:#111827; margin-top:24px;">Article 7 - Résiliation</h3>
    <p>Résiliation anticipée possible en cas de faute grave ou d'inexécution. Les dommages et intérêts sont limités aux pertes prévisibles (art. 7-19 AUDCG).</p>

    <h3 style="font-size:16px; color:#111827; margin-top:24px;">Article 8 - Litiges</h3>
    <p>Compétence attribuée aux tribunaux de {{jurisdiction}}. Application du droit ivoirien et des Actes Uniformes OHADA.</p>

    <footer style="margin-top:32px;">
      <p>Fait à {{jurisdiction}}, le {{dates.generatedOn}}.</p>
      <table style="width:100%; margin-top:24px; text-align:center;">
        <tr>
          <td><strong>Le Mandant</strong><br><span style="font-size:12px;">{{owner.fullName}}</span></td>
          <td><strong>Le Mandataire</strong><br><span style="font-size:12px;">{{agency.name}}</span></td>
        </tr>
        <tr>
          <td style="padding-top:60px;">Signature</td>
          <td style="padding-top:60px;">Signature</td>
        </tr>
      </table>
    </footer>
  </article>
</section>$$,
  array[
    'agency.name',
    'agency.registrationNumber',
    'agency.fullAddress',
    'agency.phone',
    'agency.email',
    'agency.logoUrl',
    'agency.representativeName',
    'owner.fullName',
    'owner.address',
    'property.description',
    'property.fullAddress',
    'dates.effectiveDate',
    'dates.generatedOn',
    'jurisdiction',
    'financial.commissionRate',
    'financial.commissionAmount',
    'financial.maintenanceThreshold'
  ],
  jsonb_build_object('edition', '1.0'),
  true
),
(
  'Contrat de bail habitation OHADA',
  'bail_habitation',
  'habitation',
  'fr',
  1,
  $$<section style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; line-height: 1.6;">
  <header style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #059669; padding-bottom:16px; margin-bottom:24px;">
    <div>
      <h1 style="font-size:24px; color:#047857; margin:0;">Contrat de bail à usage d'habitation</h1>
      <p style="margin:4px 0 0; font-size:14px; color:#4B5563;">{{agency.name}} — {{agency.registrationNumber}}</p>
      <p style="margin:0; font-size:14px; color:#4B5563;">{{agency.fullAddress}} | {{agency.phone}} | {{agency.email}}</p>
    </div>
    {{#agency.logoUrl}}
      <img src="{{agency.logoUrl}}" alt="Logo agence" style="max-height:72px; object-fit:contain;">
    {{/agency.logoUrl}}
  </header>

  <article>
    <h2 style="font-size:18px; color:#047857; margin-bottom:12px;">Entre les soussignés</h2>
    <p><strong>Le Bailleur :</strong> {{agency.name}}, représenté par {{agency.representativeName}}, agissant en qualité de mandataire du propriétaire {{owner.fullName}}, domicilié à {{owner.address}}.</p>
    <p><strong>Le Locataire :</strong> {{tenant.fullName}}, demeurant à {{tenant.address}}.</p>

    <h3 style="font-size:16px; color:#047857; margin-top:24px;">Article 1 - Objet</h3>
    <p>Le présent contrat a pour objet la location d'un(e) {{property.description}} situé(e) à {{property.fullAddress}}, Côte d'Ivoire.</p>

    <h3 style="font-size:16px; color:#047857; margin-top:24px;">Article 2 - Durée</h3>
    <p>Le bail est conclu pour une durée de 12 (douze) mois à compter du {{dates.effectiveDate}} et prendra fin le {{dates.endDate}}. Il est renouvelable par tacite reconduction pour une durée équivalente sauf dénonciation avec un préavis de {{dates.renewalNoticeMonths}} mois.</p>

    <h3 style="font-size:16px; color:#047857; margin-top:24px;">Article 3 - Loyer et paiement</h3>
    <ul>
      <li>Loyer mensuel : <strong>{{financial.monthlyRent}}</strong>, payable le {{financial.paymentDay}} de chaque mois sur le compte indiqué par le bailleur.</li>
      <li>À la signature, le locataire règle :
        <ul>
          <li>Deux (2) mois de loyer d'avance : {{financial.advancePayment}}</li>
          <li>Deux (2) mois de caution : {{financial.securityDeposit}}</li>
          <li>Un (1) mois de frais d'agence : {{financial.agencyFees}}</li>
        </ul>
        <p><strong>Total dû à la signature : {{financial.totalDueAtSignature}}</strong></p>
      </li>
      <li>Le loyer est révisable annuellement par accord ou selon l'indice légal applicable.</li>
    </ul>

    <h3 style="font-size:16px; color:#047857; margin-top:24px;">Article 4 - Obligations du locataire</h3>
    <ul>
      <li>Utiliser le bien en bon père de famille.</li>
      <li>Régler les charges locatives (eau, électricité, abonnements).</li>
      <li>Ne pas sous-louer sans accord écrit du bailleur.</li>
      <li>Assurer les réparations locatives et l'entretien courant.</li>
    </ul>

    <h3 style="font-size:16px; color:#047857; margin-top:24px;">Article 5 - Obligations du bailleur</h3>
    <ul>
      <li>Mettre à disposition un bien en bon état d'usage.</li>
      <li>Assurer les réparations structurelles et gros travaux.</li>
      <li>Garantir la jouissance paisible du locataire.</li>
    </ul>

    <h3 style="font-size:16px; color:#047857; margin-top:24px;">Article 6 - Résiliation</h3>
    <p>Le bail peut être résilié de plein droit en cas de non-paiement du loyer ou de faute grave, après mise en demeure restée sans effet.</p>

    <h3 style="font-size:16px; color:#047857; margin-top:24px;">Article 7 - Litiges</h3>
    <p>Tout litige sera soumis aux tribunaux de {{jurisdiction}}, le droit ivoirien et les Actes uniformes OHADA étant applicables.</p>

    <footer style="margin-top:32px;">
      <p>Fait à {{jurisdiction}}, le {{dates.generatedOn}}.</p>
      <table style="width:100%; margin-top:24px; text-align:center;">
        <tr>
          <td><strong>Le Bailleur</strong><br><span style="font-size:12px;">{{agency.name}}</span></td>
          <td><strong>Le Locataire</strong><br><span style="font-size:12px;">{{tenant.fullName}}</span></td>
        </tr>
        <tr>
          <td style="padding-top:60px;">Signature</td>
          <td style="padding-top:60px;">Signature</td>
        </tr>
      </table>
    </footer>
  </article>
</section>$$,
  array[
    'agency.name',
    'agency.registrationNumber',
    'agency.fullAddress',
    'agency.phone',
    'agency.email',
    'agency.logoUrl',
    'agency.representativeName',
    'owner.fullName',
    'owner.address',
    'tenant.fullName',
    'tenant.address',
    'property.description',
    'property.fullAddress',
    'dates.effectiveDate',
    'dates.endDate',
    'dates.generatedOn',
    'dates.renewalNoticeMonths',
    'financial.monthlyRent',
    'financial.advancePayment',
    'financial.securityDeposit',
    'financial.agencyFees',
    'financial.totalDueAtSignature',
    'financial.paymentDay',
    'jurisdiction'
  ],
  jsonb_build_object('edition', '1.0'),
  true
),
(
  'Contrat de bail professionnel OHADA',
  'bail_professionnel',
  'professionnel',
  'fr',
  1,
  $$<section style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; line-height: 1.6;">
  <header style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #4C1D95; padding-bottom:16px; margin-bottom:24px;">
    <div>
      <h1 style="font-size:24px; color:#4C1D95; margin:0;">Contrat de bail à usage professionnel</h1>
      <p style="margin:4px 0 0; font-size:14px; color:#4B5563;">{{agency.name}} — {{agency.registrationNumber}}</p>
      <p style="margin:0; font-size:14px; color:#4B5563;">{{agency.fullAddress}} | {{agency.phone}} | {{agency.email}}</p>
    </div>
    {{#agency.logoUrl}}
      <img src="{{agency.logoUrl}}" alt="Logo agence" style="max-height:72px; object-fit:contain;">
    {{/agency.logoUrl}}
  </header>

  <article>
    <h2 style="font-size:18px; color:#4C1D95; margin-bottom:12px;">Entre les soussignés</h2>
    <p><strong>Le Bailleur :</strong> {{agency.name}}, représentant le propriétaire {{owner.fullName}}, domicilié à {{owner.address}}.</p>
    <p><strong>Le Preneur :</strong> {{tenant.fullName}}, enregistré au RCCM {{tenant.registrationNumber}}, siège social {{tenant.address}}.</p>

    <h3 style="font-size:16px; color:#4C1D95; margin-top:24px;">Article 1 - Objet</h3>
    <p>Location à usage {{property.usageLabel}} du local situé à {{property.fullAddress}}.</p>

    <h3 style="font-size:16px; color:#4C1D95; margin-top:24px;">Article 2 - Durée</h3>
    <p>Durée minimale de 3 ans à compter du {{dates.effectiveDate}}, renouvelable tacitement. Préavis de {{dates.renewalNoticeMonths}} mois pour non-renouvellement.</p>

    <h3 style="font-size:16px; color:#4C1D95; margin-top:24px;">Article 3 - Loyer</h3>
    <p>Loyer mensuel : {{financial.monthlyRent}} — révisable conformément à l'article 106 AUDCG. Modalités de paiement : {{financial.paymentTerms}}.</p>

    <h3 style="font-size:16px; color:#4C1D95; margin-top:24px;">Article 4 - Obligations</h3>
    <ul>
      <li><strong>Preneur :</strong> payer loyer et charges, maintenir le local en bon état, contracter une assurance couvrant son activité.</li>
      <li><strong>Bailleur :</strong> garantir la jouissance paisible, prendre en charge les réparations majeures, respecter l'obligation de bonne foi (art. 1 et 6 AUDCG).</li>
    </ul>

    <h3 style="font-size:16px; color:#4C1D95; margin-top:24px;">Article 5 - Cession & sous-location</h3>
    <p>Soumises à l'accord écrit du bailleur, conformément à l'article 115 AUDCG.</p>

    <h3 style="font-size:16px; color:#4C1D95; margin-top:24px;">Article 6 - Résiliation</h3>
    <p>Autorisé pour inexécution grave (art. 133 AUDCG) après mise en demeure restée sans effet. Indemnité d'éviction due en cas de refus de renouvellement sans motif légitime (art. 102).</p>

    <h3 style="font-size:16px; color:#4C1D95; margin-top:24px;">Article 7 - Litiges</h3>
    <p>Arbitrage OHADA possible, à défaut compétence des tribunaux de {{jurisdiction}}.</p>

    <footer style="margin-top:32px;">
      <p>Fait à {{jurisdiction}}, le {{dates.generatedOn}}.</p>
      <table style="width:100%; margin-top:24px; text-align:center;">
        <tr>
          <td><strong>Le Bailleur</strong><br><span style="font-size:12px;">{{agency.name}}</span></td>
          <td><strong>Le Preneur</strong><br><span style="font-size:12px;">{{tenant.fullName}}</span></td>
        </tr>
        <tr>
          <td style="padding-top:60px;">Signature</td>
          <td style="padding-top:60px;">Signature</td>
        </tr>
      </table>
    </footer>
  </article>
</section>$$,
  array[
    'agency.name',
    'agency.registrationNumber',
    'agency.fullAddress',
    'agency.phone',
    'agency.email',
    'agency.logoUrl',
    'owner.fullName',
    'owner.address',
    'tenant.fullName',
    'tenant.registrationNumber',
    'tenant.address',
    'property.usageLabel',
    'property.fullAddress',
    'dates.effectiveDate',
    'dates.generatedOn',
    'dates.renewalNoticeMonths',
    'jurisdiction',
    'financial.monthlyRent',
    'financial.paymentTerms'
  ],
  jsonb_build_object('edition', '1.0'),
  true
)
on conflict do nothing;
