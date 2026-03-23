import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerClientMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}));

import { GET } from '@/app/api/abn-lookup/route';

describe('/api/abn-lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ABR_GUID = 'test-guid';
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
    });
  });

  it('requires authentication', async () => {
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    });

    const response = await GET(new Request('http://localhost/api/abn-lookup?abn=12345678901'));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('validates ABN format before calling the upstream service', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(new Request('http://localhost/api/abn-lookup?abn=123'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'ABN must be 11 digits.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses ABR_GUID for upstream authentication', async () => {
    process.env.ABR_GUID = 'guid-from-env';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(`<?xml version="1.0" encoding="utf-8"?>
        <ABRPayloadSearchResults>
          <response>
            <businessEntity202001>
              <ABN><identifierValue>12345678901</identifierValue></ABN>
              <mainName><organisationName>Fallback Guid Painter</organisationName></mainName>
            </businessEntity202001>
          </response>
        </ABRPayloadSearchResults>`),
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(new Request('http://localhost/api/abn-lookup?abn=12345678901'));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: expect.stringContaining('authenticationGuid=guid-from-env'),
      }),
      expect.any(Object)
    );
  });

  it('returns parsed business details from the ABR service', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(`<?xml version="1.0" encoding="utf-8"?>
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
                  <organisationName>Harbour View Painting</organisationName>
                </mainName>
                <mainPostalPhysicalAddress>
                  <addressLine1>10 Bay Road</addressLine1>
                  <suburb>Manly</suburb>
                  <stateCode>NSW</stateCode>
                  <postcode>2095</postcode>
                </mainPostalPhysicalAddress>
              </businessEntity202001>
            </response>
          </ABRPayloadSearchResults>`),
      })
    );

    const response = await GET(new Request('http://localhost/api/abn-lookup?abn=12 345 678 901'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        abn: '12345678901',
        businessName: 'Harbour View Painting',
        entityStatus: 'Active',
        addressLine1: '10 Bay Road',
        addressLine2: '',
        suburb: 'Manly',
        state: 'NSW',
        postcode: '2095',
        formattedAddress: '10 Bay Road, Manly, NSW, 2095',
      },
    });
  });

  it('maps ABR not-found errors to 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(`<?xml version="1.0" encoding="utf-8"?>
          <ABRPayloadSearchResults>
            <response>
              <exception>
                <exceptionDescription>No records found</exceptionDescription>
              </exception>
            </response>
          </ABRPayloadSearchResults>`),
      })
    );

    const response = await GET(new Request('http://localhost/api/abn-lookup?abn=12345678901'));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'No records found' });
  });
});
