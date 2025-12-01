import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/log
 * Server-side logging endpoint for client-side events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { level = 'info', message, data } = body;

    // Log to terminal based on level
    const logMessage = data 
      ? `[${level.toUpperCase()}] ${message}\n${JSON.stringify(data, null, 2)}`
      : `[${level.toUpperCase()}] ${message}`;

    switch (level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      default:
        console.log(logMessage);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[LOG API] Error logging message:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

