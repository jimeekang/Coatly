import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';
import { BUSINESS_LOGO_BUCKET } from '@/lib/supabase/storage';

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg']);
const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function getExtensionFromMimeType(mimeType: string) {
  return mimeType === 'image/png' ? 'png' : 'jpg';
}

function detectImageMimeType(bytes: Uint8Array) {
  const isPng = PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
  if (isPng) {
    return 'image/png';
  }

  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (isJpeg) {
    return 'image/jpeg';
  }

  return null;
}

async function ensureBusinessLogoBucket() {
  const admin = createAdminClient();
  const existingBucket = await admin.storage.getBucket(BUSINESS_LOGO_BUCKET);

  if (!existingBucket.error) {
    return admin;
  }

  const createResult = await admin.storage.createBucket(BUSINESS_LOGO_BUCKET, {
    public: false,
    fileSizeLimit: `${MAX_FILE_SIZE_BYTES}`,
    allowedMimeTypes: [...ALLOWED_MIME_TYPES],
  });

  if (
    createResult.error &&
    !/already exists/i.test(createResult.error.message ?? '')
  ) {
    throw new Error(createResult.error.message ?? 'Could not create business logo bucket.');
  }

  return admin;
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Logo file is required.' }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Logo must be a PNG or JPEG image.' },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'Logo must be 3MB or smaller.' },
      { status: 400 }
    );
  }

  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const detectedMimeType = detectImageMimeType(fileBytes);

  if (!detectedMimeType || detectedMimeType !== file.type) {
    return NextResponse.json(
      { error: 'Logo must be a valid PNG or JPEG image.' },
      { status: 400 }
    );
  }

  const filePath = `${user.id}/logo-${Date.now()}.${getExtensionFromMimeType(detectedMimeType)}`;

  try {
    const admin = await ensureBusinessLogoBucket();
    const { error: uploadError } = await admin.storage
      .from(BUSINESS_LOGO_BUCKET)
      .upload(filePath, fileBytes, {
        contentType: detectedMimeType,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Business logo upload failed', uploadError);
      return NextResponse.json(
        { error: 'Logo upload failed.' },
        { status: 500 }
      );
    }

    const { data: signedUrlData, error: signedUrlError } = await admin.storage
      .from(BUSINESS_LOGO_BUCKET)
      .createSignedUrl(filePath, 60 * 60);

    if (signedUrlError) {
      console.error('Business logo signed URL creation failed', signedUrlError);
      return NextResponse.json(
        { error: 'Logo upload completed but preview could not be prepared.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      path: `${BUSINESS_LOGO_BUCKET}/${filePath}`,
      signedUrl: signedUrlData.signedUrl,
    });
  } catch (error) {
    console.error('Business logo storage setup failed', error);
    return NextResponse.json(
      { error: 'Logo upload failed because storage is not configured.' },
      { status: 500 }
    );
  }
}
