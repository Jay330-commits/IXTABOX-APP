import type { public_users as PrismaUser } from '@prisma/client';
import { Role, ContractType } from '@prisma/client';
import { BaseService } from '../BaseService';

type User = PrismaUser;

export interface CreateUserData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role?: Role;
}

export interface UpdateUserData {
  fullName?: string;
  phone?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  address?: any; // Prisma Json type
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

/**
 * UserService class handling all user-related operations
 */
export class UserService extends BaseService {
  /**
   * Link a Supabase auth user into public.users via Prisma (no password handling)
   * Ensures a Customer row exists and creates related customer record if needed
   */
  async linkAuthUserAsCustomer(params: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
  }): Promise<User> {
    try {
      // Normalize phone: treat empty strings as null
      const phoneValue = params.phone?.trim() || null;
      
      // Use raw query to handle enum type that might not exist in DB yet
      // First try upsert with Prisma, fallback to raw SQL if enum type doesn't exist
      try {
        const user = await this.prisma.public_users.upsert({
          where: { id: params.id },
          update: {
            full_name: params.fullName,
            email: params.email,
            phone: phoneValue,
            role: Role.Customer,
          },
          create: {
            id: params.id,
            full_name: params.fullName,
            email: params.email,
            phone: phoneValue,
            role: Role.Customer,
          }
        });

        // Ensure customer record exists
        const existingCustomer = await this.prisma.customer.findFirst({ where: { user_id: user.id } });
          if (!existingCustomer) {
            await this.prisma.customer.create({
            data: { user_id: user.id }
            });
        }

        return user;
      } catch (enumError: unknown) {
        // If enum type doesn't exist, use raw SQL with text role
        const error = enumError as Error;
        if (error?.message?.includes('type') && error?.message?.includes('does not exist')) {
          // Escape values for safe SQL insertion
          const escapedId = params.id.replace(/'/g, "''");
          const escapedFullName = params.fullName.replace(/'/g, "''");
          const escapedEmail = params.email.replace(/'/g, "''");
          // Use normalized phoneValue (already trimmed/null from above)
          const escapedPhone = phoneValue ? phoneValue.replace(/'/g, "''") : null;
          const sqlPhoneValue = escapedPhone ? `'${escapedPhone}'` : 'NULL';
          
          await this.prisma.$executeRawUnsafe(`
            INSERT INTO public.users (id, full_name, email, phone, role, created_at, updated_at)
            VALUES ('${escapedId}'::uuid, '${escapedFullName}', '${escapedEmail}', ${sqlPhoneValue}, 'Customer'::public."Role", NOW(), NOW())
            ON CONFLICT (id) 
            DO UPDATE SET 
              full_name = EXCLUDED.full_name,
              email = EXCLUDED.email,
              phone = EXCLUDED.phone,
              role = EXCLUDED.role,
              updated_at = NOW()
          `);

          // Ensure customer record exists
          await this.prisma.$executeRawUnsafe(`
            INSERT INTO public.customers (id, user_id, loyalty_points)
            SELECT gen_random_uuid(), '${escapedId}'::uuid, 0
            WHERE NOT EXISTS (SELECT 1 FROM public.customers WHERE user_id = '${escapedId}'::uuid)
          `);

          // Fetch the created/updated user
          const user = await this.prisma.public_users.findUnique({
            where: { id: params.id }
          });

          if (!user) {
            throw new Error('Failed to create user record');
          }

          return user;
        }
        throw enumError;
      }
    } catch (error) {
      this.handleError(error, 'UserService.linkAuthUserAsCustomer');
    }
  }

  /**
   * Link a Supabase auth user into public.users via Prisma (no password handling)
   * Ensures a Distributor row exists - but does NOT create the distributor record
   * The distributor record should be created separately using DistributorService
   */
  async linkAuthUserAsDistributor(params: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
  }): Promise<User> {
    try {
      // Normalize phone: treat empty strings as null
      const phoneValue = params.phone?.trim() || null;

      try {
        const user = await this.prisma.public_users.upsert({
          where: { id: params.id },
          update: {
            full_name: params.fullName,
            email: params.email,
            phone: phoneValue,
            role: Role.Distributor,
          },
          create: {
            id: params.id,
            full_name: params.fullName,
            email: params.email,
            phone: phoneValue,
            role: Role.Distributor,
          },
        });

        return user;
      } catch (enumError: unknown) {
        // If enum type doesn't exist, use raw SQL with text role
        const error = enumError as Error;
        if (error?.message?.includes('type') && error?.message?.includes('does not exist')) {
          // Escape values for safe SQL insertion
          const escapedId = params.id.replace(/'/g, "''");
          const escapedFullName = params.fullName.replace(/'/g, "''");
          const escapedEmail = params.email.replace(/'/g, "''");
          const escapedPhone = phoneValue ? phoneValue.replace(/'/g, "''") : null;
          const sqlPhoneValue = escapedPhone ? `'${escapedPhone}'` : 'NULL';

          await this.prisma.$executeRawUnsafe(`
            INSERT INTO public.users (id, full_name, email, phone, role, created_at, updated_at)
            VALUES ('${escapedId}'::uuid, '${escapedFullName}', '${escapedEmail}', ${sqlPhoneValue}, 'Distributor'::public."Role", NOW(), NOW())
            ON CONFLICT (id) 
            DO UPDATE SET 
              full_name = EXCLUDED.full_name,
              email = EXCLUDED.email,
              phone = EXCLUDED.phone,
              role = EXCLUDED.role,
              updated_at = NOW()
          `);

          // Fetch the created/updated user
          const user = await this.prisma.public_users.findUnique({
            where: { id: params.id },
          });

          if (!user) {
            throw new Error('Failed to create user record');
          }

          return user;
        }
        throw enumError;
      }
    } catch (error) {
      this.handleError(error, 'UserService.linkAuthUserAsDistributor');
    }
  }

  /**
   * Create a new user with related records
   * Note: This method is for creating users directly in Prisma.
   * For Supabase auth users, use linkAuthUserAsCustomer or linkAuthUserAsDistributor instead.
   */
  async createUser(userData: CreateUserData): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existingUser = await this.prisma.public_users.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        return {
          success: false,
          message: 'User with this email already exists'
        };
      }

      // Create user with related records in a transaction
      // Note: Password is not stored in Prisma - authentication is handled by Supabase Auth
      const result = await this.executeTransaction(async (tx) => {
        // Create user (password field removed - handled by Supabase Auth)
        const user = await tx.public_users.create({
          data: {
            full_name: userData.fullName,
            email: userData.email,
            phone: userData.phone,
            role: userData.role || Role.Customer,
          }
        });

        const assignedRole = userData.role || Role.Customer;

        if (assignedRole === Role.Customer) {
          await tx.customer.create({
            data: {
              user_id: user.id,
            }
          });
        }

        if (assignedRole === Role.Distributor) {
          await tx.distributor.create({
            data: {
              user_id: user.id,
              company_name: 'Temporary Company',
              reg_number: 'TEMP123',
              contact_person: userData.fullName,
              business_type: 'Other',
              contract_type: ContractType.Leasing, // Default contract type
            }
          });
        }

        return user;
      });

      return {
        success: true,
        user: result,
      };

    } catch (error) {
      this.handleError(error, 'UserService.createUser');
    }
  }

  /**
   * Find user by ID
   */
  async findById(userId: string): Promise<User | null> {
    try {
      return await this.prisma.public_users.findUnique({
        where: { id: userId }
      });
    } catch (error) {
      this.handleError(error, 'UserService.findById');
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.prisma.public_users.findUnique({
        where: { email }
      });
    } catch (error) {
      this.handleError(error, 'UserService.findByEmail');
    }
  }

  /**
   * Update user information
   */
  async updateUser(userId: string, userData: UpdateUserData): Promise<User> {
    try {
      return await this.prisma.public_users.update({
        where: { id: userId },
        data: userData
      });
    } catch (error) {
      this.handleError(error, 'UserService.updateUser');
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      await this.prisma.public_users.delete({
        where: { id: userId }
      });
    } catch (error) {
      this.handleError(error, 'UserService.deleteUser');
    }
  }

  /**
   * Get all users with pagination
   */
  async getUsers(skip = 0, take = 10): Promise<User[]> {
    try {
      return await this.prisma.public_users.findMany({
        skip,
        take,
        orderBy: { created_at: 'desc' }
      });
    } catch (error) {
      this.handleError(error, 'UserService.getUsers');
    }
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: Role): Promise<User[]> {
    try {
      return await this.prisma.public_users.findMany({
        where: { role },
        orderBy: { created_at: 'desc' }
      });
    } catch (error) {
      this.handleError(error, 'UserService.getUsersByRole');
    }
  }

  /**
   * Create a guest user from Stripe payment billing details (without auth account)
   * Creates both minimal auth_users entry and public_users entry
   */
  async createGuestUserFromStripeBilling(params: {
    email: string;
    fullName: string;
    phone?: string;
    billingAddress?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  }): Promise<User> {
    try {
      const userId = crypto.randomUUID();
      const phoneValue = params.phone?.trim() || null;
      
      // Prepare billing address JSON
      const addressJson = params.billingAddress ? {
        line1: params.billingAddress.line1 || null,
        line2: params.billingAddress.line2 || null,
        city: params.billingAddress.city || null,
        state: params.billingAddress.state || null,
        postal_code: params.billingAddress.postal_code || null,
        country: params.billingAddress.country || null,
      } : null;

      // Use raw SQL to create both auth_users and public_users in a transaction
      // This ensures we satisfy the FK constraint while creating a "guest" user without auth
      // First, check if user already exists by email and get the ID
      const existingUserByEmail = await this.prisma.public_users.findUnique({
        where: { email: params.email },
      });

      let finalUserId = userId;
      if (existingUserByEmail) {
        // User exists, use existing ID
        finalUserId = existingUserByEmail.id;
        console.log('Guest user already exists with email:', params.email, 'ID:', finalUserId);
      } else {
        // Create new guest user
        await this.prisma.$executeRawUnsafe(`
          -- Create minimal auth_users entry (to satisfy FK constraint)
          INSERT INTO auth.users (
            id, 
            email, 
            aud, 
            role, 
            email_confirmed_at, 
            created_at, 
            updated_at,
            is_anonymous,
            raw_user_meta_data
          ) VALUES (
            '${userId}'::uuid,
            '${params.email.replace(/'/g, "''")}',
            'authenticated',
            'authenticated',
            NOW(),
            NOW(),
            NOW(),
            false,
            '{"is_guest": true, "full_name": "${params.fullName.replace(/'/g, "''")}"}'::jsonb
          ) ON CONFLICT (id) DO NOTHING;
          
          -- Create public_users entry
          INSERT INTO public.users (
            id,
            full_name,
            email,
            phone,
            address,
            role,
            created_at,
            updated_at
          ) VALUES (
            '${userId}'::uuid,
            '${params.fullName.replace(/'/g, "''")}',
            '${params.email.replace(/'/g, "''")}',
            ${phoneValue ? `'${phoneValue.replace(/'/g, "''")}'` : 'NULL'},
            ${addressJson ? `'${JSON.stringify(addressJson).replace(/'/g, "''")}'::jsonb` : 'NULL'},
            'Guest'::public."Role",
            NOW(),
            NOW()
          ) ON CONFLICT (email) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            phone = COALESCE(EXCLUDED.phone, public.users.phone),
            address = COALESCE(EXCLUDED.address, public.users.address),
            updated_at = NOW();
        `);
        console.log('Created new guest user with ID:', userId);
      }

      // Fetch and return the created user (use finalUserId which might be existing user's ID)
      const user = await this.prisma.public_users.findUnique({
        where: { id: finalUserId },
      });

      if (!user) {
        throw new Error(`Failed to create or retrieve guest user with ID: ${finalUserId}`);
      }

      console.log('Guest user ready:', user.id, user.email, user.role);
      return user;
    } catch (error) {
      this.handleError(error, 'UserService.createGuestUserFromStripeBilling');
      throw error;
    }
  }

  /**
   * Find or create guest user by email (useful for linking payments)
   */
  async findOrCreateGuestUser(params: {
    email: string;
    fullName: string;
    phone?: string;
    billingAddress?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  }): Promise<User> {
    try {
      // Try to find existing user by email
      const existingUser = await this.prisma.public_users.findUnique({
        where: { email: params.email },
      });

      if (existingUser) {
        return existingUser;
      }

      // Create new guest user
      return await this.createGuestUserFromStripeBilling(params);
    } catch (error) {
      this.handleError(error, 'UserService.findOrCreateGuestUser');
      throw error;
    }
  }
}
