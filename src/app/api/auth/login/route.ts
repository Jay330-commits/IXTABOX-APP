import { NextRequest, NextResponse } from 'next/server';
import { loginWithSupabase, SupabaseSession } from '@/lib/supabase-auth';

export async function POST(request: NextRequest) {
  try {
    // Check if Supabase environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { 
          success: false, 
          message: 'Server configuration error. Please contact support.',
          error: 'Missing Supabase configuration'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Login with Supabase Auth
    console.log('Attempting Supabase login for:', email);
    const authResult = await loginWithSupabase(email, password);

    console.log('Supabase login result:', authResult);

    if (!authResult.success) {
      console.log('Supabase login failed:', authResult.message);
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: 401 }
      );
    }

    // For now, just return the Supabase user data without Prisma
    // TODO: Add Prisma database integration later
    return NextResponse.json({
      success: true,
      user: {
        id: authResult.user!.id,
        fullName: authResult.user!.user_metadata.full_name,
        email: authResult.user!.email,
        phone: authResult.user!.user_metadata.phone,
        role: 'CUSTOMER' // Default role for now
      },
      token: (authResult.session as SupabaseSession)?.access_token || 'temp-token',
      message: 'Login successful with Supabase'
    });
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
