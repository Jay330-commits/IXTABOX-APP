import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { getSupabaseStorageClient } from '@/lib/supabase-storage';

// Use existing box_returns bucket, but store test files in a separate folder
const TEST_BUCKET = 'box_returns';

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const supabaseUser = await getCurrentUser(request);
    
    if (!supabaseUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract access token
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : undefined;

    // Get path from request body
    const body = await request.json();
    const { path } = body;

    if (!path) {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      );
    }

    console.log('[Test Bucket Delete] Deleting file:', path);

    // Get Supabase client
    const supabase = getSupabaseStorageClient(accessToken);

    // Delete file
    const { error } = await supabase.storage
      .from(TEST_BUCKET)
      .remove([path]);

    if (error) {
      console.error('[Test Bucket Delete] Error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to delete file' },
        { status: 500 }
      );
    }

    console.log('[Test Bucket Delete] File deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('[Test Bucket Delete] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete file',
      },
      { status: 500 }
    );
  }
}

