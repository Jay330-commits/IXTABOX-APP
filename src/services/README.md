# OOP Authentication System

This directory contains the Object-Oriented Programming (OOP) based authentication system for the IXTAbox application.

## Architecture Overview

The authentication system follows OOP principles with proper separation of concerns, dependency injection, and service-oriented architecture.

### Core Components

#### 1. BaseService (`BaseService.ts`)
- **Purpose**: Abstract base class providing common database operations
- **Features**:
  - Database transaction management
  - Consistent error handling
  - Prisma client access

#### 2. UserService (`UserService.ts`)
- **Purpose**: Handles all user-related database operations
- **Features**:
  - User CRUD operations
  - User creation with role-based related records
  - User search and filtering
  - Pagination support

#### 3. AuthService (`AuthService.ts`)
- **Purpose**: Handles authentication and authorization logic
- **Features**:
  - User registration and login
  - Password hashing and verification
  - JWT token generation and validation
  - Session management

#### 4. ServiceManager (`ServiceManager.ts`)
- **Purpose**: Dependency injection container and singleton manager
- **Features**:
  - Singleton pattern implementation
  - Service instance management
  - Dependency injection

## Usage Examples

### Basic Authentication

```typescript
import { serviceManager } from '@/services/ServiceManager';

// Get service instances
const authService = serviceManager.getAuthService();
const userService = serviceManager.getUserService();

// Register a new user
const result = await authService.register({
  fullName: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  password: 'securePassword123',
  role: Role.CUSTOMER
});

// Login user
const loginResult = await authService.login('john@example.com', 'securePassword123');

// Get user by token
const user = await authService.getUserByToken(token);
```

### User Management

```typescript
// Get all users with pagination
const users = await userService.getUsers(0, 10);

// Get users by role
const customers = await userService.getUsersByRole(Role.CUSTOMER);

// Update user information
const updatedUser = await userService.updateUser(userId, {
  fullName: 'Updated Name',
  phone: '+0987654321'
});

// Delete user
await userService.deleteUser(userId);
```

## API Integration

The service classes are integrated with Next.js API routes:

- `/api/auth/register` - User registration
- `/api/auth/login` - User login
- `/api/auth/me` - Get current user

## Design Patterns Used

1. **Singleton Pattern**: ServiceManager ensures single instances of services
2. **Dependency Injection**: Services are injected through ServiceManager
3. **Repository Pattern**: UserService acts as a repository for user data
4. **Service Layer Pattern**: Clear separation between business logic and data access
5. **Factory Pattern**: ServiceManager creates and manages service instances

## Benefits

- **Maintainability**: Clear separation of concerns
- **Testability**: Easy to mock and test individual services
- **Scalability**: Easy to add new services and features
- **Reusability**: Services can be used across different parts of the application
- **Type Safety**: Full TypeScript support with proper typing

## Error Handling

All services use consistent error handling through the BaseService class:

```typescript
try {
  // Service operation
} catch (error) {
  this.handleError(error, 'ServiceName.operationName');
}
```

## Database Transactions

Complex operations that require multiple database operations use transactions:

```typescript
const result = await this.executeTransaction(async (tx) => {
  // Multiple database operations
  const user = await tx.user.create({...});
  const customer = await tx.customer.create({...});
  return user;
});
```

## Security Features

- Password hashing with bcrypt (12 salt rounds)
- JWT token generation and validation
- Input validation and sanitization
- SQL injection prevention through Prisma ORM
- Role-based access control
