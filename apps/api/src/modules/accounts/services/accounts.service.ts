import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { recordSyncChange } from '../../../common/helpers/sync-change.helper';
import { Prisma } from '@prisma/client';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(workspaceId: string) {
    return this.prisma.account.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(
    workspaceId: string,
    userId: string,
    data: { name: string; type: string; currency: string; openingBalance?: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const balance = new Prisma.Decimal(data.openingBalance || '0');
      const account = await tx.account.create({
        data: {
          workspaceId,
          name: data.name,
          type: data.type,
          currency: data.currency.toUpperCase(),
          openingBalance: balance,
          currentBalanceCached: balance,
        },
      });

      await recordSyncChange(tx, {
        workspaceId,
        entityType: 'account',
        entityId: account.id,
        operationType: 'create',
        entityVersion: account.version,
        changedBy: userId,
        payload: account as unknown as Prisma.InputJsonValue,
      });

      return account;
    });
  }

  async update(
    workspaceId: string,
    accountId: string,
    userId: string,
    data: { name?: string; type?: string; isArchived?: boolean },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.account.findFirst({
        where: { id: accountId, workspaceId, deletedAt: null },
      });
      if (!existing) throw new NotFoundException('Account not found');

      const account = await tx.account.update({
        where: { id: accountId },
        data: {
          ...data,
          version: { increment: 1 },
        },
      });

      await recordSyncChange(tx, {
        workspaceId,
        entityType: 'account',
        entityId: account.id,
        operationType: 'update',
        entityVersion: account.version,
        changedBy: userId,
        payload: account as unknown as Prisma.InputJsonValue,
      });

      return account;
    });
  }

  async softDelete(workspaceId: string, accountId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.account.findFirst({
        where: { id: accountId, workspaceId, deletedAt: null },
      });
      if (!existing) throw new NotFoundException('Account not found');

      const account = await tx.account.update({
        where: { id: accountId },
        data: { deletedAt: new Date(), version: { increment: 1 } },
      });

      await recordSyncChange(tx, {
        workspaceId,
        entityType: 'account',
        entityId: account.id,
        operationType: 'delete',
        entityVersion: account.version,
        changedBy: userId,
        payload: account as unknown as Prisma.InputJsonValue,
      });

      return account;
    });
  }
}
