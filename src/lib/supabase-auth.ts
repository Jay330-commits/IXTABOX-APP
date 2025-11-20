import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization of Supabase client
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase environment variables are not configured');
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  
  return supabaseClient;
}

export const supabase = {
  get auth() {
    return getSupabaseClient().auth;
  }
};

export interface SupabaseUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    phone?: string;
  };
}

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: SupabaseUser;
  expires_at?: number;
}

export interface AuthResult {
  success: boolean;
  user?: SupabaseUser;
  session?: SupabaseSession | null;
  message?: string;
}

// Register user with Supabase Auth
export async function registerWithSupabase(userData: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          full_name: userData.fullName,
          phone: userData.phone,
        }
      }
    });

    if (error) {
      return {
        success: false,
        message: error.message
      };
    }

    return {
      success: true,
      user: data.user as SupabaseUser,
      session: data.session as SupabaseSession | null
    };
  } catch (error) {
    console.error('Supabase registration error:', error);
    return {
      success: false,
      message: 'Registration failed. Please try again.'
    };
  }
}

// Login user with Supabase Auth
export async function loginWithSupabase(email: string, password: string): Promise<AuthResult> {
  try {
    console.log('Attempting login with email:', email);
    console.log('Supabase client created with URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    console.log('Supabase signInWithPassword response:', { data, error });

    if (error) {
      console.error('Supabase login error details:', {
        message: error.message,
        status: error.status,
        name: error.name
      });
      
      // Handle email not confirmed error specifically
      if (error.message === 'Email not confirmed') {
        console.log('Email not confirmed - attempting to resend confirmation or bypass');
        // For now, we'll return a more user-friendly message
        // In production, you might want to implement email resend functionality
        return {
          success: false,
          message: 'Please check your email and click the confirmation link, or contact support if you need assistance.'
        };
      }
      
      return {
        success: false,
        message: error.message
      };
    }

    console.log('Login successful, user data:', {
      id: data.user?.id,
      email: data.user?.email,
      email_confirmed_at: data.user?.email_confirmed_at,
      created_at: data.user?.created_at
    });

    return {
      success: true,
      user: data.user as SupabaseUser,
      session: data.session as SupabaseSession | null
    };
  } catch (error) {
    console.error('Supabase login error:', error);
    return {
      success: false,
      message: 'Login failed. Please try again.'
    };
  }
}

// Get current user
export async function getCurrentUser(): Promise<SupabaseUser | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user as SupabaseUser;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

// Logout user
export async function logoutUser(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Resend email confirmation
export async function resendEmailConfirmation(email: string): Promise<AuthResult> {
  try {
    console.log('Resending email confirmation for:', email);
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email
    });

    if (error) {
      console.error('Resend confirmation error:', error);
      return {
        success: false,
        message: error.message
      };
    }

    return {
      success: true,
      message: 'Confirmation email sent successfully'
    };
  } catch (error) {
    console.error('Resend confirmation error:', error);
    return {
      success: false,
      message: 'Failed to resend confirmation email'
    };
  }
}
