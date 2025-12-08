import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

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
  // Only use request.cookies - don't use next/headers cookies() to avoid client-side import issues
  if (!request) {
    // Fallback to regular client if no request provided (client-side usage)
    return getSupabaseClient();
  }
  
  const cookieStore = request.cookies;
  
  // Supabase stores session in cookies - find the auth token cookie
  // Cookie names vary, so we'll search for any cookie containing 'auth-token'
  let accessToken: string | undefined;
  const allCookies = cookieStore.getAll();
  
  for (const cookie of allCookies) {
    // Look for Supabase auth token cookies (various formats)
    if (cookie.name.includes('auth-token') || cookie.name.includes('supabase')) {
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(decodeURIComponent(cookie.value));
        if (parsed?.access_token) {
          accessToken = parsed.access_token;
          break;
        }
      } catch {
        // If not JSON, check if it's a direct token
        if (cookie.value.length > 50) {
          accessToken = cookie.value;
          break;
        }
      }
    }
  }
  
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
      // Set the session with the access token
      // Note: We need both access_token and refresh_token for full session
      // Try to find refresh token from cookies
      let refreshToken = '';
      for (const cookie of allCookies) {
        if (cookie.name.includes('refresh-token') || cookie.name.includes('auth-refresh')) {
          try {
            const parsed = JSON.parse(decodeURIComponent(cookie.value));
            if (parsed?.refresh_token) {
              refreshToken = parsed.refresh_token;
            } else if (typeof parsed === 'string') {
              refreshToken = parsed;
            }
          } catch {
            refreshToken = cookie.value;
          }
          break;
        }
      }
      
      // Set session if we have access token
      // Note: setSession is async but we can't await here in sync context
      // The getUser() call will handle authentication
      client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      } as { access_token: string; refresh_token: string }).catch(() => {
        // Ignore errors - getUser() will still work
      });
    } catch (e) {
      // If setting session fails, continue without it
      // The getUser() call will still work if cookies are properly set
      console.log('Could not set session from cookies:', e);
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
    // If request is provided, try multiple authentication methods
    if (request) {
      // Method 1: Try reading from Supabase cookies
      const client = createServerSupabaseClient(request);
      const { data: { user: cookieUser }, error: cookieError } = await client.auth.getUser();
      
      if (!cookieError && cookieUser) {
        return cookieUser as SupabaseUser;
      }
      
      // Method 2: Try reading from Authorization header (for serverless/Vercel)
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        try {
          // Create a client and set the session with the token
          const tokenClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
              auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
              },
            }
          );
          
          // Set the session with the access token
          // We need to call Supabase API directly to verify the token
          // Use the REST API endpoint to get user info
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              },
            }
          );
          
          if (response.ok) {
            const userData = await response.json();
            if (userData && userData.id) {
              // Map Supabase REST API response to SupabaseUser format
              return {
                id: userData.id,
                email: userData.email || userData.user_metadata?.email || '',
                user_metadata: userData.user_metadata || {},
              } as SupabaseUser;
            }
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.log('[getCurrentUser] Token validation failed:', {
              status: response.status,
              error: errorData,
            });
          }
        } catch (tokenError) {
          console.log('Token validation error:', tokenError instanceof Error ? tokenError.message : String(tokenError));
        }
      }
      
      // If both methods failed, return null
      if (cookieError) {
        console.error('Get current user error:', cookieError);
      }
      return null;
    }
    
    // Client-side: use regular client
    const client = getSupabaseClient();
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
