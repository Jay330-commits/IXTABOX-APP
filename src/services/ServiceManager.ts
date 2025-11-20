import { AuthService } from './AuthService';
import { UserService } from './UserService';
import { DistributorService } from './DistributorService';

/**
 * ServiceManager class for dependency injection and singleton management
 */
export class ServiceManager {
  private static instance: ServiceManager;
  private authService: AuthService;
  private userService: UserService;
  private distributorService: DistributorService;

  private constructor() {
    this.authService = new AuthService();
    this.userService = new UserService();
    this.distributorService = new DistributorService();
  }

  /**
   * Get singleton instance of ServiceManager
   */
  public static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  /**
   * Get AuthService instance
   */
  public getAuthService(): AuthService {
    return this.authService;
  }

  /**
   * Get UserService instance
   */
  public getUserService(): UserService {
    return this.userService;
  }

  /**
   * Get DistributorService instance
   */
  public getDistributorService(): DistributorService {
    return this.distributorService;
  }

  /**
   * Reset services (useful for testing)
   */
  public resetServices(): void {
    this.authService = new AuthService();
    this.userService = new UserService();
    this.distributorService = new DistributorService();
  }
}

// Export singleton instance
export const serviceManager = ServiceManager.getInstance();
