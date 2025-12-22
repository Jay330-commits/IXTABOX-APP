import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { getSupabaseStorageClient, getSupabaseStoragePublicUrl, getSupabaseStorageSignedUrl } from '@/lib/supabase-storage';

// Use existing box_returns bucket, but store test files in a separate folder
const TEST_BUCKET = 'box_returns';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabaseUser = await getCurrentUser(request);
    
    if (!supabaseUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract access token for signed URL generation
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : undefined;

    console.log('[Test Bucket List] Fetching files from bucket:', TEST_BUCKET);

    // Get Supabase client
    const supabase = getSupabaseStorageClient(accessToken);

    // List files in the test_uploads folder
    const { data: files, error } = await supabase.storage
      .from(TEST_BUCKET)
      .list('test_uploads', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('[Test Bucket List] Error listing files:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to list files' },
        { status: 500 }
      );
    }

    console.log('[Test Bucket List] Found files:', files?.length || 0);

    // Generate URLs for each file
    const filesWithUrls = await Promise.all(
      (files || []).map(async (file) => {
        const filePath = `test_uploads/${file.name}`;
        
        // Get public URL
        const publicUrl = getSupabaseStoragePublicUrl(TEST_BUCKET, filePath);
        
        // Generate signed URL
        let signedUrl: string;
        try {
          signedUrl = await getSupabaseStorageSignedUrl(
            TEST_BUCKET,
            filePath,
            3600, // 1 hour expiry
            accessToken
          );
        } catch (error) {
          console.warn('[Test Bucket List] Failed to generate signed URL for', filePath, error);
          signedUrl = publicUrl;
        }

        return {
          path: filePath,
          name: file.name,
          size: file.metadata?.size || 0,
          publicUrl,
          signedUrl,
          uploadedAt: file.created_at || new Date().toISOString(),
        };
      })
    );

    return NextResponse.json({
      success: true,
      files: filesWithUrls,
      count: filesWithUrls.length,
    });
  } catch (error) {
    console.error('[Test Bucket List] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to list files',
      },
      { status: 500 }
    );
  }
}

