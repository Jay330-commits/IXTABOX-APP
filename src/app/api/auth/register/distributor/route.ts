import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { registerWithSupabase, SupabaseSession } from '@/lib/supabase-auth';
import { UserService } from '@/services/UserService';
import { DistributorService } from '@/services/DistributorService';
import { ContractType } from '@/prisma-client/client';

export async function POST(request: NextRequest) {
  try {
    // Check if Supabase environment variables are set
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
      companyName,
      regNumber,
      businessAddress,
      website,
      contactPerson,
      businessType,
      yearsInBusiness,
      expectedMonthlyBookings,
      marketingChannels,
      businessDescription,
      contractType,
    } = body;

    // Validate required fields for user registration (check for empty strings too)
    if (!fullName?.trim() || !email?.trim() || !password?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Full name, email, and password are required' },
        { status: 400 }
      );
    }

    // Validate required fields for distributor registration (check for empty strings too)
    if (
      !companyName?.trim() ||
      !regNumber?.trim() ||
      !contactPerson?.trim() ||
      !businessType?.trim() ||
      !contractType?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Company name, registration number, contact person, business type, and contract type are required',
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, message: 'Invalid email format' }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Validate contract type
    const validContractTypes: ContractType[] = [
      ContractType.HYBRID,
      ContractType.LEASING,
      ContractType.OWNING,
      ContractType.BASIC,
    ];
    if (!validContractTypes.includes(contractType)) {
      return NextResponse.json(
        { success: false, message: 'Invalid contract type' },
        { status: 400 }
      );
    }

    // Check if email is already registered
    const userService = new UserService();
    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Email is already registered' },
        { status: 400 }
      );
    }

    // Register with Supabase Auth
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
      // Link auth user to User table with DISTRIBUTOR role
      const user = await userService.linkAuthUserAsDistributor({
        id: userId,
        fullName,
        email,
        phone: phoneToStore || undefined,
      });

      // Save business address to User.address field if provided
      if (businessAddress?.trim()) {
        await userService.updateUser(userId, {
          address: {
            businessAddress: businessAddress.trim(),
            type: 'business',
          },
        });
      }

      // Create distributor record
      const distributorService = new DistributorService();
      const distributor = await distributorService.createDistributor({
        userId,
        companyName,
        regNumber,
        website: website || undefined,
        contactPerson,
        businessType,
        yearsInBusiness: yearsInBusiness || undefined,
        expectedMonthlyBookings: expectedMonthlyBookings || undefined,
        marketingChannels: marketingChannels || [],
        businessDescription: businessDescription || undefined,
        contractType: contractType as ContractType,
      });

      return NextResponse.json({
        success: true,
        user: {
          id: userId,
          fullName,
          email,
          phone: phoneToStore,
          role: 'Distributor',
        },
        distributor: {
          id: distributor.id,
          companyName: distributor.companyName,
          contractType: distributor.contractType,
        },
        token: (authResult.session as SupabaseSession)?.access_token || 'temp-token',
        message: 'Distributor registered successfully. Your application is under review.',
      });
    } catch (dbError) {
      console.error('Database operation failed during distributor registration:', dbError);
      // Note: Auth user was created, but database operations failed
      // In production, you might want to implement a cleanup/rollback mechanism
      return NextResponse.json(
        {
          success: false,
          message:
            'Account created but distributor registration incomplete. Please contact support.',
          error: dbError instanceof Error ? dbError.message : 'Database error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Distributor registration API error:', error);
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


