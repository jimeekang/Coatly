import type { User } from '@supabase/supabase-js';
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
  phone: string | null;
  email: string | null;
  logo_url: string | null;
};

export type BusinessFormValues = {
  name: string;
  abn: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
};

type ParsedBusinessInput =
  | {
      success: true;
      data: {
        name: string;
        abn: string | null;
        address: string | null;
        phone: string | null;
        email: string | null;
        logo_url: string | null;
      };
    }
  | {
      success: false;
      error: string;
    };

function formatAddressFromProfile(profile: ProfileFallbackRecord | null) {
  if (!profile) return '';

  return [
    profile.address_line1,
    profile.city,
    profile.state,
    profile.postcode,
  ]
    .map((value) => value?.trim() ?? '')
    .filter(Boolean)
    .join(', ');
}

function toFormValues({
  business,
  profile,
  fallbackEmail,
}: {
  business: BusinessRow | null;
  profile: ProfileFallbackRecord | null;
  fallbackEmail: string | null;
}): BusinessFormValues {
  if (business) {
    return {
      name: business.name,
      abn: business.abn ?? '',
      address: business.address ?? '',
      phone: business.phone ?? '',
      email: business.email ?? fallbackEmail ?? '',
      logoUrl: business.logo_url ?? '',
    };
  }

  return {
    name: profile?.business_name ?? '',
    abn: profile?.abn ?? '',
    address: formatAddressFromProfile(profile),
    phone: profile?.phone ?? '',
    email: profile?.email ?? fallbackEmail ?? '',
    logoUrl: profile?.logo_url ?? '',
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
      address: parsed.data.address ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? fallbackEmail ?? null,
      logo_url: parsed.data.logo_url ?? null,
    },
  };
}

export async function getBusinessProfile(
  supabase: AppSupabaseClient,
  userId: string,
  fallbackEmail: string | null
): Promise<{ data: BusinessFormValues | null; error: string | null }> {
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('user_id, name, abn, address, phone, email, logo_url')
    .eq('user_id', userId)
    .maybeSingle();

  if (businessError) {
    return { data: null, error: businessError.message };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      'business_name, abn, phone, email, logo_url, address_line1, city, state, postcode'
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) {
    return { data: null, error: profileError.message };
  }

  return {
    data: toFormValues({
      business: (business as BusinessRow | null) ?? null,
      profile: (profile as ProfileFallbackRecord | null) ?? null,
      fallbackEmail,
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

  const { error: businessError } = await supabase.from('businesses').upsert(
    {
      user_id: user.id,
      ...parsed.data,
    },
    { onConflict: 'user_id' }
  );

  if (businessError) {
    return { error: businessError.message };
  }

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      user_id: user.id,
      business_name: parsed.data.name,
      abn: parsed.data.abn,
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
