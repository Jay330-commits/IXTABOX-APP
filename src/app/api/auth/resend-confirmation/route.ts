import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { resendEmailConfirmation } from '@/lib/supabase-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    const result = await resendEmailConfirmation(email);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Resend confirmation API error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to resend confirmation email' },
      { status: 500 }
    );
  }
}
