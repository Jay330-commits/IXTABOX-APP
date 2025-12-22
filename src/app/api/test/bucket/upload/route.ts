import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { uploadToSupabaseStorage, getSupabaseStorageSignedUrl } from '@/lib/supabase-storage';

// Use existing box_returns bucket, but store test files in a separate folder
const TEST_BUCKET = 'box_returns';

export async function POST(request: NextRequest) {
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

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    // Store test files in test_uploads folder to avoid mixing with production data
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${timestamp}-${randomString}.${fileExtension}`;
    const filePath = `test_uploads/${fileName}`;

    console.log('[Test Bucket Upload] Uploading file:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      path: filePath,
    });

    // Upload to Supabase Storage
    const { url, path } = await uploadToSupabaseStorage(
      TEST_BUCKET,
      filePath,
      file,
      {
        contentType: file.type,
      },
      request
    );

    console.log('[Test Bucket Upload] Upload successful:', { url, path });

    // Generate signed URL
    let signedUrl: string;
    try {
      signedUrl = await getSupabaseStorageSignedUrl(
        TEST_BUCKET,
        path,
        3600, // 1 hour expiry
        accessToken
      );
    } catch (error) {
      console.warn('[Test Bucket Upload] Failed to generate signed URL, using public URL:', error);
      signedUrl = url;
    }

    return NextResponse.json({
      success: true,
      path,
      url,
      signedUrl,
      message: 'File uploaded successfully',
    });
  } catch (error) {
    console.error('[Test Bucket Upload] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    );
  }
}

