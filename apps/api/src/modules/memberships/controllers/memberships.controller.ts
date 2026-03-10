import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { WorkspaceMemberGuard } from '../../../common/guards/workspace-member.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { MembershipsService } from '../services/memberships.service';

@Controller('workspaces/:workspaceId/members')
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get()
  findAll(@Param('workspaceId') workspaceId: string) {
    return this.membershipsService.findAllForWorkspace(workspaceId);
  }

  @Post()
  @Roles('owner')
  addMember(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { userId: string; role: string },
  ) {
    return this.membershipsService.addMember(workspaceId, user.id, body);
  }

  @Patch(':membershipId')
  @Roles('owner')
  updateRole(
    @Param('workspaceId') workspaceId: string,
    @Param('membershipId') membershipId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { role: string },
  ) {
    return this.membershipsService.updateRole(workspaceId, membershipId, user.id, body);
  }
}
