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
        const existing = await this.prisma.ixtaowners.findUnique({
          where: { user_id: data.userId },
        });

        if (existing) {
          throw new Error('Ixtaowner already exists for this user');
        }

        const ixtaowner = await this.prisma.ixtaowners.create({
          data: {
            user_id: data.userId,
            legal_name: data.legalName,
            verified: false,
          },
          include: {
            users: true,
          },
        });

        return ixtaowner;
      },
      'IxtaownerService.createIxtaowner',
      { userId: data.userId }
    );
  }
}

