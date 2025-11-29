import { NextRequest, NextResponse } from 'next/server';
import { loginWithSupabase, SupabaseSession } from '@/lib/supabase-auth';
import { UserService } from '@/services/UserService';
import { prisma } from '@/lib/prisma/prisma';
import { Role } from '@prisma/client';

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

    if (!authResult.success || !authResult.user) {
      console.log('Supabase login failed:', authResult.message);
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: 401 }
      );
    }

    const supabaseUser = authResult.user;
    const userService = new UserService();

    // Try to fetch user from Prisma database
    let user;
    try {
      user = await prisma.public_users.findUnique({
        where: { email: supabaseUser.email! },
        include: {
          customers: true,
          distributors: true,
          admins: true,
        },
      });
    } catch (dbError: unknown) {
      console.error('Database connection error:', dbError);
      
      // Check if it's a connection error
      const errorMessage = dbError instanceof Error ? dbError.message : '';
      const errorCode = typeof dbError === 'object' && dbError && 'code' in dbError ? (dbError as { code?: string }).code : undefined;
      const errorName = dbError instanceof Error ? dbError.name : undefined;

      if (errorMessage.includes("Can't reach database server") || 
          errorCode === 'P1001' || 
          errorName === 'PrismaClientInitializationError') {
        console.error('Database connection failed. Check:');
        console.error('1. DATABASE_URL is set correctly in .env.local');
        console.error('2. Database server is running and accessible');
        console.error('3. Network/firewall allows connection to Supabase');
        console.error('4. Supabase project is active and not paused');
        
        return NextResponse.json(
          { 
            success: false, 
            message: 'Database connection failed. Please check your database configuration or try again later.',
            error: 'DATABASE_CONNECTION_ERROR'
          },
          { status: 503 } // Service Unavailable
        );
      }
      
      // Re-throw other database errors
      throw dbError;
    }

    // If user doesn't exist in Prisma, create/link them
    if (!user) {
      console.log('User not found in Prisma, creating/linking user...');
      try {
        // Use the Supabase user ID and metadata to create Prisma user
        const fullName = supabaseUser.user_metadata?.full_name || email.split('@')[0];
        const phone = supabaseUser.user_metadata?.phone || null;

        // Link auth user as customer (default role)
        user = await userService.linkAuthUserAsCustomer({
          id: supabaseUser.id,
          fullName,
          email: supabaseUser.email!,
          phone: phone || undefined,
        });

        console.log('Successfully created/linked user in Prisma');
      } catch (linkError) {
        console.error('Failed to create/link user in Prisma:', linkError);
        // Try to fetch again in case it was created
        user = await prisma.public_users.findUnique({
          where: { email: supabaseUser.email! },
          include: {
            customers: true,
            distributors: true,
            admins: true,
          },
        });
      }
    }

    // Determine redirect path based on user role
    const getRedirectPath = (role: Role | string | null | undefined): string => {
      if (!role) {
        return '/';
      }
      
      // Direct enum comparison (works when role is a Role enum)
      if (role === Role.Customer) {
        return '/customer';
      } else if (role === Role.Distributor) {
        return '/distributor';
      } else if (role === Role.Admin) {
        return '/admin';
      } else if (role === Role.Guest) {
        return '/guest';
      }
      
      // String comparison fallback (works when role is serialized as string)
      const roleStr = String(role);
      if (roleStr === 'Customer') {
        return '/customer';
      } else if (roleStr === 'Distributor') {
        return '/distributor';
      } else if (roleStr === 'Admin') {
        return '/admin';
      } else if (roleStr === 'Guest') {
        return '/guest';
      }
      
      console.warn('Unknown role value:', role, 'Type:', typeof role, 'String:', roleStr, 'defaulting to home');
      return '/';
    };

    // Return user data from Prisma if available, otherwise fallback to Supabase data
    if (user) {
      console.log('User role from database:', user.role, 'Type:', typeof user.role);
      const redirectPath = getRedirectPath(user.role);
      console.log('Redirect path determined:', redirectPath);
      
      // Map Prisma Role enum (PascalCase) to client Role enum (UPPERCASE)
      const roleMap: Record<string, string> = {
        'Guest': 'GUEST',
        'Customer': 'CUSTOMER',
        'Distributor': 'DISTRIBUTOR',
        'Admin': 'ADMIN'
      };
      const clientRole = roleMap[String(user.role)] || 'GUEST';
      console.log('Mapped role from', user.role, 'to', clientRole);
      
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          phone: user.phone,
          role: clientRole, // Use mapped role
        },
        redirectPath,
        token: (authResult.session as SupabaseSession)?.access_token || 'temp-token',
        message: 'Login successful'
      });
    }

    // Final fallback: return Supabase user data
    // If user doesn't exist in Prisma, we can't determine their role
    // This should not happen in normal flow, but if it does, return error
    console.error('User not found in Prisma database after login attempt');
    return NextResponse.json({
      success: false,
      message: 'User account not properly set up. Please contact support.'
    }, { status: 500 });
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
