import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForWorkspace(workspaceId: string) {
    return this.prisma.membership.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
      },
    });
  }

  async addMember(
    workspaceId: string,
    invitedBy: string,
    data: { userId: string; role: string },
  ) {
    // Check inviter is owner
    const inviterMembership = await this.prisma.membership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: invitedBy } },
    });

    if (!inviterMembership || inviterMembership.role !== 'owner') {
      throw new ForbiddenException('Only owners can add members');
    }

    // Check target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Check not already a member
    const existing = await this.prisma.membership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: data.userId } },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this workspace');
    }

    return this.prisma.membership.create({
      data: {
        workspaceId,
        userId: data.userId,
        role: data.role,
        invitedBy: invitedBy,
      },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
      },
    });
  }

  async updateRole(
    workspaceId: string,
    membershipId: string,
    updaterId: string,
    data: { role: string },
  ) {
    // Check updater is owner
    const updaterMembership = await this.prisma.membership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: updaterId } },
    });

    if (!updaterMembership || updaterMembership.role !== 'owner') {
      throw new ForbiddenException('Only owners can change member roles');
    }

    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    // Cannot change own role
    if (membership.userId === updaterId) {
      throw new ForbiddenException('Cannot change your own role');
    }

    return this.prisma.membership.update({
      where: { id: membershipId },
      data: { role: data.role },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
      },
    });
  }
}
