/**
 * Utilities to produce agency-specific reference codes for receipts and related entities.
 */

interface IndexedEntity {
  id: string;
  created_at?: string | null;
}

type IndexMap = Map<string, number>;

const normalizeDate = (value?: string | null): number => {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const buildIndexMap = (items: IndexedEntity[]): IndexMap => {
  const sorted = [...items].sort((a, b) => {
    const dateDelta = normalizeDate(a.created_at) - normalizeDate(b.created_at);
    if (dateDelta !== 0) return dateDelta;
    return a.id.localeCompare(b.id);
  });

  return sorted.reduce<IndexMap>((map, item, idx) => {
    map.set(item.id, idx + 1);
    return map;
  }, new Map());
};

const padSegment = (value: number): string => value.toString().padStart(3, '0');

const buildFallbackSegment = (id: string, prefix: string): string =>
  `${prefix}${id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'XXX'}`;

const makeSegment = (
  prefix: string,
  index: number | undefined,
  id?: string | null,
): string | null => {
  if (index && Number.isFinite(index)) {
    return `${prefix}${padSegment(index)}`;
  }
  if (id) {
    return buildFallbackSegment(id, prefix);
  }
  return null;
};

export interface ReferenceCodeInputs {
  tenantId?: string | null;
  propertyId?: string | null;
  ownerId?: string | null;
}

export interface ReferenceCodeMaps {
  tenants: IndexMap;
  properties: IndexMap;
  owners: IndexMap;
}

export const computeReferenceCode = (
  { tenantId, propertyId, ownerId }: ReferenceCodeInputs,
  { tenants, properties, owners }: ReferenceCodeMaps,
): string | null => {
  if (!tenantId && !propertyId && !ownerId) return null;

  const tenantSegment = tenantId
    ? makeSegment('LOC', tenants.get(tenantId), tenantId)
    : null;
  const propertySegment = propertyId
    ? makeSegment('BIEN', properties.get(propertyId), propertyId)
    : null;
  const ownerSegment = ownerId
    ? makeSegment('PROP', owners.get(ownerId), ownerId)
    : null;

  const segments = [tenantSegment, propertySegment, ownerSegment].filter(
    (segment): segment is string => Boolean(segment),
  );

  return segments.length ? segments.join('/') : null;
};

export const createReferenceCodeMaps = (params: {
  tenants: IndexedEntity[];
  properties: IndexedEntity[];
  owners: IndexedEntity[];
}): ReferenceCodeMaps => ({
  tenants: buildIndexMap(params.tenants),
  properties: buildIndexMap(params.properties),
  owners: buildIndexMap(params.owners),
});
