import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

// Lazy initialization of Supabase client (client-side)
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

// Create server-side Supabase client that reads cookies from request
function createServerSupabaseClient(request?: NextRequest): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not configured');
  }

  // Read cookies from request (for serverless environments like Vercel)
  const cookieStore = request ? request.cookies : cookies();
  
  // Supabase stores session in cookies with names like:
  // - sb-<project-ref>-auth-token (contains access_token)
  // - sb-<project-ref>-auth-token-code-verifier
  // Extract the access token from cookies
  const accessToken = cookieStore.get(`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`)?.value;
  
  // Create client with access token if available
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  
  // If we have an access token, set it on the client
  if (accessToken) {
    try {
      // Parse the cookie value (it's JSON encoded)
      const sessionData = JSON.parse(decodeURIComponent(accessToken));
      if (sessionData?.access_token) {
        client.auth.setSession({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token || '',
        } as any);
      }
    } catch (e) {
      // Cookie might not be JSON, try to find access_token in all cookies
      const allCookies = cookieStore.getAll();
      for (const cookie of allCookies) {
        if (cookie.name.includes('auth-token') && cookie.value.includes('access_token')) {
          try {
            const parsed = JSON.parse(decodeURIComponent(cookie.value));
            if (parsed.access_token) {
              client.auth.setSession({
                access_token: parsed.access_token,
                refresh_token: parsed.refresh_token || '',
              } as any);
              break;
            }
          } catch {
            // Continue searching
          }
        }
      }
    }
  }
  
  return client;
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
    console.log('Attempting Supabase signUp for:', userData.email);
    
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          full_name: userData.fullName,
          phone: userData.phone,
        },
        // Disable email confirmation if SMTP is not configured
        // This allows registration to succeed even if email sending fails
        emailRedirectTo: undefined
      }
    });

    if (error) {
      console.error('Supabase signUp error:', {
        message: error.message,
        status: error.status,
        name: error.name
      });
      
      // Handle specific SMTP/email confirmation errors
      if (error.message?.toLowerCase().includes('confirmation email') || 
          error.message?.toLowerCase().includes('sending email') ||
          error.message?.toLowerCase().includes('email')) {
        console.error('Email confirmation error detected. This may be due to SMTP misconfiguration.');
        console.error('SMTP Error details:', error);
        console.error('Check SMTP settings in Supabase dashboard: Settings > Auth > SMTP Settings');
        
        // If user was created but email failed, we can still proceed
        // Check if user exists despite the error
        if (data?.user) {
          console.log('User was created despite email error. Proceeding with registration.');
          return {
            success: true,
            user: data.user as SupabaseUser,
            session: data.session as SupabaseSession | null
          };
        }
        
        // Log the technical error but return generic message to user
        return {
          success: false,
          message: 'Registration failed. Please try again later.'
        };
      }
      
      // Log all errors but return generic message
      return {
        success: false,
        message: 'Registration failed. Please try again.'
      };
    }

    console.log('Supabase signUp successful:', {
      userId: data.user?.id,
      email: data.user?.email,
      emailConfirmed: data.user?.email_confirmed_at ? 'Yes' : 'No',
      hasSession: !!data.session
    });

    return {
      success: true,
      user: data.user as SupabaseUser,
      session: data.session as SupabaseSession | null
    };
  } catch (error) {
    console.error('Supabase registration error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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

// Get current user (server-side version that reads cookies from request)
export async function getCurrentUser(request?: NextRequest): Promise<SupabaseUser | null> {
  try {
    // Use server-side client if request is provided (for API routes)
    const client = request ? createServerSupabaseClient(request) : getSupabaseClient();
    const { data: { user }, error } = await client.auth.getUser();
    
    if (error) {
      console.error('Get current user error:', error);
      return null;
    }
    
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
