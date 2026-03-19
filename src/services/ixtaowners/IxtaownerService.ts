import 'server-only';
import { BaseService } from '../BaseService';

export interface CreateIxtaownerData {
  userId: string;
  legalName: string;
}

export class IxtaownerService extends BaseService {
  /**
   * Create an ixtaowner profile linked to a user
   */
  async createIxtaowner(data: CreateIxtaownerData) {
    return await this.logOperation(
      'CREATE_IXTAOWNER',
      async () => {
        // Use raw SQL here because the generated Prisma client in this environment
        // does not expose an `ixtaowners` delegate, while the table may still exist.
        const existing = await this.prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id
          FROM "public"."ixtaowners"
          WHERE user_id = ${data.userId}::uuid
          LIMIT 1
        `;

        if (existing.length > 0) {
          throw new Error('Ixtaowner already exists for this user');
        }

        const inserted = await this.prisma.$queryRaw<
          Array<{
            id: string;
            user_id: string;
            legal_name: string;
            verified: boolean;
            created_at: Date | null;
            updated_at: Date | null;
          }>
        >`
          INSERT INTO "public"."ixtaowners" (user_id, legal_name, verified)
          VALUES (${data.userId}::uuid, ${data.legalName}, false)
          RETURNING id, user_id, legal_name, verified, created_at, updated_at
        `;

        const ixtaowner = inserted[0];
        const user = await this.prisma.public_users.findUnique({
          where: { id: data.userId },
        });

        return {
          ...ixtaowner,
          users: user,
        };
      },
      'IxtaownerService.createIxtaowner',
      { userId: data.userId }
    );
  }
}

