import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { dbService } from '../supabase';
import { RenderedContract, ContractGenerationContext } from './types';
import {
  renderDefaultTemplate,
  buildFinancialTerms,
  formatFinancialTerms,
  buildTemplateRenderContext,
  renderTemplateBody,
} from './templates';
import { ContractTemplate, ContractTemplateType } from '../../types/contracts';

interface ContractGenerationOptions {
  templateId?: string | null;
  agencyId?: string | null;
  enforceTemplateFromDb?: boolean;
}

const loadTemplate = async (
  contractType: ContractTemplateType,
  usage: 'habitation' | 'professionnel' | null,
  options: ContractGenerationOptions,
): Promise<ContractTemplate | null> => {
  if (options.templateId) {
    const templates = await dbService.contractTemplates.getAll({ agency_id: options.agencyId ?? undefined });
    return templates.find((tpl) => tpl.id === options.templateId) ?? null;
  }

  const template = await dbService.contractTemplates.getLatest(contractType, usage, options.agencyId ?? undefined);
  return template ?? null;
};

const compileTemplate = (template: ContractTemplate, context: ContractGenerationContext): RenderedContract => {
  const financial = buildFinancialTerms(context);
  const formattedFinancial = formatFinancialTerms(financial, context);
  const effectiveDate = context.effectiveDate
    ? format(new Date(context.effectiveDate), 'dd MMMM yyyy', { locale: fr })
    : '';
  const endDate = context.endDate ? format(new Date(context.endDate), 'dd MMMM yyyy', { locale: fr }) : '';
  const generatedOn = format(new Date(), 'dd MMMM yyyy', { locale: fr });

  const renderContext = buildTemplateRenderContext(
    context,
    template.contract_type,
    financial,
    formattedFinancial,
    {
      effectiveDate,
      endDate,
      generatedOn,
    },
  );

  const html = renderTemplateBody(template.body, renderContext);

  return {
    templateId: template.id,
    contractType: template.contract_type,
    usageType: template.usage_type,
    title: template.name,
    html,
    variables: template.variables ?? [],
    financialTerms: financial,
    metadata: template.metadata ?? null,
  };
};

export const generateContractDocument = async (
  context: ContractGenerationContext,
  options: ContractGenerationOptions = {},
): Promise<RenderedContract> => {
  const usage = context.usageType ?? (context.property as any)?.usage_type ?? null;
  const template = await loadTemplate(context.contractType, usage as any, options);

  if (template && template.body) {
    return compileTemplate(template, context);
  }

  return renderDefaultTemplate(context.contractType, context);
};
