import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { recordSyncChange } from '../../../common/helpers/sync-change.helper';
import { Prisma } from '@prisma/client';

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Budget Periods ---

  async findAllPeriods(workspaceId: string) {
    return this.prisma.budgetPeriod.findMany({
      where: { workspaceId },
      orderBy: { startsAt: 'desc' },
    });
  }

  async createPeriod(
    workspaceId: string,
    data: { periodType: string; startsAt: string; endsAt: string },
  ) {
    return this.prisma.budgetPeriod.create({
      data: {
        workspaceId,
        periodType: data.periodType,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
      },
    });
  }

  // --- Budget Limits ---

  async findAllLimits(workspaceId: string, budgetPeriodId?: string) {
    return this.prisma.budgetLimit.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        ...(budgetPeriodId && { budgetPeriodId }),
      },
      include: {
        category: { select: { id: true, name: true, color: true } },
        budgetPeriod: { select: { id: true, startsAt: true, endsAt: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createLimit(
    workspaceId: string,
    userId: string,
    data: { budgetPeriodId: string; categoryId: string; amount: string; currency: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const limit = await tx.budgetLimit.create({
        data: {
          workspaceId,
          budgetPeriodId: data.budgetPeriodId,
          categoryId: data.categoryId,
          amount: new Prisma.Decimal(data.amount),
          currency: data.currency.toUpperCase(),
        },
      });

      await recordSyncChange(tx, {
        workspaceId,
        entityType: 'budget_limit',
        entityId: limit.id,
        operationType: 'create',
        entityVersion: limit.version,
        changedBy: userId,
        payload: limit as unknown as Prisma.InputJsonValue,
      });

      return limit;
    });
  }

  async updateLimit(
    workspaceId: string,
    budgetLimitId: string,
    userId: string,
    data: { amount?: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.budgetLimit.findFirst({
        where: { id: budgetLimitId, workspaceId, deletedAt: null },
      });
      if (!existing) throw new NotFoundException('Budget limit not found');

      const limit = await tx.budgetLimit.update({
        where: { id: budgetLimitId },
        data: {
          ...(data.amount && { amount: new Prisma.Decimal(data.amount) }),
          version: { increment: 1 },
        },
      });

      await recordSyncChange(tx, {
        workspaceId,
        entityType: 'budget_limit',
        entityId: limit.id,
        operationType: 'update',
        entityVersion: limit.version,
        changedBy: userId,
        payload: limit as unknown as Prisma.InputJsonValue,
      });

      return limit;
    });
  }

  async softDeleteLimit(workspaceId: string, budgetLimitId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.budgetLimit.findFirst({
        where: { id: budgetLimitId, workspaceId, deletedAt: null },
      });
      if (!existing) throw new NotFoundException('Budget limit not found');

      const limit = await tx.budgetLimit.update({
        where: { id: budgetLimitId },
        data: { deletedAt: new Date(), version: { increment: 1 } },
      });

      await recordSyncChange(tx, {
        workspaceId,
        entityType: 'budget_limit',
        entityId: limit.id,
        operationType: 'delete',
        entityVersion: limit.version,
        changedBy: userId,
        payload: limit as unknown as Prisma.InputJsonValue,
      });

      return limit;
    });
  }
}
