import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Users ──────────────────────────────────────

  async listUsers(params: { page?: number; pageSize?: number; search?: string }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const skip = (page - 1) * pageSize;

    const where = params.search
      ? {
          OR: [
            { email: { contains: params.search, mode: 'insensitive' as const } },
            { displayName: { contains: params.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          email: true,
          displayName: true,
          isActive: true,
          isAdmin: true,
          createdAt: true,
          lastLoginAt: true,
          _count: { select: { memberships: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, page, pageSize, total };
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        isActive: true,
        isAdmin: true,
        createdAt: true,
        lastLoginAt: true,
        memberships: {
          select: {
            id: true,
            role: true,
            workspace: { select: { id: true, name: true, type: true } },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async createUser(data: {
    email: string;
    password: string;
    displayName: string;
    isAdmin?: boolean;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await argon2.hash(data.password);
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        displayName: data.displayName,
        isAdmin: data.isAdmin ?? false,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        isActive: true,
        isAdmin: true,
        createdAt: true,
      },
    });
  }

  async updateUser(
    userId: string,
    data: {
      displayName?: string;
      isAdmin?: boolean;
      isActive?: boolean;
      password?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updateData: Record<string, unknown> = {};
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.isAdmin !== undefined) updateData.isAdmin = data.isAdmin;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.password) updateData.passwordHash = await argon2.hash(data.password);

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        displayName: true,
        isActive: true,
        isAdmin: true,
        createdAt: true,
      },
    });
  }

  // ── Workspaces ─────────────────────────────────

  async listWorkspaces(params: { page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.workspace.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          name: true,
          type: true,
          baseCurrency: true,
          createdAt: true,
          _count: { select: { memberships: true } },
        },
      }),
      this.prisma.workspace.count(),
    ]);

    return { items, page, pageSize, total };
  }

  async getWorkspaceMembers(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');

    const members = await this.prisma.membership.findMany({
      where: { workspaceId },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: { id: true, email: true, displayName: true, isActive: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return { workspace: { id: workspace.id, name: workspace.name }, members };
  }

  async addWorkspaceMember(
    workspaceId: string,
    data: { userId: string; role: string },
  ) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');

    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.prisma.membership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: data.userId } },
    });
    if (existing) throw new ConflictException('User is already a member');

    return this.prisma.membership.create({
      data: {
        workspaceId,
        userId: data.userId,
        role: data.role,
      },
      select: {
        id: true,
        role: true,
        user: { select: { id: true, email: true, displayName: true } },
      },
    });
  }

  async updateMemberRole(membershipId: string, role: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
    });
    if (!membership) throw new NotFoundException('Membership not found');

    return this.prisma.membership.update({
      where: { id: membershipId },
      data: { role },
      select: {
        id: true,
        role: true,
        user: { select: { id: true, email: true, displayName: true } },
      },
    });
  }

  async removeMember(membershipId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
    });
    if (!membership) throw new NotFoundException('Membership not found');

    await this.prisma.membership.delete({ where: { id: membershipId } });
    return { success: true };
  }
}
