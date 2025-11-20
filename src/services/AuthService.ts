import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../prisma-client/client';
import { UserService, CreateUserData, AuthResult } from './UserService';
import { BaseService } from './BaseService';

/**
 * AuthService class handling authentication operations
 */
export class AuthService extends BaseService {
  private userService: UserService;
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN: string;

  constructor() {
    super();
    this.userService = new UserService();
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Generate JWT token for user
   */
  generateToken(user: User): string {
    const payload = { 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    };
    const options: jwt.SignOptions = { 
      expiresIn: this.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] 
    };
    return jwt.sign(payload, this.JWT_SECRET, options);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): { userId: string; email: string; role: string } | null {
    try {
      return jwt.verify(token, this.JWT_SECRET) as { userId: string; email: string; role: string };
    } catch {
      return null;
    }
  }

  /**
   * Register a new user
   */
  async register(userData: CreateUserData): Promise<AuthResult> {
    try {
      // Hash password
      const hashedPassword = await this.hashPassword(userData.password);

      // Create user with hashed password
      const result = await this.userService.createUser({
        ...userData,
        password: hashedPassword
      });

      if (!result.success || !result.user) {
        return result;
      }

      // Generate token
      const token = this.generateToken(result.user);

      return {
        success: true,
        user: result.user,
        token
      };

    } catch (error) {
      this.handleError(error, 'AuthService.register');
    }
  }

  /**
   * Login user with email and password
   * Note: This method is deprecated as authentication is now handled by Supabase
   * Use Supabase client directly for authentication
   */
  async login(email: string): Promise<AuthResult> {
    try {
      // Find user by email
      const user = await this.userService.findByEmail(email);

      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Since authentication is handled by Supabase, we can't verify password here
      // This method should not be used for actual authentication
      // Use Supabase client directly instead
      return {
        success: false,
        message: 'Please use Supabase authentication instead of this method'
      };

    } catch (error) {
      this.handleError(error, 'AuthService.login');
    }
  }

  /**
   * Get user by token
   */
  async getUserByToken(token: string): Promise<User | null> {
    try {
      const decoded = this.verifyToken(token);
      if (!decoded) {
        return null;
      }

      return await this.userService.findById(decoded.userId);
    } catch {
      this.handleError(new Error('Token validation failed'), 'AuthService.getUserByToken');
    }
  }

  /**
   * Refresh token for user
   */
  async refreshToken(user: User): Promise<string> {
    return this.generateToken(user);
  }

  /**
   * Validate user session
   */
  async validateSession(token: string): Promise<{ valid: boolean; user?: User }> {
    try {
      const user = await this.getUserByToken(token);
      return {
        valid: !!user,
        user: user || undefined
      };
    } catch {
      return { valid: false };
    }
  }
}
