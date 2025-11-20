import { User, Role } from '../prisma-client/client';
import { BaseService } from './BaseService';

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
        const user = await this.prisma.user.upsert({
          where: { id: params.id },
          update: {
            fullName: params.fullName,
            email: params.email,
            phone: phoneValue,
            role: Role.CUSTOMER,
          },
          create: {
            id: params.id,
            fullName: params.fullName,
            email: params.email,
            phone: phoneValue,
            role: Role.CUSTOMER,
          }
        });

        // Ensure customer record exists
        if (user.role === Role.CUSTOMER) {
          const existingCustomer = await this.prisma.customer.findFirst({ where: { userId: user.id } });
          if (!existingCustomer) {
            await this.prisma.customer.create({
              data: { userId: user.id }
            });
          }
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
            VALUES ('${escapedId}'::uuid, '${escapedFullName}', '${escapedEmail}', ${sqlPhoneValue}, 'CUSTOMER', NOW(), NOW())
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
          const user = await this.prisma.user.findUnique({
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
        const user = await this.prisma.user.upsert({
          where: { id: params.id },
          update: {
            fullName: params.fullName,
            email: params.email,
            phone: phoneValue,
            role: Role.DISTRIBUTOR,
          },
          create: {
            id: params.id,
            fullName: params.fullName,
            email: params.email,
            phone: phoneValue,
            role: Role.DISTRIBUTOR,
          },
        });

        // Note: We don't create distributor record here
        // It should be created separately using DistributorService.createDistributor
        // This ensures separation of concerns and allows for proper validation

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
            VALUES ('${escapedId}'::uuid, '${escapedFullName}', '${escapedEmail}', ${sqlPhoneValue}, 'DISTRIBUTOR', NOW(), NOW())
            ON CONFLICT (id) 
            DO UPDATE SET 
              full_name = EXCLUDED.full_name,
              email = EXCLUDED.email,
              phone = EXCLUDED.phone,
              role = EXCLUDED.role,
              updated_at = NOW()
          `);

          // Fetch the created/updated user
          const user = await this.prisma.user.findUnique({
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
   */
  async createUser(userData: CreateUserData): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        return {
          success: false,
          message: 'User with this email already exists'
        };
      }

      // Create user with related records in a transaction
      const result = await this.executeTransaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            fullName: userData.fullName,
            email: userData.email,
            phone: userData.phone,
            role: userData.role || Role.CUSTOMER,
            password: userData.password, // Password should already be hashed
          }
        });

        // Create customer record if role is CUSTOMER
        if (user.role === Role.CUSTOMER) {
          await tx.customer.create({
            data: {
              userId: user.id,
            }
          });
        }

        // Create distributor record if role is DISTRIBUTOR
        if (user.role === Role.DISTRIBUTOR) {
          await tx.distributor.create({
            data: {
              userId: user.id,
              companyName: 'Temporary Company',
              regNumber: 'TEMP123',
              contactPerson: userData.fullName,
              businessType: 'Other',
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
      return await this.prisma.user.findUnique({
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
      return await this.prisma.user.findUnique({
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
      return await this.prisma.user.update({
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
      await this.prisma.user.delete({
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
      return await this.prisma.user.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' }
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
      return await this.prisma.user.findMany({
        where: { role },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      this.handleError(error, 'UserService.getUsersByRole');
    }
  }
}
