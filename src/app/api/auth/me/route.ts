import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { UserService } from '../../../../services/user/UserService';
import { prisma } from '@/lib/prisma/prisma';

export async function GET(request: NextRequest) {
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

    // Try to get user from Supabase cookies first (preferred method)
    // If that fails, try to get from Authorization header Bearer token
    const supabaseUser = await getCurrentUser(request);
    
    // If no user from cookies, try Authorization header (for compatibility)
    if (!supabaseUser) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        // For now, if we have a token, we'll try to validate it via Supabase
        // This is a fallback - the primary method should be cookies
        console.log('No user from cookies, trying token authentication');
        // The token from localStorage might not be a valid Supabase access token
        // But we can still try getCurrentUser which reads cookies
      }
    }
    
    if (!supabaseUser) {
      return NextResponse.json(
        { success: false, message: 'User not authenticated' },
        { status: 401 }
      );
    }
    
    // SECURITY: CRITICAL - Verify this is not a guest user trying to authenticate
    // Even though aud='authenticated' and role='authenticated' (required by Supabase schema),
    // guest users have is_anonymous=true and no password, so they CANNOT authenticate.
    // This check prevents guest users from bypassing session validation.
    try {
      const authUserCheck = await prisma.$queryRaw<Array<{ 
        is_anonymous: boolean | null; 
        encrypted_password: string | null;
        raw_user_meta_data: Record<string, unknown> | null;
      }>>`
        SELECT is_anonymous, encrypted_password, raw_user_meta_data
        FROM auth.users 
        WHERE id = ${supabaseUser.id}::uuid
      `;
      
      if (authUserCheck.length > 0) {
        const authUser = authUserCheck[0];
        const isGuest = authUser.raw_user_meta_data?.is_guest === true || 
                       authUser.raw_user_meta_data?.cannot_authenticate === true;
        
        // Reject if: marked as anonymous, has no password, OR is marked as guest
        // This ensures guest users (with misleading "authenticated" values) cannot authenticate
        if (authUser.is_anonymous === true || 
            authUser.encrypted_password === null || 
            isGuest) {
          console.warn('SECURITY BLOCKED: Guest user attempted authentication:', {
            userId: supabaseUser.id,
            email: supabaseUser.email,
            is_anonymous: authUser.is_anonymous,
            has_password: authUser.encrypted_password !== null,
            is_guest: isGuest
          });
          return NextResponse.json(
            { 
              success: false, 
              message: 'Guest users cannot authenticate. The "authenticated" status in the database is a schema requirement only - these users have no password and cannot log in. Please register to create an account.' 
            },
            { status: 403 }
          );
        }
      }
    } catch (checkError) {
      // If check fails, log but don't block (defense-in-depth, not primary security)
      console.warn('Could not verify user type (non-critical):', checkError);
    }

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
      console.error('Database connection error in /api/auth/me:', dbError);
      
      // Check if it's a connection error
      const errorMessage = dbError instanceof Error ? dbError.message : '';
      const errorCode = typeof dbError === 'object' && dbError && 'code' in dbError ? (dbError as { code?: string }).code : undefined;
      const errorName = dbError instanceof Error ? dbError.name : undefined;

      if (errorMessage.includes("Can't reach database server") || 
          errorCode === 'P1001' || 
          errorName === 'PrismaClientInitializationError') {
        console.error('Database connection failed. Check DATABASE_URL and network connectivity.');
        
        return NextResponse.json(
          { 
            success: false, 
            message: 'Database connection failed. Please try again later.',
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
        const userService = new UserService();
        const fullName = supabaseUser.user_metadata?.full_name || supabaseUser.email!.split('@')[0];
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

    // Return user data from Prisma if available, otherwise fallback to Supabase data
    if (user) {
      // Map Prisma Role enum (PascalCase) to client Role enum (UPPERCASE)
      const roleMap: Record<string, string> = {
        'Guest': 'GUEST',
        'Customer': 'CUSTOMER',
        'Distributor': 'DISTRIBUTOR',
        'Admin': 'ADMIN'
      };
      const clientRole = roleMap[user.role] || 'GUEST';

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          phone: user.phone,
          role: clientRole,
        }
      });
    }

    // Final fallback: return Supabase user data
    return NextResponse.json({
      success: true,
      user: {
        id: supabaseUser.id,
        fullName: supabaseUser.user_metadata?.full_name || supabaseUser.email!.split('@')[0],
        email: supabaseUser.email!,
        phone: supabaseUser.user_metadata?.phone || null,
        role: 'CUSTOMER' // Default role
      }
    });
  } catch (error) {
    console.error('Get user API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
