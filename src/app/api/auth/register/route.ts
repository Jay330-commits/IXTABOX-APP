import { NextRequest, NextResponse } from 'next/server';
import { registerWithSupabase, SupabaseSession } from '@/lib/supabase-auth';
import { UserService } from '@/services/UserService';

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
    const { fullName, email, phone, password } = body;

    console.log('Registration request body:', { fullName, email, phone, hasPhone: !!phone, phoneLength: phone?.length });

    // Validate required fields
    if (!fullName || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Full name, email, and password are required' },
        { status: 400 }
      );
    }

    // Phone is optional but warn if empty
    if (!phone || phone.trim() === '') {
      console.warn('Phone field is empty or missing in registration request');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Register with Supabase Auth
    console.log('Attempting Supabase registration for:', email);
    const authResult = await registerWithSupabase({
      fullName,
      email,
      phone,
      password
    });

    console.log('Supabase registration result:', authResult);

    if (!authResult.success) {
      console.log('Supabase registration failed:', authResult.message);
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: 400 }
      );
    }

    // Create/Upsert linked row in public.users via Prisma (role = CUSTOMER)
    // Use phone from request body, not from user_metadata (which might be wrong)
    const phoneToStore = phone?.trim() || null;
    console.log('Storing phone in database:', phoneToStore);
    
    try {
      const userService = new UserService();
      await userService.linkAuthUserAsCustomer({
        id: authResult.user!.id,
        fullName,
        email,
        phone: phoneToStore || undefined
      });
    } catch (linkError) {
      console.error('Failed to create public.users row:', linkError);
      // We continue; auth user exists. Consider compensating action/alerting.
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authResult.user!.id,
        fullName: authResult.user!.user_metadata.full_name || fullName,
        email: authResult.user!.email,
        phone: phoneToStore || authResult.user!.user_metadata.phone || null,
        role: 'Customer'
      },
      token: (authResult.session as SupabaseSession)?.access_token || 'temp-token',
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('Registration API error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
