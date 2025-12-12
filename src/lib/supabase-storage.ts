import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

/**
 * Extract access token from request cookies or headers
 */
function extractAccessTokenFromRequest(request?: NextRequest): string | undefined {
  if (!request) return undefined;
  
  const cookieStore = request.cookies;
  const allCookies = cookieStore.getAll();
  
  // Look for Supabase auth token in cookies
  for (const cookie of allCookies) {
    if (cookie.name.includes('auth-token') || cookie.name.includes('supabase')) {
      try {
        const parsed = JSON.parse(decodeURIComponent(cookie.value));
        if (parsed?.access_token) {
          return parsed.access_token;
        }
      } catch {
        // If not JSON, check if it's a direct token
        if (cookie.value.length > 50) {
          return cookie.value;
        }
      }
    }
  }
  
  // Try Authorization header as fallback
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return undefined;
}

/**
 * Get Supabase client for storage operations
 * Uses service role key if available (bypasses RLS), otherwise falls back to anon key
 * If accessToken is provided, it will be used to authenticate the user (required for RLS policies)
 * Note: If using anon key, ensure RLS policies allow uploads for authenticated users
 */
function getSupabaseStorageClient(accessToken?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
  }
  
  // Prefer service role key (bypasses RLS), but fallback to anon key
  const key = serviceRoleKey || anonKey;
  const usingServiceRole = !!serviceRoleKey;
  
  if (!key) {
    throw new Error('Supabase API key is not configured. Set either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  
  // Log which key is being used (for debugging, without exposing the actual key)
  if (!usingServiceRole && !accessToken) {
    console.warn('⚠️  Using NEXT_PUBLIC_SUPABASE_ANON_KEY for storage operations without access token. For server-side uploads, SUPABASE_SERVICE_ROLE_KEY is recommended to bypass RLS, or pass accessToken for authenticated requests.');
  }
  
  const client = createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: accessToken && !usingServiceRole 
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined
    }
  });
  
  // If access token is provided, also set it in the auth session for proper authentication
  if (accessToken && !usingServiceRole) {
    // Set the access token in the client's auth session
    client.auth.setSession({
      access_token: accessToken,
      refresh_token: '', // Not needed for storage operations
    } as { access_token: string; refresh_token: string }).catch(() => {
      // Ignore errors - the token in headers will still work
    });
  }
  
  return client;
}

/**
 * Upload a file to Supabase Storage
 * @param bucket - Storage bucket name
 * @param path - File path within bucket (e.g., 'bookings/123/photo.jpg')
 * @param file - File object or Blob
 * @param options - Upload options
 * @param request - Optional NextRequest to extract access token from (required for RLS policies when using anon key)
 */
export async function uploadToSupabaseStorage(
  bucket: string,
  path: string,
  file: File | Blob | Buffer,
  options?: {
    contentType?: string;
    cacheControl?: string;
    upsert?: boolean;
    accessToken?: string;
  },
  request?: NextRequest
): Promise<{ url: string; path: string }> {
  // Extract access token from request if not provided in options
  const accessToken = options?.accessToken || extractAccessTokenFromRequest(request);
  const supabase = getSupabaseStorageClient(accessToken);
  
  // Convert File to ArrayBuffer if needed
  let fileData: ArrayBuffer | Buffer;
  if (file instanceof File || file instanceof Blob) {
    fileData = await file.arrayBuffer();
  } else {
    fileData = file;
  }
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, fileData, {
      contentType: options?.contentType || 'image/jpeg',
      cacheControl: options?.cacheControl || '3600',
      upsert: options?.upsert || false,
    });
  
  if (error) {
    // Check for common errors and provide helpful messages
    const errorMessage = error.message || '';
    const statusCode = 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
    
    if (errorMessage.includes('Bucket not found') || statusCode === 404) {
      throw new Error(
        `Bucket '${bucket}' not found in Supabase Storage. ` +
        `Please create it in your Supabase Dashboard → Storage. ` +
        `Original error: ${errorMessage}`
      );
    }
    
    if (errorMessage.includes('new row violates row-level security') || statusCode === 403) {
      const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
      const errorMsg = hasServiceRole
        ? `Permission denied: Cannot upload to bucket '${bucket}' even with service role key. ` +
          `This might indicate the bucket doesn't exist or has incorrect permissions. ` +
          `Please check: 1) Bucket exists in Supabase Dashboard → Storage, 2) Bucket is public or has proper RLS policies. ` +
          `Original error: ${errorMessage}`
        : `Permission denied: Cannot upload to bucket '${bucket}'. ` +
          `You're using NEXT_PUBLIC_SUPABASE_ANON_KEY which requires RLS policies. ` +
          `Solution: Set SUPABASE_SERVICE_ROLE_KEY environment variable to bypass RLS, or configure RLS policies in Supabase Dashboard → Storage → ${bucket} → Policies. ` +
          `Original error: ${errorMessage}`;
      
      throw new Error(errorMsg);
    }
    
    throw new Error(
      `Failed to upload to Supabase Storage (bucket: ${bucket}, path: ${path}): ${errorMessage}. ` +
      `Status: ${statusCode || 'unknown'}, Error: ${'error' in error ? (error as { error?: string }).error : 'unknown'}`
    );
  }
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);
  
  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFromSupabaseStorage(
  bucket: string,
  path: string
): Promise<void> {
  const supabase = getSupabaseStorageClient();
  
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);
  
  if (error) {
    throw new Error(`Failed to delete from Supabase Storage: ${error.message}`);
  }
}

