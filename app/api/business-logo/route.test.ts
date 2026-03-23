import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createServerClientMock,
  createAdminClientMock,
  getBucketMock,
  createBucketMock,
  uploadMock,
  getPublicUrlMock,
  fromMock,
} = vi.hoisted(() => {
  const getBucket = vi.fn();
  const createBucket = vi.fn();
  const upload = vi.fn();
  const getPublicUrl = vi.fn();
  const from = vi.fn(() => ({
    upload,
    getPublicUrl,
  }));

  return {
    createServerClientMock: vi.fn(),
    createAdminClientMock: vi.fn(),
    getBucketMock: getBucket,
    createBucketMock: createBucket,
    uploadMock: upload,
    getPublicUrlMock: getPublicUrl,
    fromMock: from,
  };
});

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}));

import { POST } from '@/app/api/business-logo/route';

function buildRequest(file?: File) {
  return {
    formData: vi.fn().mockResolvedValue({
      get: vi.fn((key: string) => (key === 'file' ? file ?? null : null)),
    }),
  } as unknown as Request;
}

describe('/api/business-logo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
    });

    getBucketMock.mockResolvedValue({
      data: { id: 'business-assets' },
      error: null,
    });
    createBucketMock.mockResolvedValue({ data: { name: 'business-assets' }, error: null });
    uploadMock.mockResolvedValue({ data: { path: 'user-1/logo-1700000000000.png' }, error: null });
    getPublicUrlMock.mockReturnValue({
      data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/business-assets/user-1/logo-1700000000000.png' },
    });

    createAdminClientMock.mockReturnValue({
      storage: {
        getBucket: getBucketMock,
        createBucket: createBucketMock,
        from: fromMock,
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

    const response = await POST(buildRequest(new File(['logo'], 'logo.png', { type: 'image/png' })));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('uploads a logo and returns its public URL when the bucket exists', async () => {
    const response = await POST(
      buildRequest(new File(['logo'], 'logo.png', { type: 'image/png' }))
    );

    expect(response.status).toBe(200);
    expect(getBucketMock).toHaveBeenCalledWith('business-assets');
    expect(createBucketMock).not.toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledWith('business-assets');
    expect(uploadMock).toHaveBeenCalledWith(
      'user-1/logo-1700000000000.png',
      expect.any(Uint8Array),
      {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true,
      }
    );
    await expect(response.json()).resolves.toEqual({
      url: 'https://example.supabase.co/storage/v1/object/public/business-assets/user-1/logo-1700000000000.png',
      path: 'user-1/logo-1700000000000.png',
    });
  });

  it('creates the bucket before uploading when storage is not set up yet', async () => {
    getBucketMock.mockResolvedValue({
      data: null,
      error: { message: 'Bucket not found' },
    });

    const response = await POST(
      buildRequest(new File(['logo'], 'logo.jpg', { type: 'image/jpeg' }))
    );

    expect(response.status).toBe(200);
    expect(createBucketMock).toHaveBeenCalledWith('business-assets', {
      public: true,
      fileSizeLimit: '3145728',
      allowedMimeTypes: ['image/png', 'image/jpeg'],
    });
    expect(uploadMock).toHaveBeenCalledWith(
      'user-1/logo-1700000000000.jpg',
      expect.any(Uint8Array),
      {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true,
      }
    );
  });

  it('returns a validation error for unsupported file types', async () => {
    const response = await POST(
      buildRequest(new File(['logo'], 'logo.gif', { type: 'image/gif' }))
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Logo must be a PNG or JPEG image.',
    });
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });
});
