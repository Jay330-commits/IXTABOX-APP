import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type PublicUserRole = 'Guest' | 'Customer' | 'Distributer' | 'Admin';

export interface CreatePublicUserParams {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: unknown;
  role?: PublicUserRole;
}

/**
 * Service responsible for managing rows in public.users (OOP style)
 * Uses the service role key when available to guarantee row creation
 */
export class SupabaseUserService {
  private client: SupabaseClient;

  constructor(accessToken?: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      throw new Error('Supabase URL is not configured');
    }

    // Prefer service role when present to bypass RLS for system inserts
    if (serviceKey) {
      this.client = createClient(supabaseUrl, serviceKey);
    } else if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      // Fallback to anon client and optional user access token
      this.client = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      if (accessToken) {
        // Best-effort: set the access token for RLS-enabled insert
        // Note: We don't have the refresh_token here post-signup reliably
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.client.auth as any).setAuth(accessToken);
      }
    } else {
      throw new Error('Supabase keys are not configured');
    }
  }

  async createCustomer(params: CreatePublicUserParams) {
    const payload = {
      id: params.id,
      fullname: params.fullName, // matches your table column name
      email: params.email,
      phone: params.phone ?? null,
      address: params.address ?? null,
      role: (params.role ?? 'Customer') as PublicUserRole
    };

    // Upsert guarantees the row exists and is linked by id
    const { error } = await this.client
      .from('users')
      .upsert(payload, { onConflict: 'id' })
      .single();

    if (error) {
      throw new Error(`Failed to create/update public.users row: ${error.message}`);
    }

    return { success: true } as const;
  }
}


