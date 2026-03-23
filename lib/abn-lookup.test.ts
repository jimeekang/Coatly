import { describe, expect, it } from 'vitest';
import { getAbnLookupGuidFromEnv, parseAbnLookupXml } from '@/lib/abn-lookup';

describe('parseAbnLookupXml', () => {
  it('parses organisation details from the current ABN record', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
      <ABRPayloadSearchResults>
        <response>
          <businessEntity202001>
            <ABN>
              <identifierValue>12345678901</identifierValue>
            </ABN>
            <entityStatus>
              <entityStatusCode>Active</entityStatusCode>
            </entityStatus>
            <mainName>
              <organisationName>Coastal Painting Pty Ltd</organisationName>
            </mainName>
            <mainPostalPhysicalAddress>
              <addressLine1>Level 2 18 Bridge St</addressLine1>
              <addressLine2>Suite 4</addressLine2>
              <suburb>Sydney</suburb>
              <stateCode>NSW</stateCode>
              <postcode>2000</postcode>
            </mainPostalPhysicalAddress>
          </businessEntity202001>
        </response>
      </ABRPayloadSearchResults>`;

    const result = parseAbnLookupXml(xml);

    expect(result).toEqual({
      success: true,
      data: {
        abn: '12345678901',
        businessName: 'Coastal Painting Pty Ltd',
        entityStatus: 'Active',
        addressLine1: 'Level 2 18 Bridge St',
        addressLine2: 'Suite 4',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
        formattedAddress: 'Level 2 18 Bridge St, Suite 4, Sydney, NSW, 2000',
      },
    });
  });

  it('falls back to a legal name and business location when no postal address is provided', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
      <ABRPayloadSearchResults>
        <response>
          <businessEntity202001>
            <ABN>
              <identifierValue>10987654321</identifierValue>
            </ABN>
            <legalName>
              <givenName>Jordan</givenName>
              <familyName>Painter</familyName>
            </legalName>
            <mainBusinessPhysicalAddress>
              <stateCode>VIC</stateCode>
              <postcode>3000</postcode>
            </mainBusinessPhysicalAddress>
          </businessEntity202001>
        </response>
      </ABRPayloadSearchResults>`;

    const result = parseAbnLookupXml(xml);

    expect(result).toEqual({
      success: true,
      data: {
        abn: '10987654321',
        businessName: 'Jordan Painter',
        entityStatus: null,
        addressLine1: '',
        addressLine2: '',
        suburb: '',
        state: 'VIC',
        postcode: '3000',
        formattedAddress: 'VIC, 3000',
      },
    });
  });

  it('returns ABR exception messages', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
      <ABRPayloadSearchResults>
        <response>
          <exception>
            <exceptionDescription>No records found</exceptionDescription>
          </exception>
        </response>
      </ABRPayloadSearchResults>`;

    expect(parseAbnLookupXml(xml)).toEqual({
      success: false,
      error: 'No records found',
    });
  });
});

describe('getAbnLookupGuidFromEnv', () => {
  it('reads ABR_GUID from the environment', () => {
    expect(
      getAbnLookupGuidFromEnv({
        ABR_GUID: 'guid-value',
      } as unknown as NodeJS.ProcessEnv)
    ).toBe('guid-value');
  });
});
