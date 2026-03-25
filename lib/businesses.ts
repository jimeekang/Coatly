import type { User } from '@supabase/supabase-js';
import { createSignedStorageUrl } from '@/lib/supabase/storage';
import { businessUpdateSchema, type BusinessUpdateInput } from '@/lib/supabase/validators';
import { createServerClient } from '@/lib/supabase/server';

type AppSupabaseClient = Awaited<ReturnType<typeof createServerClient>>;

type ProfileFallbackRecord = {
  business_name: string | null;
  abn: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
};

type BusinessRow = {
  user_id: string;
  name: string;
  abn: string | null;
  address: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
};

export type BusinessFormValues = {
  name: string;
  abn: string;
  addressLine1: string;
  city: string;
  state: string;
  postcode: string;
  phone: string;
  email: string;
  logoUrl: string;
  logoPreviewUrl: string;
};

export type BusinessDocumentBranding = {
  name: string;
  abn: string | null;
  phone: string | null;
  email: string | null;
  logoPath: string | null;
  logoUrl: string | null;
};

type ParsedBusinessInput =
  | {
      success: true;
      data: {
        name: string;
        abn: string | null;
        address: string | null;
        address_line1: string | null;
        city: string | null;
        state: string | null;
        postcode: string | null;
        phone: string | null;
        email: string | null;
        logo_url: string | null;
      };
    }
  | {
      success: false;
      error: string;
    };

function hasMissingBusinessesColumn(error: { message?: string } | null, column: string) {
  const message = error?.message ?? '';

  return (
    message.includes(`businesses.${column}`) ||
    message.includes(`'${column}' column of 'businesses'`) ||
    message.includes(`column "${column}" of relation "businesses"`)
  );
}

function formatStructuredAddress(input: {
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
}) {
  return [
    input.addressLine1?.trim() ?? '',
    input.city?.trim() ?? '',
    input.state?.trim() ?? '',
    input.postcode?.trim() ?? '',
  ]
    .filter(Boolean)
    .join(', ');
}

function toFormValues({
  business,
  profile,
  fallbackEmail,
  logoUrl,
  logoPreviewUrl,
}: {
  business: BusinessRow | null;
  profile: ProfileFallbackRecord | null;
  fallbackEmail: string | null;
  logoUrl: string;
  logoPreviewUrl: string;
}): BusinessFormValues {
  if (business) {
    return {
      name: business.name,
      abn: business.abn ?? '',
      addressLine1: business.address_line1 ?? profile?.address_line1 ?? '',
      city: business.city ?? profile?.city ?? '',
      state: business.state ?? profile?.state ?? '',
      postcode: business.postcode ?? profile?.postcode ?? '',
      phone: business.phone ?? profile?.phone ?? '',
      email: business.email ?? profile?.email ?? fallbackEmail ?? '',
      logoUrl,
      logoPreviewUrl,
    };
  }

  return {
    name: profile?.business_name ?? '',
    abn: profile?.abn ?? '',
    addressLine1: profile?.address_line1 ?? '',
    city: profile?.city ?? '',
    state: profile?.state ?? '',
    postcode: profile?.postcode ?? '',
    phone: profile?.phone ?? '',
    email: profile?.email ?? fallbackEmail ?? '',
    logoUrl,
    logoPreviewUrl,
  };
}

function parseBusinessInput(
  input: BusinessUpdateInput,
  fallbackEmail: string | null
): ParsedBusinessInput {
  const parsed = businessUpdateSchema.safeParse({
    ...input,
    email: input.email?.trim() ? input.email : fallbackEmail ?? '',
  });

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ?? 'Business details could not be validated.',
    };
  }

  return {
    success: true,
    data: {
      name: parsed.data.name,
      abn: parsed.data.abn ?? null,
      address: formatStructuredAddress({
        addressLine1: parsed.data.addressLine1,
        city: parsed.data.city,
        state: parsed.data.state,
        postcode: parsed.data.postcode,
      }) || null,
      address_line1: parsed.data.addressLine1 ?? null,
      city: parsed.data.city ?? null,
      state: parsed.data.state ?? null,
      postcode: parsed.data.postcode ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? fallbackEmail ?? null,
      logo_url: parsed.data.logo_url ?? null,
    },
  };
}

