import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

// Track if warning has been shown to avoid spam
let warningShown = false;

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
export function getSupabaseStorageClient(accessToken?: string) {
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
  // Only show warning once per process to avoid spam
  if (!usingServiceRole && !accessToken && !warningShown) {
    console.warn('⚠️  Using NEXT_PUBLIC_SUPABASE_ANON_KEY for storage operations without access token. For server-side uploads, SUPABASE_SERVICE_ROLE_KEY is recommended to bypass RLS, or pass accessToken for authenticated requests.');
    warningShown = true;
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
 * Get public URL for a file in Supabase Storage
 * @param bucket - Storage bucket name
 * @param path - File path within bucket (e.g., 'bookings/123/photo.jpg')
 * @returns Public URL for the file
 */
export function getSupabaseStoragePublicUrl(bucket: string, path: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
  }
  
  // If path is already a full URL, return it
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Construct public URL
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
}

/**
 * Get signed URL for a file in Supabase Storage (for private buckets)
 * Signed URLs are temporary and expire after the specified time
 * @param bucket - Storage bucket name
 * @param path - File path within bucket (e.g., 'bookings/123/photo.jpg')
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @param accessToken - Optional access token for authenticated requests
 * @returns Signed URL that expires after the specified time
 */
export async function getSupabaseStorageSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600,
  accessToken?: string
): Promise<string> {
  const supabase = getSupabaseStorageClient(accessToken);
  
  // If path is already a full URL, extract the path from it
  let cleanPath = path;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    // If it's already a signed URL (contains token parameter), we shouldn't be here
    // But if we are, try to extract the path anyway
    if (path.includes('token=') || path.includes('&t=')) {
      console.warn(`[getSupabaseStorageSignedUrl] Received what appears to be a signed URL: ${path.substring(0, 100)}...`);
      // Try to extract path from signed URL
      try {
    const url = new URL(path);
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/sign\/\w+\/(.+)$/);
    if (pathMatch) {
      cleanPath = pathMatch[1];
        } else {
          throw new Error(`Cannot extract path from signed URL: ${path.substring(0, 100)}`);
        }
      } catch (error) {
        throw new Error(`Failed to extract path from signed URL: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      // Extract path from public URL
      try {
        const url = new URL(path);
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign\/)\w+\/(.+)$/);
        if (pathMatch && pathMatch[1]) {
          cleanPath = pathMatch[1];
        } else {
          // Try manual extraction
          const parts = path.split(`/${bucket}/`);
          if (parts.length > 1) {
            cleanPath = parts[1].split('?')[0]; // Remove query params
          } else {
            throw new Error(`Cannot extract path from URL: ${path.substring(0, 100)}`);
          }
        }
      } catch (error) {
        throw new Error(`Failed to extract path from URL: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  
  // Remove leading slash if present
  cleanPath = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath;
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(cleanPath, expiresIn);
  
  if (error) {
    console.error(`[getSupabaseStorageSignedUrl] Error creating signed URL for ${bucket}/${cleanPath}:`, error);
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }
  
  if (!data?.signedUrl) {
    throw new Error(`No signed URL returned for ${bucket}/${cleanPath}`);
  }
  
  // Safety check: ensure we never return a public URL
  if (data.signedUrl.includes('/storage/v1/object/public/')) {
    console.error(`[getSupabaseStorageSignedUrl] Signed URL generation returned public URL instead of signed URL for ${bucket}/${cleanPath}`);
    throw new Error(`Signed URL generation failed - returned public URL instead`);
  }
  
  return data.signedUrl;
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

/**
 * Ensure folders exist in a bucket by creating placeholder files if needed
 * Supabase Storage creates folders automatically when files are uploaded,
 * but this function ensures the folder structure exists before uploads
 * @param bucket - Storage bucket name
 * @param folders - Array of folder paths (e.g., ['box_front_view', 'box_back_view'])
 * @param request - Optional NextRequest to extract access token from
 */
export async function ensureFoldersExist(
  bucket: string,
  folders: string[],
  request?: NextRequest
): Promise<void> {
  const accessToken = extractAccessTokenFromRequest(request);
  const supabase = getSupabaseStorageClient(accessToken);
  
  // Check if folders exist by listing files in each folder
  // If folder doesn't exist, create a placeholder file to ensure folder structure
  for (const folder of folders) {
    try {
      // List files in the folder to check if it exists
      const { data: files, error: listError } = await supabase.storage
        .from(bucket)
        .list(folder, { limit: 1 });
      
      // If listing fails or folder is empty, create a placeholder to ensure folder exists
      // Note: Supabase Storage creates folders automatically, but this ensures they're ready
      if (listError || !files || files.length === 0) {
        // Create a placeholder file to ensure folder structure exists
        // This file will be overwritten or can be cleaned up later
        const placeholderPath = `${folder}/.keep`;
        const placeholderContent = new Blob([''], { type: 'text/plain' });
        
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(placeholderPath, placeholderContent, {
            contentType: 'text/plain',
            upsert: true, // Overwrite if exists
          });
        
        if (uploadError && !uploadError.message.includes('already exists')) {
          // Log but don't fail - folder will be created when actual file is uploaded
          console.log(`[ensureFoldersExist] Note: Could not create placeholder for ${folder}:`, uploadError.message);
        } else {
          console.log(`[ensureFoldersExist] Ensured folder exists: ${bucket}/${folder}`);
        }
      }
    } catch (error) {
      // Log but don't fail - folder will be created when actual file is uploaded
      console.log(`[ensureFoldersExist] Note: Could not verify folder ${folder}:`, error instanceof Error ? error.message : String(error));
    }
  }
}
