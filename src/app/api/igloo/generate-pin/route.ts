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
    // Note: Dates without timezone will be parsed in server's timezone (UTC on Vercel)
    // The formatDate function will handle converting to Swedish timezone correctly
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    // Validate dates
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO 8601 format (e.g., 2024-01-01T09:00:00)' },
        { status: 400 }
      );
    }

    // Log parsed dates for debugging
    console.log(`[Igloo PIN API] Original strings - Start: ${startDate}, End: ${endDate}`);
    console.log(`[Igloo PIN API] Parsed as UTC - Start: ${startDateObj.toISOString()}, End: ${endDateObj.toISOString()}`);

    // Validate date range
    if (endDateObj <= startDateObj) {
      return NextResponse.json(
        { error: 'endDate must be after startDate' },
        { status: 400 }
      );
    }

    // Use the shared function from IglooService
    const iglooService = new IglooService();
    
    try {
      // Get the full response for metadata (pinId, etc.)
      const fullResult = await iglooService.generateBookingPin(
        startDateObj,
        endDateObj,
        accessName || 'Customer'
      );

      // Extract and parse PIN using the shared function (same logic as booking creation)
      const parsedPin = iglooService.extractAndParsePin(fullResult);

      // Log the response to see what Igloo API returns
      console.log('\n========== IGLOO PIN API RESPONSE ==========');
      console.log('Full response:', JSON.stringify(fullResult, null, 2));
      console.log('Response keys:', Object.keys(fullResult));
      console.log('PIN value:', parsedPin);
      console.log('===========================================\n');

      // Return the full Igloo API response with parsed PIN
      return NextResponse.json({
        success: true,
        pin: parsedPin,
        pinNumber: parsedPin, // Also include as pinNumber for clarity
        ...fullResult
      });
    } catch (error) {
      // Error is already logged in generateBookingPin or generateAndParseBookingPin
      throw error; // Re-throw to be caught by outer try-catch
    }
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

