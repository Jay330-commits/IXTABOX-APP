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
async function createServerSupabaseClient(request?: NextRequest): Promise<SupabaseClient> {
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
  
  // Supabase stores session in cookies with specific naming patterns
  // Format: sb-<project-ref>-auth-token (e.g., sb-abc123-auth-token)
  // Also check for sb-<project-ref>-auth-token-code-verifier and other variants
  let accessToken: string | undefined;
  let refreshToken: string | undefined;
  const allCookies = cookieStore.getAll();
  
  // Extract project ref from Supabase URL to build expected cookie names
  const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || '';
  
  // Build expected cookie names
  const authTokenCookieName = projectRef ? `sb-${projectRef}-auth-token` : null;
  
  console.log('[createServerSupabaseClient] Looking for Supabase cookies:', {
    projectRef,
    authTokenCookieName,
    totalCookies: allCookies.length,
    cookieNames: allCookies.map(c => c.name),
  });
  
  // First, try to find the specific Supabase auth token cookie
  if (authTokenCookieName) {
    const authCookie = cookieStore.get(authTokenCookieName);
    if (authCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(authCookie.value));
        if (parsed?.access_token) {
          accessToken = parsed.access_token;
          refreshToken = parsed.refresh_token;
          console.log('[createServerSupabaseClient] Found Supabase cookie:', authTokenCookieName);
        }
      } catch {
        // If not JSON, might be a direct token
        if (authCookie.value.length > 50) {
          accessToken = authCookie.value;
          console.log('[createServerSupabaseClient] Found token in cookie (non-JSON)');
        }
      }
    }
  }
  
  // Fallback: search for any cookie containing 'auth-token' or 'supabase'
  if (!accessToken) {
  for (const cookie of allCookies) {
    // Look for Supabase auth token cookies (various formats)
      if (cookie.name.includes('auth-token') || cookie.name.includes('supabase') || cookie.name.startsWith('sb-')) {
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(decodeURIComponent(cookie.value));
        if (parsed?.access_token) {
          accessToken = parsed.access_token;
            refreshToken = parsed.refresh_token;
            console.log('[createServerSupabaseClient] Found token in cookie:', cookie.name);
          break;
        }
      } catch {
        // If not JSON, check if it's a direct token
          if (cookie.value.length > 50 && !accessToken) {
          accessToken = cookie.value;
            console.log('[createServerSupabaseClient] Found token in cookie (non-JSON):', cookie.name);
          break;
          }
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
      // If we didn't get refresh token from the auth cookie, try to find it separately
      if (!refreshToken) {
      // Try to find refresh token from cookies
      for (const cookie of allCookies) {
          if (cookie.name.includes('refresh-token') || cookie.name.includes('auth-refresh') || 
              (projectRef && cookie.name === `sb-${projectRef}-auth-token-code-verifier`)) {
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
      }
      
      console.log('[createServerSupabaseClient] Setting session:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        tokenLength: accessToken?.length || 0,
      });
      
      // Set session if we have access token
      // Note: setSession is async, so we await it
      if (refreshToken) {
        await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
        } as { access_token: string; refresh_token: string });
      } else {
        // If no refresh token, try to set just the access token
        // This might work for some Supabase configurations
        await client.auth.setSession({
          access_token: accessToken,
          refresh_token: '',
        } as { access_token: string; refresh_token: string });
      }
      console.log('[createServerSupabaseClient] Session set successfully');
    } catch (e) {
      // If setting session fails, continue without it
      // The getUser() call will still work if cookies are properly set
      console.error('[createServerSupabaseClient] Could not set session from cookies:', e);
    }
  } else {
    console.log('[createServerSupabaseClient] No access token found in cookies');
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
    
    // Use server-side client for authentication
    const authClient = createServerAuthClient();
    const { data, error } = await authClient.auth.signUp({
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

// Create a server-side Supabase client for authentication (no cookies needed)
function createServerAuthClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not configured');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

// Login user with Supabase Auth
export async function loginWithSupabase(email: string, password: string): Promise<AuthResult> {
  try {
    // Use server-side client for authentication
    const authClient = createServerAuthClient();
    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      // Handle email not confirmed error specifically
      if (error.message === 'Email not confirmed') {
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

    return {
      success: true,
      user: data.user as SupabaseUser,
      session: data.session as SupabaseSession | null
    };
  } catch (error) {
    // Only log errors, not debug info
    if (process.env.NODE_ENV === 'development') {
      console.error('Supabase login error:', error);
    }
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
      console.log('[getCurrentUser] Starting authentication check...');
      
      // Declare cookieError outside try block so it's accessible later
      let cookieError: Error | null = null;
      
      // Method 1: Try reading from Supabase cookies
      try {
        const client = await createServerSupabaseClient(request);
        const { data: { user: cookieUser }, error: error } = await client.auth.getUser();
        cookieError = error;
      
      if (!cookieError && cookieUser) {
          console.log('[getCurrentUser] ✅ Found user from cookies:', cookieUser.email);
        return cookieUser as SupabaseUser;
        }
        
        if (cookieError) {
          console.log('[getCurrentUser] Cookie authentication failed:', cookieError.message);
        }
      } catch (cookieAuthError) {
        console.log('[getCurrentUser] Cookie auth exception:', cookieAuthError instanceof Error ? cookieAuthError.message : String(cookieAuthError));
        // Convert unknown error to Error type
        cookieError = cookieAuthError instanceof Error ? cookieAuthError : new Error(String(cookieAuthError));
      }
      
      // Method 2: Try reading from Authorization header (for serverless/Vercel)
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        console.log('[getCurrentUser] Found Authorization header, token length:', token.length);
        
        try {
          // Verify the token by calling Supabase API directly
          // Use the REST API endpoint to get user info
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          
          if (!supabaseUrl || !supabaseAnonKey) {
            console.error('[getCurrentUser] Missing Supabase environment variables');
            return null;
          }
          
          console.log('[getCurrentUser] Validating token with Supabase API...');
          const response = await fetch(
            `${supabaseUrl}/auth/v1/user`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': supabaseAnonKey,
              },
            }
          );
          
          console.log('[getCurrentUser] Supabase API response status:', response.status);
          
          if (response.ok) {
            const userData = await response.json();
            console.log('[getCurrentUser] Token validated successfully, user ID:', userData?.id);
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
            console.error('[getCurrentUser] Token validation failed:', {
              status: response.status,
              statusText: response.statusText,
              error: errorData,
            });
          }
        } catch (tokenError) {
          console.error('[getCurrentUser] Token validation exception:', {
            error: tokenError instanceof Error ? tokenError.message : String(tokenError),
            stack: tokenError instanceof Error ? tokenError.stack : undefined,
          });
        }
      } else {
        console.log('[getCurrentUser] No Authorization header found');
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
    
    // Use server-side client for authentication
    const authClient = createServerAuthClient();
    const { error } = await authClient.auth.resend({
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
