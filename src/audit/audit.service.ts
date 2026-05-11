import { Injectable, Logger } from '@nestjs/common';
import { PrismaAuditService } from 'src/prisma/prisma-audit.service';
import {
  AuditAction,
  AuditActionType,
  AuditSeverity,
} from 'constants/audit-actions';
import { AuditLogPayload, AuditRequestContext } from './audit.types';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  private readonly SENSITIVE_KEYS = new Set([
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
    'card',
    'cvv',
    'pan',
    'cardnumber',
    'resetcode',
    'twofactorsecret',
  ]);

  constructor(private readonly prismaAudit: PrismaAuditService) {}

  private sanitize(value: any): any {
    if (value === null || value === undefined) return value;
    if (Array.isArray(value)) return value.map((v) => this.sanitize(v));
    if (typeof value !== 'object') return value;

    return Object.entries(value).reduce(
      (acc, [key, val]) => {
        acc[key] = this.SENSITIVE_KEYS.has(key.toLowerCase())
          ? '[REDACTED]'
          : this.sanitize(val);
        return acc;
      },
      {} as Record<string, any>,
    );
  }

  async log(payload: AuditLogPayload): Promise<void> {
    try {
      await this.prismaAudit.auditLog.create({
        data: {
          userId: payload.userId ?? null,
          adminId: payload.adminId ?? null,
          action: payload.action,
          entity: payload.entity ?? null,
          method: payload.method ?? null,
          endpoint: payload.endpoint ?? null,
          ip: payload.ip ?? null,
          userAgent: payload.userAgent ?? null,
          status: payload.status ?? null,
          severity: payload.severity ?? AuditSeverity.INFO,
          metadata: this.sanitize(payload.metadata ?? {}),
        },
      });
    } catch (error) {
      // Audit failures must never break business flows.
      this.logger.error(
        `Failed to write audit log [${payload.action}]: ${error?.message}`,
        error?.stack,
      );
    }
  }

  async logAuth(
    action: AuditActionType,
    ctx: AuditRequestContext,
    options: {
      userId?: string;
      status?: number;
      metadata?: Record<string, any>;
    } = {},
  ): Promise<void> {
    const severity =
      action === AuditAction.LOGIN_FAILED
        ? AuditSeverity.WARN
        : action === AuditAction.PASSWORD_RESET
          ? AuditSeverity.SECURITY
          : AuditSeverity.INFO;

    return this.log({ action, entity: 'Auth', severity, ...ctx, ...options });
  }

  async logAdmin(
    action: AuditActionType,
    ctx: AuditRequestContext,
    options: {
      adminId?: string;
      userId?: string;
      entity?: string;
      metadata?: Record<string, any>;
    } = {},
  ): Promise<void> {
    const criticalActions = new Set<AuditActionType>([
      AuditAction.BAN_USER,
      AuditAction.ROLE_CHANGE,
      AuditAction.ADMIN_DELETE,
    ]);

    const severity = criticalActions.has(action)
      ? AuditSeverity.SECURITY
      : AuditSeverity.INFO;

    return this.log({ action, severity, ...ctx, ...options });
  }

  async logTransaction(
    action: AuditActionType,
    ctx: AuditRequestContext,
    options: {
      userId?: string;
      status?: number;
      metadata?: Record<string, any>;
    } = {},
  ): Promise<void> {
    const severity =
      action === AuditAction.PAYMENT_FAILED
        ? AuditSeverity.ERROR
        : action === AuditAction.WEBHOOK_RECEIVED
          ? AuditSeverity.WARN
          : AuditSeverity.INFO;

    return this.log({
      action,
      entity: 'Transaction',
      severity,
      ...ctx,
      ...options,
    });
  }

  async logSecurity(
    action: AuditActionType,
    ctx: AuditRequestContext,
    options: {
      userId?: string;
      metadata?: Record<string, any>;
    } = {},
  ): Promise<void> {
    const severity =
      action === AuditAction.SUSPICIOUS_ACTIVITY
        ? AuditSeverity.CRITICAL
        : AuditSeverity.SECURITY;

    return this.log({
      action,
      entity: 'Security',
      severity,
      ...ctx,
      ...options,
    });
  }
}
