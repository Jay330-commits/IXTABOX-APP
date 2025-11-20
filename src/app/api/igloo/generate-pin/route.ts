import { NextRequest, NextResponse } from 'next/server';
import { IglooService } from '@/services/IglooService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, endDate, accessName } = body;

    // Validate required fields
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Parse dates
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    // Validate dates
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO 8601 format (e.g., 2024-01-01T09:00:00)' },
        { status: 400 }
      );
    }

    // Validate date range
    if (endDateObj <= startDateObj) {
      return NextResponse.json(
        { error: 'endDate must be after startDate' },
        { status: 400 }
      );
    }

    const iglooService = new IglooService();
    const result = await iglooService.generateBookingPin(
      startDateObj,
      endDateObj,
      accessName || 'Customer'
    );

    // Log the response to see what Igloo API returns
    console.log('\n========== IGLOO PIN API RESPONSE ==========');
    console.log('Full response:', JSON.stringify(result, null, 2));
    console.log('Response keys:', Object.keys(result));
    console.log('PIN value:', result.pin || result.pinCode || result.code || result.unlockCode || 'NOT FOUND IN RESPONSE');
    console.log('===========================================\n');

    // Return the full Igloo API response, spreading it at the top level for easy access
    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error generating Igloo PIN:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate PIN',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

