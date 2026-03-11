import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { type MembershipRole } from '@budget-tracker/shared-types';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { AdminService } from '../services/admin.service';

@Controller('admin/workspaces')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminWorkspacesController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  listWorkspaces(@Query() query: { page?: string; pageSize?: string }) {
    return this.adminService.listWorkspaces({
      page: query.page ? parseInt(query.page, 10) : undefined,
      pageSize: query.pageSize ? parseInt(query.pageSize, 10) : undefined,
    });
  }

  @Get(':workspaceId/members')
  getMembers(@Param('workspaceId') workspaceId: string) {
    return this.adminService.getWorkspaceMembers(workspaceId);
  }

  @Post(':workspaceId/members')
  addMember(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { userId: string; role: MembershipRole },
  ) {
    return this.adminService.addWorkspaceMember(workspaceId, body);
  }

  @Patch('members/:membershipId')
  updateMemberRole(
    @Param('membershipId') membershipId: string,
    @Body() body: { role: MembershipRole },
  ) {
    return this.adminService.updateMemberRole(membershipId, body.role);
  }

  @Delete('members/:membershipId')
  removeMember(@Param('membershipId') membershipId: string) {
    return this.adminService.removeMember(membershipId);
  }
}
