import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';
import { LocationService } from '@/services/locations/LocationService';
import { uploadToSupabaseStorage, ensureFoldersExist } from '@/lib/supabase-storage';

const LOCATIONS_BUCKET = 'locations';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseUser = await getCurrentUser(request);
    if (!supabaseUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.public_users.findUnique({
      where: { email: supabaseUser.email! },
      include: {
        distributors: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user || !user.distributors) {
      return NextResponse.json({ error: 'Distributor not found' }, { status: 404 });
    }

    const { id } = await params;

    // Verify location belongs to distributor
    const location = await prisma.locations.findUnique({
      where: { id },
      select: { distributor_id: true, display_id: true },
    });

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    if (location.distributor_id !== user.distributors.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    // Upload image to Supabase Storage
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${location.display_id || id.slice(0, 6)}-${timestamp}.${fileExtension}`;
    const filePath = fileName;

    // Upload to Supabase Storage
    const uploadResult = await uploadToSupabaseStorage(
      LOCATIONS_BUCKET,
      filePath,
      file,
      { contentType: file.type || 'image/jpeg' },
      request
    );

    // Update location with image URL using LocationService
    const service = new LocationService();
    const updatedLocation = await service.updateLocation(id, {
      image: uploadResult.url,
    });

    return NextResponse.json({ 
      success: true, 
      data: { 
        imageUrl: uploadResult.url,
        location: updatedLocation 
      } 
    });
  } catch (error) {
    console.error('Error uploading location image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload location image' },
      { status: 500 }
    );
  }
}
