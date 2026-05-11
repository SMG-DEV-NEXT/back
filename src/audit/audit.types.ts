import { AuditActionType, AuditSeverityType } from 'constants/audit-actions';

export interface AuditLogPayload {
  userId?: string | null;
  adminId?: string | null;
  action: AuditActionType;
  entity?: string | null;
  method?: string | null;
  endpoint?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  status?: number | null;
  severity?: AuditSeverityType;
  metadata?: Record<string, any> | null;
}

export interface AuditRequestContext {
  ip?: string | null;
  userAgent?: string | null;
  method?: string | null;
  endpoint?: string | null;
}
