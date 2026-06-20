import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/audit-client';

// TTL: 90 days in seconds
const AUDIT_TTL_SECONDS = 60 * 60 * 24 * 90;

@Injectable()
export class PrismaAuditService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaAuditService.name);

  async onModuleInit() {
    await this.$connect();
    await this.ensureTtlIndex();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async ensureTtlIndex(): Promise<void> {
    try {
      await this.$runCommandRaw({
        createIndexes: 'AuditLog',
        indexes: [
          {
            key: { createdAt: 1 },
            name: 'audit_ttl_90d',
            expireAfterSeconds: AUDIT_TTL_SECONDS,
          },
        ],
      });
    } catch (error) {
      // Fails silently if index already exists with identical options — that is expected.
      this.logger.warn(`TTL index setup: ${error?.message}`);
    }
  }
}
