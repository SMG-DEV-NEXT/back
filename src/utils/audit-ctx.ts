export function getAuditCtx(req: any) {
  const ip =
    (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req?.socket?.remoteAddress ||
    null;
  return {
    ip,
    userAgent: (req?.headers?.['user-agent'] as string) || null,
    method: req?.method || null,
    endpoint: req?.originalUrl || req?.url || null,
  };
}
