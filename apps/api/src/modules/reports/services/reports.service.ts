import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(workspaceId: string, from: string, to: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { baseCurrency: true },
    });

    const transactions = await this.prisma.transaction.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        transactionDate: {
          gte: new Date(from),
          lte: new Date(to),
        },
        type: { in: ['income', 'expense'] },
      },
      select: { type: true, amount: true },
    });

    let incomeTotal = new Prisma.Decimal(0);
    let expenseTotal = new Prisma.Decimal(0);

    for (const tx of transactions) {
      if (tx.type === 'income') {
        incomeTotal = incomeTotal.add(tx.amount);
      } else {
        expenseTotal = expenseTotal.add(tx.amount);
      }
    }

    return {
      incomeTotal: incomeTotal.toString(),
      expenseTotal: expenseTotal.toString(),
      balance: incomeTotal.sub(expenseTotal).toString(),
      currency: workspace?.baseCurrency || 'PLN',
    };
  }

  async getByCategory(workspaceId: string, from: string, to: string) {
    const result = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        workspaceId,
        deletedAt: null,
        type: 'expense',
        transactionDate: {
          gte: new Date(from),
          lte: new Date(to),
        },
      },
      _sum: { amount: true },
    });

    const categoryIds = result
      .map((r) => r.categoryId)
      .filter((id): id is string => id !== null);

    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, color: true },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { baseCurrency: true },
    });

    return result.map((r) => ({
      categoryId: r.categoryId,
      categoryName: r.categoryId ? categoryMap.get(r.categoryId)?.name || 'Unknown' : 'Uncategorized',
      total: r._sum.amount?.toString() || '0',
      currency: workspace?.baseCurrency || 'PLN',
    }));
  }
}