async function loadBusinessRecords(supabase: AppSupabaseClient, userId: string) {
  const businessQuery = supabase
    .from('businesses')
    .select(
      'user_id, name, abn, address, address_line1, city, state, postcode, phone, email, logo_url'
    )
    .eq('user_id', userId);

  let businessResult = await businessQuery.maybeSingle();

  if (hasMissingBusinessesColumn(businessResult.error, 'address_line1')) {
    businessResult = await supabase
      .from('businesses')
      .select('user_id, name, abn, address, phone, email, logo_url')
      .eq('user_id', userId)
      .maybeSingle();
  }

  if (businessResult.error) {
    return {
      business: null,
      profile: null,
      error: businessResult.error.message,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      'business_name, abn, phone, email, logo_url, address_line1, city, state, postcode'
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) {
    return {
      business: null,
      profile: null,
      error: profileError.message,
    };
  }

  return {
    business: (businessResult.data as BusinessRow | null) ?? null,
    profile: (profile as ProfileFallbackRecord | null) ?? null,
    error: null,
  };
}

function mergeBusinessIdentity({
  business,
  profile,
  fallbackEmail,
}: {
  business: BusinessRow | null;
  profile: ProfileFallbackRecord | null;
  fallbackEmail: string | null;
}) {
  return {
    name: business?.name ?? profile?.business_name ?? '',
    abn: business?.abn ?? profile?.abn ?? null,
    phone: business?.phone ?? profile?.phone ?? null,
    email: business?.email ?? profile?.email ?? fallbackEmail ?? null,
    logoPath: business?.logo_url ?? profile?.logo_url ?? null,
  };
}

export async function getBusinessDocumentBranding(
  supabase: AppSupabaseClient,
  userId: string,
  fallbackEmail: string | null
): Promise<{ data: BusinessDocumentBranding | null; error: string | null }> {
  const result = await loadBusinessRecords(supabase, userId);

  if (result.error) {
    return { data: null, error: result.error };
  }

  const merged = mergeBusinessIdentity({
    business: result.business,
    profile: result.profile,
    fallbackEmail,
  });

  return {
    data: {
      name: merged.name,
      abn: merged.abn,
      phone: merged.phone,
      email: merged.email,
      logoPath: merged.logoPath,
      logoUrl: await createSignedStorageUrl(supabase, merged.logoPath),
    },
    error: null,
  };
}

export async function getBusinessProfile(
  supabase: AppSupabaseClient,
  userId: string,
  fallbackEmail: string | null
): Promise<{ data: BusinessFormValues | null; error: string | null }> {
  const result = await loadBusinessRecords(supabase, userId);

  if (result.error) {
    return { data: null, error: result.error };
  }

  const merged = mergeBusinessIdentity({
    business: result.business,
    profile: result.profile,
    fallbackEmail,
  });
  const logoUrl = merged.logoPath ?? '';
  const logoPreviewUrl = (await createSignedStorageUrl(supabase, logoUrl)) ?? '';

  return {
    data: toFormValues({
      business: result.business,
      profile: result.profile,
      fallbackEmail,
      logoUrl,
      logoPreviewUrl,
    }),
    error: null,
  };
}

export async function saveBusinessProfileForUser({
  supabase,
  user,
  input,
}: {
  supabase: AppSupabaseClient;
  user: User;
  input: BusinessUpdateInput;
}): Promise<{ error: string | null }> {
  const parsed = parseBusinessInput(input, user.email ?? null);

  if (!parsed.success) {
    return { error: parsed.error };
  }

  let businessError = (
    await supabase.from('businesses').upsert(
      {
        user_id: user.id,
        ...parsed.data,
      },
      { onConflict: 'user_id' }
    )
  ).error;

  if (hasMissingBusinessesColumn(businessError, 'address_line1')) {
    businessError = (
      await supabase.from('businesses').upsert(
        {
          user_id: user.id,
          name: parsed.data.name,
          abn: parsed.data.abn,
          address: parsed.data.address,
          phone: parsed.data.phone,
          email: parsed.data.email,
          logo_url: parsed.data.logo_url,
        },
        { onConflict: 'user_id' }
      )
    ).error;
  }

  if (businessError) {
    return { error: businessError.message };
  }

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      user_id: user.id,
      business_name: parsed.data.name,
      abn: parsed.data.abn,
      address_line1: parsed.data.address_line1,
      city: parsed.data.city,
      state: parsed.data.state,
      postcode: parsed.data.postcode,
      phone: parsed.data.phone,
      email: parsed.data.email,
      logo_url: parsed.data.logo_url,
    },
    { onConflict: 'user_id' }
  );

  if (profileError) {
    return { error: profileError.message };
  }

  return { error: null };
}
