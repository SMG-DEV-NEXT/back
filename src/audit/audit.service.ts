import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

type AuditPayload = {
  type: 'security' | 'admin';
  event: string;
  severity?: 'info' | 'warn' | 'error';
  userId?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  ip?: string | null;
  method?: string | null;
  path?: string | null;
  userAgent?: string | null;
  statusCode?: number | null;
  metadata?: Record<string, any> | null;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly sensitiveKeys = new Set([
    'password',
    'token',
    'access_token',
    'refresh_token',
    'authorization',
    'cookie',
    'secret',
    'signature',
    'sign',
    'hash',
    'api_key',
    'apikey',
  ]);

  constructor(private readonly prisma: PrismaService) {}

  sanitize(value: any): any {
    if (value === null || value === undefined) return value;
    if (Array.isArray(value)) return value.map((item) => this.sanitize(item));
    if (typeof value !== 'object') return value;

    return Object.entries(value).reduce((acc, [key, item]) => {
      const normalizedKey = key.toLowerCase();
      acc[key] = this.sensitiveKeys.has(normalizedKey)
        ? '[REDACTED]'
        : this.sanitize(item);
      return acc;
    }, {} as Record<string, any>);
  }

  async record(payload: AuditPayload) {
    try {
      await (this.prisma as any).auditLog.create({
        data: {
          type: payload.type,
          event: payload.event,
          severity: payload.severity || 'info',
          userId: payload.userId || null,
          userEmail: payload.userEmail || null,
          userRole: payload.userRole || null,
          ip: payload.ip || null,
          method: payload.method || null,
          path: payload.path || null,
          userAgent: payload.userAgent || null,
          statusCode: payload.statusCode || null,
          metadata: this.sanitize(payload.metadata || {}),
        },
      });
    } catch (error) {
      // Audit logging must never break checkout/auth flows.
      this.logger.error(error?.message || error);
    }
  }
}
