import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { BoxInventoryService } from '@/services/distributors/inventory/BoxInventoryService';
import { boxStatus } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boxId: string }> }
) {
  // Check authentication FIRST - exit immediately if not authenticated
  const supabaseUser = await getCurrentUser(request);

  if (!supabaseUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { boxId } = await params;
    const service = new BoxInventoryService();
    const boxDetails = await service.getBoxDetails(boxId);
    const history = await service.getBoxHistory(boxId);

    return NextResponse.json({
      success: true,
      data: {
        ...boxDetails,
        history,
      },
    });
  } catch (error) {
    console.error('Error fetching box details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch box details' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ boxId: string }> }
) {
  // Check authentication FIRST - exit immediately if not authenticated
  const supabaseUser = await getCurrentUser(request);

  if (!supabaseUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { boxId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !Object.values(boxStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const service = new BoxInventoryService();
    const result = await service.updateBoxStatus(boxId, status);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error updating box status:', error);
    return NextResponse.json(
      { error: 'Failed to update box status' },
      { status: 500 }
    );
  }
}

