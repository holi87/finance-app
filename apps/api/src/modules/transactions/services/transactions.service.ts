import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { recordSyncChange } from '../../../common/helpers/sync-change.helper';
import { Prisma } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    workspaceId: string,
    params: {
      from?: string;
      to?: string;
      accountId?: string;
      categoryId?: string;
      type?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.TransactionWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(params.from && { transactionDate: { gte: new Date(params.from) } }),
      ...(params.to && {
        transactionDate: {
          ...(params.from ? { gte: new Date(params.from) } : {}),
          lte: new Date(params.to),
        },
      }),
      ...(params.accountId && { accountId: params.accountId }),
      ...(params.categoryId && { categoryId: params.categoryId }),
      ...(params.type && { type: params.type }),
    };

    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { transactionDate: 'desc' },
        skip,
        take: pageSize,
        include: {
          account: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, color: true } },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { items, page, pageSize, total };
  }

  async findOne(workspaceId: string, transactionId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, workspaceId, deletedAt: null },
      include: {
        account: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
      },
    });

    if (!transaction) throw new NotFoundException('Transaction not found');
    return transaction;
  }

  async create(
    workspaceId: string,
    userId: string,
    data: {
      accountId: string;
      categoryId?: string;
      type: string;
      amount: string;
      currency: string;
      description?: string;
      notes?: string;
      transactionDate: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          workspaceId,
          accountId: data.accountId,
          categoryId: data.categoryId,
          type: data.type,
          amount: new Prisma.Decimal(data.amount),
          currency: data.currency.toUpperCase(),
          description: data.description,
          notes: data.notes,
          transactionDate: new Date(data.transactionDate),
          createdBy: userId,
        },
      });

      // Update account balance cache
      const sign = data.type === 'income' ? 1 : -1;
      await tx.account.update({
        where: { id: data.accountId },
        data: {
          currentBalanceCached: {
            increment: new Prisma.Decimal(data.amount).mul(sign),
          },
        },
      });

      await recordSyncChange(tx, {
        workspaceId,
        entityType: 'transaction',
        entityId: transaction.id,
        operationType: 'create',
        entityVersion: transaction.version,
        changedBy: userId,
        payload: transaction as unknown as Prisma.InputJsonValue,
      });

      return transaction;
    });
  }

  async update(
    workspaceId: string,
    transactionId: string,
    userId: string,
    data: {
      categoryId?: string;
      amount?: string;
      description?: string;
      notes?: string;
      transactionDate?: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findFirst({
        where: { id: transactionId, workspaceId, deletedAt: null },
      });
      if (!existing) throw new NotFoundException('Transaction not found');

      // Handle balance change if amount changed
      if (data.amount) {
        const sign = existing.type === 'income' ? 1 : -1;
        const oldAmount = existing.amount;
        const newAmount = new Prisma.Decimal(data.amount);
        const diff = newAmount.sub(oldAmount).mul(sign);

        await tx.account.update({
          where: { id: existing.accountId },
          data: { currentBalanceCached: { increment: diff } },
        });
      }

      const transaction = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
          ...(data.amount && { amount: new Prisma.Decimal(data.amount) }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.transactionDate && { transactionDate: new Date(data.transactionDate) }),
          version: { increment: 1 },
        },
      });

      await recordSyncChange(tx, {
        workspaceId,
        entityType: 'transaction',
        entityId: transaction.id,
        operationType: 'update',
        entityVersion: transaction.version,
        changedBy: userId,
        payload: transaction as unknown as Prisma.InputJsonValue,
      });

      return transaction;
    });
  }

  async softDelete(workspaceId: string, transactionId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findFirst({
        where: { id: transactionId, workspaceId, deletedAt: null },
      });
      if (!existing) throw new NotFoundException('Transaction not found');

      // Reverse balance effect
      const sign = existing.type === 'income' ? -1 : 1;
      await tx.account.update({
        where: { id: existing.accountId },
        data: {
          currentBalanceCached: { increment: existing.amount.mul(sign) },
        },
      });

      const transaction = await tx.transaction.update({
        where: { id: transactionId },
        data: { deletedAt: new Date(), version: { increment: 1 } },
      });

      await recordSyncChange(tx, {
        workspaceId,
        entityType: 'transaction',
        entityId: transaction.id,
        operationType: 'delete',
        entityVersion: transaction.version,
        changedBy: userId,
        payload: transaction as unknown as Prisma.InputJsonValue,
      });

      return transaction;
    });
  }

  async createTransfer(
    workspaceId: string,
    userId: string,
    data: {
      fromAccountId: string;
      toAccountId: string;
      amount: string;
      currency: string;
      description?: string;
      transactionDate: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const amount = new Prisma.Decimal(data.amount);
      const txDate = new Date(data.transactionDate);

      // Create outbound transaction (expense from source)
      const outbound = await tx.transaction.create({
        data: {
          workspaceId,
          accountId: data.fromAccountId,
          type: 'transfer',
          amount,
          currency: data.currency.toUpperCase(),
          description: data.description || 'Transfer',
          transactionDate: txDate,
          createdBy: userId,
        },
      });

      // Create inbound transaction (income to destination)
      const inbound = await tx.transaction.create({
        data: {
          workspaceId,
          accountId: data.toAccountId,
          type: 'transfer',
          amount,
          currency: data.currency.toUpperCase(),
          description: data.description || 'Transfer',
          transactionDate: txDate,
          createdBy: userId,
        },
      });

      // Create transfer link
      await tx.transferLink.create({
        data: {
          workspaceId,
          outboundTransactionId: outbound.id,
          inboundTransactionId: inbound.id,
        },
      });

      // Update balances
      await tx.account.update({
        where: { id: data.fromAccountId },
        data: { currentBalanceCached: { decrement: amount } },
      });
      await tx.account.update({
        where: { id: data.toAccountId },
        data: { currentBalanceCached: { increment: amount } },
      });

      // Record sync changes
      for (const t of [outbound, inbound]) {
        await recordSyncChange(tx, {
          workspaceId,
          entityType: 'transaction',
          entityId: t.id,
          operationType: 'create',
          entityVersion: t.version,
          changedBy: userId,
          payload: t as unknown as Prisma.InputJsonValue,
        });
      }

      return { outbound, inbound };
    });
  }
}
