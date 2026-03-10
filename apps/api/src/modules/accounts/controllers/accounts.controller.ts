import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { WorkspaceMemberGuard } from '../../../common/guards/workspace-member.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { AccountsService } from '../services/accounts.service';

@Controller('workspaces/:workspaceId/accounts')
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  findAll(@Param('workspaceId') workspaceId: string) {
    return this.accountsService.findAll(workspaceId);
  }

  @Post()
  @Roles('owner', 'editor')
  create(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { name: string; type: string; currency: string; openingBalance?: string },
  ) {
    return this.accountsService.create(workspaceId, user.id, body);
  }

  @Patch(':accountId')
  @Roles('owner', 'editor')
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('accountId') accountId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { name?: string; type?: string; isArchived?: boolean },
  ) {
    return this.accountsService.update(workspaceId, accountId, user.id, body);
  }

  @Delete(':accountId')
  @Roles('owner', 'editor')
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('accountId') accountId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.accountsService.softDelete(workspaceId, accountId, user.id);
  }
}
