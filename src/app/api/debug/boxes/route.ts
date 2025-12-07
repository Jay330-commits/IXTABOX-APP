import { NextResponse } from 'next/server';
import { BoxService } from '@/services/locations/BoxService';

export async function GET() {
  try {
    const boxService = new BoxService();
    
    // Get boxes using BoxService
    const boxes = await boxService.getAllBoxes(20);

    const stats = {
      total: boxes.length,
      withCompartment: boxes.filter(b => b.compartment !== null).length,
      withoutCompartment: boxes.filter(b => b.compartment === null).length,
    };

    return NextResponse.json({
      stats,
      boxes,
    });
  } catch (error) {
    console.error('Error fetching boxes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch boxes' },
      { status: 500 }
    );
  }
}

