import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { registerWithSupabase, SupabaseSession } from '@/lib/supabase-auth';
import { UserService } from '@/services/user/UserService';
import { IxtaownerService } from '@/services/ixtaowners/IxtaownerService';
import { LocationService } from '@/services/locations/LocationService';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        {
          success: false,
          message: 'Server configuration error. Please contact support.',
          error: 'Missing Supabase configuration',
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      fullName,
      email,
      phone,
      password,
      address, // string, required
      locationName,
      lat,
      lng,
    } = body;

    if (!fullName?.trim() || !email?.trim() || !password?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Full name, email, and password are required' },
        { status: 400 }
      );
    }

    if (!address?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Address is required for IXTAowner registration' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, message: 'Invalid email format' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const userService = new UserService();
    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Email is already registered' },
        { status: 400 }
      );
    }

    const authResult = await registerWithSupabase({
      fullName,
      email,
      phone: phone || '',
      password,
    });

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, message: authResult.message || 'Registration failed' },
        { status: 400 }
      );
    }

    const userId = authResult.user.id;
    const phoneToStore = phone?.trim() || null;

    try {
      await userService.linkAuthUserAsIxtaowner({
        id: userId,
        fullName,
        email,
        phone: phoneToStore || undefined,
      });

      await userService.updateUser(userId, {
        address: {
          address: address.trim(),
          type: 'home',
        },
      });

      const ixtaownerService = new IxtaownerService();
      const ixtaowner = await ixtaownerService.createIxtaowner({
        userId,
        legalName: fullName,
      });

      const locationService = new LocationService();
      const createdLocation = await locationService.createLocation({
        ixtaownerId: ixtaowner.id,
        name: (locationName || 'Home IXTAbox location').trim(),
        address: address.trim(),
        coordinates:
          lat != null && lng != null
            ? { lat, lng }
            : null,
      });

      return NextResponse.json({
        success: true,
        user: {
          id: userId,
          fullName,
          email,
          phone: phoneToStore,
          role: 'Ixtaowner',
        },
        ixtaowner: {
          id: ixtaowner.id,
          legalName: ixtaowner.legal_name,
          verified: ixtaowner.verified,
        },
        location: {
          id: createdLocation.id,
          name: createdLocation.name,
          displayId: createdLocation.display_id,
        },
        token: (authResult.session as SupabaseSession)?.access_token || 'temp-token',
        message: 'IXTAowner registered successfully.',
      });
    } catch (dbError) {
      console.error('Database operation failed during ixtaowner registration:', dbError);
      return NextResponse.json(
        {
          success: false,
          message: 'Account created but IXTAowner registration incomplete. Please contact support.',
          error: dbError instanceof Error ? dbError.message : 'Database error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('IXTAowner registration API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

