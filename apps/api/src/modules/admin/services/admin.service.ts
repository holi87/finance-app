import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { type MembershipRole } from '@budget-tracker/shared-types';
import { PrismaService } from '../../../prisma/prisma.service';

/** Reusable select for user summary fields. */
const USER_BASE_SELECT = {
  id: true,
  email: true,
  displayName: true,
  isActive: true,
  isAdmin: true,
  createdAt: true,
} as const satisfies Prisma.UserSelect;

/** Reusable select for membership with user info. */
const MEMBERSHIP_WITH_USER_SELECT = {
  id: true,
  role: true,
  user: { select: { id: true, email: true, displayName: true } },
} as const satisfies Prisma.MembershipSelect;

function isPrismaNotFound(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025';
}

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
          ...USER_BASE_SELECT,
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
        ...USER_BASE_SELECT,
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
    const passwordHash = await argon2.hash(data.password);
    try {
      return await this.prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          displayName: data.displayName,
          isAdmin: data.isAdmin ?? false,
        },
        select: USER_BASE_SELECT,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Email already registered');
      }
      throw err;
    }
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
    const updateData: Record<string, unknown> = {};
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.isAdmin !== undefined) updateData.isAdmin = data.isAdmin;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.password) updateData.passwordHash = await argon2.hash(data.password);

    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: USER_BASE_SELECT,
      });
    } catch (err) {
      if (isPrismaNotFound(err)) throw new NotFoundException('User not found');
      throw err;
    }
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
      select: { id: true, name: true },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');

    const members = await this.prisma.membership.findMany({
      where: { workspaceId },
      select: {
        ...MEMBERSHIP_WITH_USER_SELECT,
        createdAt: true,
        user: {
          select: { id: true, email: true, displayName: true, isActive: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return { workspace, members };
  }

  async addWorkspaceMember(
    workspaceId: string,
    data: { userId: string; role: MembershipRole },
  ) {
    // Workspace & user must exist; membership must not exist.
    // We validate workspace and user up-front because the create would fail
    // with a generic FK error otherwise, making poor error messages.
    const [workspace, user] = await Promise.all([
      this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true } }),
      this.prisma.user.findUnique({ where: { id: data.userId }, select: { id: true } }),
    ]);
    if (!workspace) throw new NotFoundException('Workspace not found');
    if (!user) throw new NotFoundException('User not found');

    try {
      return await this.prisma.membership.create({
        data: {
          workspaceId,
          userId: data.userId,
          role: data.role,
        },
        select: MEMBERSHIP_WITH_USER_SELECT,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('User is already a member');
      }
      throw err;
    }
  }

  async updateMemberRole(membershipId: string, role: MembershipRole) {
    try {
      return await this.prisma.membership.update({
        where: { id: membershipId },
        data: { role },
        select: MEMBERSHIP_WITH_USER_SELECT,
      });
    } catch (err) {
      if (isPrismaNotFound(err)) throw new NotFoundException('Membership not found');
      throw err;
    }
  }

  async removeMember(membershipId: string) {
    try {
      await this.prisma.membership.delete({ where: { id: membershipId } });
      return { success: true };
    } catch (err) {
      if (isPrismaNotFound(err)) throw new NotFoundException('Membership not found');
      throw err;
    }
  }
}
