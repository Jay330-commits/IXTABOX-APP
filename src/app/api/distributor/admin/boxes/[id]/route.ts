import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { prisma } from '@/lib/prisma/prisma';
import { BoxService, UpdateBoxData } from '@/services/locations/BoxService';
import { boxmodel, boxStatus } from '@prisma/client';

export async function PATCH(
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
    const body = await request.json();

    // Verify box belongs to distributor's stand
    const box = await prisma.boxes.findUnique({
      where: { id },
      include: {
        stands: {
          include: {
            locations: {
              select: {
                distributor_id: true,
              },
            },
          },
        },
      },
    });

    if (!box) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 });
    }

    if (box.stands.locations.distributor_id !== user.distributors.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updateData: UpdateBoxData = {};
    if (body.model) {
      if (!Object.values(boxmodel).includes(body.model as boxmodel)) {
        return NextResponse.json({ error: 'Invalid box model' }, { status: 400 });
      }
      updateData.model = body.model as boxmodel;
    }
    if (body.status) {
      updateData.status = body.status as boxStatus;
    }
    if (body.compartment !== undefined) {
      updateData.compartment = body.compartment ? parseInt(body.compartment) : null;
    }
    if (body.standId) {
      // Verify new stand belongs to distributor
      const newStand = await prisma.stands.findUnique({
        where: { id: body.standId },
        include: {
          locations: {
            select: {
              distributor_id: true,
            },
          },
        },
      });
      if (!newStand || newStand.locations.distributor_id !== user.distributors.id) {
        return NextResponse.json({ error: 'Invalid stand' }, { status: 400 });
      }
      updateData.standId = body.standId;
    }

    const service = new BoxService();
    const updatedBox = await service.updateBox(id, updateData);

    return NextResponse.json({ success: true, data: updatedBox });
  } catch (error) {
    console.error('Error updating box:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update box' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Verify box belongs to distributor's stand
    const box = await prisma.boxes.findUnique({
      where: { id },
      include: {
        stands: {
          include: {
            locations: {
              select: {
                distributor_id: true,
              },
            },
          },
        },
      },
    });

    if (!box) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 });
    }

    if (box.stands.locations.distributor_id !== user.distributors.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const service = new BoxService();
    await service.deleteBox(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting box:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete box' },
      { status: 500 }
    );
  }
}
