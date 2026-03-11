import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { recordSyncChange } from '../../../common/helpers/sync-change.helper';
import { Prisma } from '@prisma/client';

@Injectable()
export class RemindersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(workspaceId: string) {
    return this.prisma.reminder.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { reminderDate: 'asc' },
      include: {
        account: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
      },
    });
  }

  async findPending(workspaceId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.prisma.reminder.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        status: 'pending',
        reminderDate: { lte: today },
      },
      orderBy: { reminderDate: 'asc' },
      include: {
        account: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
      },
    });
  }

  async findOne(workspaceId: string, reminderId: string) {
    const reminder = await this.prisma.reminder.findFirst({
      where: { id: reminderId, workspaceId, deletedAt: null },
      include: {
        account: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
      },
    });
    if (!reminder) throw new NotFoundException('Reminder not found');
    return reminder;
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
      reminderDate: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const reminder = await tx.reminder.create({
        data: {
          workspaceId,
          accountId: data.accountId,
          categoryId: data.categoryId,
          type: data.type,
          amount: new Prisma.Decimal(data.amount),
          currency: data.currency.toUpperCase(),
          description: data.description,
          reminderDate: new Date(data.reminderDate),
          createdBy: userId,
        },
      });

      await recordSyncChange(tx, {
        workspaceId,
        entityType: 'reminder',
        entityId: reminder.id,
        operationType: 'create',
        entityVersion: reminder.version,
        changedBy: userId,
        payload: reminder as unknown as Prisma.InputJsonValue,
      });

      return reminder;
    });
  }

  async update(
    workspaceId: string,
    reminderId: string,
    userId: string,
    data: {
      accountId?: string;
      categoryId?: string;
      type?: string;
      amount?: string;
      currency?: string;
      description?: string;
      reminderDate?: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.reminder.findFirst({
        where: { id: reminderId, workspaceId, deletedAt: null },
      });
      if (!existing) throw new NotFoundException('Reminder not found');

      const reminder = await tx.reminder.update({
        where: { id: reminderId },
        data: {
          ...(data.accountId !== undefined && { accountId: data.accountId }),
          ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
          ...(data.type !== undefined && { type: data.type }),
          ...(data.amount !== undefined && { amount: new Prisma.Decimal(data.amount) }),
          ...(data.currency !== undefined && { currency: data.currency.toUpperCase() }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.reminderDate !== undefined && { reminderDate: new Date(data.reminderDate) }),
          version: { increment: 1 },
        },
      });

      await recordSyncChange(tx, {
        workspaceId,
        entityType: 'reminder',
        entityId: reminder.id,
        operationType: 'update',
        entityVersion: reminder.version,
        changedBy: userId,
        payload: reminder as unknown as Prisma.InputJsonValue,
      });

      return reminder;
    });
  }

  async execute(workspaceId: string, reminderId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const reminder = await tx.reminder.findFirst({
        where: { id: reminderId, workspaceId, deletedAt: null, status: 'pending' },
      });
      if (!reminder) throw new NotFoundException('Reminder not found or already processed');

      // Create the transaction from the reminder template
      const transaction = await tx.transaction.create({
        data: {
          workspaceId,
          accountId: reminder.accountId,
          categoryId: reminder.categoryId,
          type: reminder.type,
          amount: reminder.amount,
          currency: reminder.currency,
          description: reminder.description,
          transactionDate: new Date(),
          createdBy: userId,
        },
      });

      // Update account balance cache
      const sign = reminder.type === 'income' ? 1 : -1;
      await tx.account.update({
        where: { id: reminder.accountId },
        data: {
          currentBalanceCached: {
            increment: reminder.amount.mul(sign),
          },
        },
      });

      // Mark reminder as completed
      const updatedReminder = await tx.reminder.update({
        where: { id: reminderId },
        data: {
          status: 'completed',
          resultTransactionId: transaction.id,
          version: { increment: 1 },
        },
      });

      // Record sync changes for both entities
      await recordSyncChange(tx, {
        workspaceId,
        entityType: 'transaction',
        entityId: transaction.id,
        operationType: 'create',
        entityVersion: transaction.version,
        changedBy: userId,
        payload: transaction as unknown as Prisma.InputJsonValue,
      });

      await recordSyncChange(tx, {
        workspaceId,
        entityType: 'reminder',
        entityId: updatedReminder.id,
        operationType: 'update',
        entityVersion: updatedReminder.version,
        changedBy: userId,
        payload: updatedReminder as unknown as Prisma.InputJsonValue,
      });

      return { reminder: updatedReminder, transaction };
    });
  }

  async dismiss(workspaceId: string, reminderId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.reminder.findFirst({
        where: { id: reminderId, workspaceId, deletedAt: null, status: 'pending' },
      });
      if (!existing) throw new NotFoundException('Reminder not found or already processed');

      const reminder = await tx.reminder.update({
        where: { id: reminderId },
        data: {
          status: 'dismissed',
          version: { increment: 1 },
        },
      });

      await recordSyncChange(tx, {
        workspaceId,
        entityType: 'reminder',
        entityId: reminder.id,
        operationType: 'update',
        entityVersion: reminder.version,
        changedBy: userId,
        payload: reminder as unknown as Prisma.InputJsonValue,
      });

      return reminder;
    });
  }

  async softDelete(workspaceId: string, reminderId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.reminder.findFirst({
        where: { id: reminderId, workspaceId, deletedAt: null },
      });
      if (!existing) throw new NotFoundException('Reminder not found');

      const reminder = await tx.reminder.update({
        where: { id: reminderId },
        data: { deletedAt: new Date(), version: { increment: 1 } },
      });

      await recordSyncChange(tx, {
        workspaceId,
        entityType: 'reminder',
        entityId: reminder.id,
        operationType: 'delete',
        entityVersion: reminder.version,
        changedBy: userId,
        payload: reminder as unknown as Prisma.InputJsonValue,
      });

      return reminder;
    });
  }
}
