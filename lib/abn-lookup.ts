export const ABN_LOOKUP_GUID_ENV = 'ABR_GUID';
export const ABN_LOOKUP_URL =
  'https://abr.business.gov.au/abrxmlsearch/AbrXmlSearch.asmx/SearchByABNv202001';

export type AbnLookupData = {
  abn: string;
  businessName: string;
  entityStatus: string | null;
  addressLine1: string;
  addressLine2: string;
  suburb: string;
  state: string;
  postcode: string;
  formattedAddress: string;
};

export type ParsedAbnLookupResult =
  | { success: true; data: AbnLookupData }
  | { success: false; error: string };

const XML_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  quot: '"',
};

export function normalizeAbn(value: string) {
  return value.replace(/\D/g, '');
}

export function getAbnLookupGuidFromEnv(env: NodeJS.ProcessEnv) {
  return env[ABN_LOOKUP_GUID_ENV]?.trim() || null;
}

function decodeXml(value: string) {
  return value.replace(/&(#x?[0-9a-fA-F]+|amp|apos|gt|lt|quot);/g, (match, entity) => {
    if (entity in XML_ENTITIES) {
      return XML_ENTITIES[entity];
    }

    if (!entity.startsWith('#')) {
      return match;
    }

    const numericValue = entity.startsWith('#x')
      ? Number.parseInt(entity.slice(2), 16)
      : Number.parseInt(entity.slice(1), 10);

    return Number.isNaN(numericValue) ? match : String.fromCodePoint(numericValue);
  });
}

function cleanValue(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = decodeXml(value).replace(/\s+/g, ' ').trim();
  return trimmed || null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractBlocks(xml: string, tagName: string) {
  const pattern = new RegExp(
    `<(?:\\w+:)?${escapeRegExp(tagName)}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${escapeRegExp(tagName)}>`,
    'g'
  );

  return Array.from(xml.matchAll(pattern), (match) => match[1]);
}

function extractFirstValue(xml: string | null | undefined, tagName: string) {
  if (!xml) return null;

  const pattern = new RegExp(
    `<(?:\\w+:)?${escapeRegExp(tagName)}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${escapeRegExp(tagName)}>`,
    'i'
  );

  const match = xml.match(pattern);
  return cleanValue(match?.[1]);
}

function pickCurrentBlock(xml: string, tagName: string) {
  const blocks = extractBlocks(xml, tagName);
  if (blocks.length === 0) return null;

  return (
    blocks.find((block) => {
      const effectiveTo = extractFirstValue(block, 'effectiveTo');
      return !effectiveTo;
    }) ?? blocks[0]
  );
}

function pickBusinessName(xml: string) {
  const mainName = pickCurrentBlock(xml, 'mainName');
  const organisationName =
    extractFirstValue(mainName, 'organisationName') ??
    extractFirstValue(pickCurrentBlock(xml, 'businessName'), 'organisationName');

  if (organisationName) return organisationName;

  const legalName = pickCurrentBlock(xml, 'legalName');
  const fullName =
    extractFirstValue(legalName, 'fullName') ??
    [extractFirstValue(legalName, 'givenName'), extractFirstValue(legalName, 'familyName')]
      .filter(Boolean)
      .join(' ')
      .trim();

  return fullName || null;
}

function formatAddress(parts: Array<string | null>) {
  return parts.filter(Boolean).join(', ');
}

export function parseAbnLookupXml(xml: string): ParsedAbnLookupResult {
  const exception = pickCurrentBlock(xml, 'exception');
  if (exception) {
    return {
      success: false,
      error:
        extractFirstValue(exception, 'exceptionDescription') ??
        extractFirstValue(exception, 'message') ??
        'ABN lookup failed.',
    };
  }

  const abn = extractFirstValue(xml, 'identifierValue');
  const businessName = pickBusinessName(xml);
  const statusBlock = pickCurrentBlock(xml, 'entityStatus');
  const entityStatus =
    extractFirstValue(statusBlock, 'entityStatusCode') ??
    extractFirstValue(xml, 'entityStatusCode');

  const postalAddress = pickCurrentBlock(xml, 'mainPostalPhysicalAddress');
  const businessAddress = pickCurrentBlock(xml, 'mainBusinessPhysicalAddress');

  const addressLine1 = extractFirstValue(postalAddress, 'addressLine1') ?? '';
  const addressLine2 = extractFirstValue(postalAddress, 'addressLine2') ?? '';
  const suburb = extractFirstValue(postalAddress, 'suburb') ?? '';
  const state =
    extractFirstValue(postalAddress, 'stateCode') ??
    extractFirstValue(businessAddress, 'stateCode') ??
    '';
  const postcode =
    extractFirstValue(postalAddress, 'postcode') ??
    extractFirstValue(businessAddress, 'postcode') ??
    '';

  if (!abn || !businessName) {
    return {
      success: false,
      error: 'ABN lookup response did not include a usable business record.',
    };
  }

  return {
    success: true,
    data: {
      abn,
      businessName,
      entityStatus,
      addressLine1,
      addressLine2,
      suburb,
      state,
      postcode,
      formattedAddress: formatAddress([
        addressLine1,
        addressLine2,
        suburb,
        state,
        postcode,
      ]),
    },
  };
}
