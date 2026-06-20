import { Injectable } from '@nestjs/common';
import { PrismaAuditService } from 'src/prisma/prisma-audit.service';

interface GetLogsOptions {
  page: number;
  limit: number;
  search?: string;
  ip?: string;
  entity?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class AuditLogsService {
  constructor(private readonly prismaAudit: PrismaAuditService) {}

  async getLogs({ page, limit, search, ip, entity, severity, startDate, endDate }: GetLogsOptions) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { userId: { contains: search, mode: 'insensitive' } },
        { adminId: { contains: search, mode: 'insensitive' } },
        { endpoint: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (ip) {
      where.ip = { contains: ip, mode: 'insensitive' };
    }

    if (entity) {
      where.entity = entity;
    }

    if (severity) {
      where.severity = severity;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [data, total] = await Promise.all([
      this.prismaAudit.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prismaAudit.auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async clearLogs(): Promise<{ deleted: number }> {
    const result = await this.prismaAudit.auditLog.deleteMany({});
    return { deleted: result.count };
  }

  async getDistinctEntities(): Promise<string[]> {
    const result = await this.prismaAudit.auditLog.findMany({
      select: { entity: true },
      distinct: ['entity'],
      where: { entity: { not: null } },
      orderBy: { entity: 'asc' },
    });
    return result.map((r) => r.entity as string);
  }
}
