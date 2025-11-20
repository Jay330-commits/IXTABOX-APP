import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';

export async function GET() {
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

    const supabaseUser = await getCurrentUser();
    
    if (!supabaseUser) {
      return NextResponse.json(
        { success: false, message: 'User not authenticated' },
        { status: 401 }
      );
    }

    // For now, just return the Supabase user data without Prisma
    // TODO: Add Prisma database integration later
    return NextResponse.json({
      success: true,
      user: {
        id: supabaseUser.id,
        fullName: supabaseUser.user_metadata.full_name,
        email: supabaseUser.email,
        phone: supabaseUser.user_metadata.phone,
        role: 'CUSTOMER' // Default role for now
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
