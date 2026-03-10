import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: {
        workspace: true,
      },
    });

    return memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
    }));
  }

  async findOne(workspaceId: string, userId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: { workspace: true },
    });

    if (!membership) {
      throw new NotFoundException('Workspace not found');
    }

    return { ...membership.workspace, role: membership.role };
  }

  async create(
    userId: string,
    data: { name: string; type: string; baseCurrency: string },
  ) {
    const slug = this.generateSlug(data.name);

    const workspace = await this.prisma.workspace.create({
      data: {
        name: data.name,
        slug,
        type: data.type,
        baseCurrency: data.baseCurrency.toUpperCase(),
        ownerId: userId,
        memberships: {
          create: {
            userId,
            role: 'owner',
          },
        },
      },
      include: { memberships: true },
    });

    return { ...workspace, role: 'owner' as const };
  }

  async update(
    workspaceId: string,
    userId: string,
    data: { name?: string },
  ) {
    // Check ownership/role (owner only)
    const membership = await this.prisma.membership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!membership || membership.role !== 'owner') {
      throw new ForbiddenException('Only owners can update workspace settings');
    }

    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(data.name && { name: data.name, slug: this.generateSlug(data.name) }),
      },
    });
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
  }
}
