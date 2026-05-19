import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createServerClientMock,
  createAdminClientMock,
  getBucketMock,
  createBucketMock,
  uploadMock,
  createSignedUrlMock,
  fromMock,
} = vi.hoisted(() => {
  const getBucket = vi.fn();
  const createBucket = vi.fn();
  const upload = vi.fn();
  const createSignedUrl = vi.fn();
  const from = vi.fn(() => ({
    upload,
    createSignedUrl,
  }));

  return {
    createServerClientMock: vi.fn(),
    createAdminClientMock: vi.fn(),
    getBucketMock: getBucket,
    createBucketMock: createBucket,
    uploadMock: upload,
    createSignedUrlMock: createSignedUrl,
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

const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]);

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
      data: { id: 'logos' },
      error: null,
    });
    createBucketMock.mockResolvedValue({ data: { name: 'logos' }, error: null });
    uploadMock.mockResolvedValue({ data: { path: 'user-1/logo-1700000000000.png' }, error: null });
    createSignedUrlMock.mockResolvedValue({
      data: {
        signedUrl:
          'https://example.supabase.co/storage/v1/object/sign/logos/user-1/logo-1700000000000.png?token=test',
      },
      error: null,
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

    const response = await POST(
      buildRequest(new File([PNG_BYTES], 'logo.png', { type: 'image/png' }))
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('uploads a logo and returns its public URL when the bucket exists', async () => {
    const response = await POST(
      buildRequest(new File([PNG_BYTES], 'logo.png', { type: 'image/png' }))
    );

    expect(response.status).toBe(200);
    expect(getBucketMock).toHaveBeenCalledWith('logos');
    expect(createBucketMock).not.toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledWith('logos');
    expect(uploadMock).toHaveBeenCalledWith(
      'user-1/logo-1700000000000.png',
      expect.any(Uint8Array),
      {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true,
      }
    );
    expect(createSignedUrlMock).toHaveBeenCalledWith(
      'user-1/logo-1700000000000.png',
      3600
    );
    await expect(response.json()).resolves.toEqual({
      path: 'logos/user-1/logo-1700000000000.png',
      signedUrl:
        'https://example.supabase.co/storage/v1/object/sign/logos/user-1/logo-1700000000000.png?token=test',
    });
  });

  it('creates the bucket before uploading when storage is not set up yet', async () => {
    getBucketMock.mockResolvedValue({
      data: null,
      error: { message: 'Bucket not found' },
    });

    const response = await POST(
      buildRequest(new File([JPEG_BYTES], 'logo.jpg', { type: 'image/jpeg' }))
    );

    expect(response.status).toBe(200);
    expect(createBucketMock).toHaveBeenCalledWith('logos', {
      public: false,
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

  it('rejects a spoofed PNG upload whose bytes are not an image', async () => {
    const response = await POST(
      buildRequest(new File(['not actually a png'], 'logo.png', { type: 'image/png' }))
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Logo must be a valid PNG or JPEG image.',
    });
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });
});
