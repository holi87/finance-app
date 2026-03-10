import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { recordSyncChange } from '../../../common/helpers/sync-change.helper';
import { Prisma } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(workspaceId: string) {
    return this.prisma.category.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async create(
    workspaceId: string,
    userId: string,
    data: {
      name: string;
      kind: string;
      parentCategoryId?: string;
      color?: string;
      icon?: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const category = await tx.category.create({
        data: {
          workspaceId,
          name: data.name,
          kind: data.kind,
          parentCategoryId: data.parentCategoryId,
          color: data.color,
          icon: data.icon,
        },
      });

      await recordSyncChange(tx, {
        workspaceId,
        entityType: 'category',
        entityId: category.id,
        operationType: 'create',
        entityVersion: category.version,
        changedBy: userId,
        payload: category as unknown as Prisma.InputJsonValue,
      });

      return category;
    });
  }

  async update(
    workspaceId: string,
    categoryId: string,
    userId: string,
    data: { name?: string; kind?: string; color?: string; icon?: string; isArchived?: boolean },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.category.findFirst({
        where: { id: categoryId, workspaceId, deletedAt: null },
      });
      if (!existing) throw new NotFoundException('Category not found');

      const category = await tx.category.update({
        where: { id: categoryId },
        data: { ...data, version: { increment: 1 } },
      });

      await recordSyncChange(tx, {
        workspaceId,
        entityType: 'category',
        entityId: category.id,
        operationType: 'update',
        entityVersion: category.version,
        changedBy: userId,
        payload: category as unknown as Prisma.InputJsonValue,
      });

      return category;
    });
  }

  async softDelete(workspaceId: string, categoryId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.category.findFirst({
        where: { id: categoryId, workspaceId, deletedAt: null },
      });
      if (!existing) throw new NotFoundException('Category not found');

      const category = await tx.category.update({
        where: { id: categoryId },
        data: { deletedAt: new Date(), version: { increment: 1 } },
      });

      await recordSyncChange(tx, {
        workspaceId,
        entityType: 'category',
        entityId: category.id,
        operationType: 'delete',
        entityVersion: category.version,
        changedBy: userId,
        payload: category as unknown as Prisma.InputJsonValue,
      });

      return category;
    });
  }
}
