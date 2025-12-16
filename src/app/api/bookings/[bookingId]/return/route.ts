import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { ReturnBoxService } from '@/services/bookings/ReturnBoxService';
import { uploadToSupabaseStorage } from '@/lib/supabase-storage';

/**
 * Get return instructions
 * GET /api/bookings/[bookingId]/return
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Authenticate user
    const supabaseUser = await getCurrentUser(request);
    if (!supabaseUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const { prisma } = await import('@/lib/prisma/prisma');
    const user = await prisma.public_users.findUnique({
      where: { email: supabaseUser.email! },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if booking can be returned
    const returnService = new ReturnBoxService();
    const canReturnResult = await returnService.canReturnBox(bookingId, user.id);

    // Get return instructions
    const instructions = returnService.getReturnInstructions();

    return NextResponse.json({
      canReturn: canReturnResult.canReturn,
      reason: canReturnResult.reason,
      booking: canReturnResult.booking,
      instructions,
    });
  } catch (error) {
    console.error('Error getting return instructions:', error);
    return NextResponse.json(
      {
        error: 'Failed to get return instructions',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Return a box
 * POST /api/bookings/[bookingId]/return
 * 
 * Expects multipart/form-data with:
 * - boxFrontView: File
 * - boxBackView: File
 * - closedStandLock: File
 * - confirmedGoodStatus: string (boolean)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Authenticate user
    const supabaseUser = await getCurrentUser(request);
    if (!supabaseUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const { prisma } = await import('@/lib/prisma/prisma');
    const user = await prisma.public_users.findUnique({
      where: { email: supabaseUser.email! },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await request.formData();

    // Get photo files
    const boxFrontViewFile = formData.get('boxFrontView') as File | null;
    const boxBackViewFile = formData.get('boxBackView') as File | null;
    const closedStandLockFile = formData.get('closedStandLock') as File | null;

    // Get confirmation checkbox
    const confirmedGoodStatus = formData.get('confirmedGoodStatus') === 'true' || formData.get('confirmedGoodStatus') === 'on';

    // Validate required fields
    if (!boxFrontViewFile || !boxBackViewFile || !closedStandLockFile) {
      return NextResponse.json(
        { error: 'All three photos are required: boxFrontView, boxBackView, closedStandLock' },
        { status: 400 }
      );
    }

    if (!confirmedGoodStatus) {
      return NextResponse.json(
        { error: 'You must confirm that the box has been returned in good status' },
        { status: 400 }
      );
    }

    // Upload photos to Supabase Storage
    const returnService = new ReturnBoxService();

    let photoUrls: {
      boxFrontView: string;
      boxBackView: string;
      closedStandLock: string;
    };

    try {
      const timestamp = Date.now();
      const bucket = 'box_returns'; // Make sure this bucket exists in Supabase Storage
      
      // Ensure folders exist before uploading (matching UI structure)
      const { ensureFoldersExist } = await import('@/lib/supabase-storage');
      await ensureFoldersExist(
        bucket,
        ['box_front_view', 'box_back_view', 'closed_stand_view'],
        request
      );
      
      // Upload all photos in parallel to Supabase Storage
      // Each photo type has its own folder inside box_returns bucket
      // Pass request to extract access token for authenticated uploads (required for RLS policies)
      const [boxFrontViewUrl, boxBackViewUrl, closedStandLockUrl] = await Promise.all([
        uploadToSupabaseStorage(
          bucket,
          `box_front_view/${bookingId}-${timestamp}.jpg`,
          boxFrontViewFile,
          { contentType: boxFrontViewFile.type || 'image/jpeg' },
          request
        ),
        uploadToSupabaseStorage(
          bucket,
          `box_back_view/${bookingId}-${timestamp}.jpg`,
          boxBackViewFile,
          { contentType: boxBackViewFile.type || 'image/jpeg' },
          request
        ),
        uploadToSupabaseStorage(
          bucket,
          `closed_stand_view/${bookingId}-${timestamp}.jpg`,
          closedStandLockFile,
          { contentType: closedStandLockFile.type || 'image/jpeg' },
          request
        ),
      ]);

      photoUrls = {
        boxFrontView: boxFrontViewUrl.url,
        boxBackView: boxBackViewUrl.url,
        closedStandLock: closedStandLockUrl.url,
      };
    } catch (uploadError) {
      console.error('Error uploading photos to Supabase Storage:', uploadError);
      return NextResponse.json(
        {
          error: 'Failed to upload photos',
          message: uploadError instanceof Error ? uploadError.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    // Process box return
    const returnResult = await returnService.returnBox({
      bookingId,
      userId: user.id,
      photos: photoUrls,
      confirmedGoodStatus,
    });

    if (!returnResult.success) {
      return NextResponse.json(
        {
          error: returnResult.error || 'Failed to return box',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Box returned successfully',
      return: returnResult,
    });
  } catch (error) {
    console.error('Error processing box return:', error);
    return NextResponse.json(
      {
        error: 'Failed to process box return',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

