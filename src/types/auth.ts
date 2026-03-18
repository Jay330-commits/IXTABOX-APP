// Client-side auth types (separate from Prisma types to avoid Edge Runtime issues)

export enum Role {
  GUEST = 'GUEST',
  CUSTOMER = 'CUSTOMER',
  DISTRIBUTOR = 'DISTRIBUTOR',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  address: Record<string, unknown> | null;
  role: Role;
  password: string | null;
  createdAt: Date;
  updatedAt: Date;
}
