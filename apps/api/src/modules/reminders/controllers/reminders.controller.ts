import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { WorkspaceMemberGuard } from '../../../common/guards/workspace-member.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { RemindersService } from '../services/reminders.service';

@Controller('workspaces/:workspaceId/reminders')
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get()
  findAll(@Param('workspaceId') workspaceId: string) {
    return this.remindersService.findAll(workspaceId);
  }

  @Get('pending')
  findPending(@Param('workspaceId') workspaceId: string) {
    return this.remindersService.findPending(workspaceId);
  }

  @Get(':reminderId')
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('reminderId') reminderId: string,
  ) {
    return this.remindersService.findOne(workspaceId, reminderId);
  }

  @Post()
  @Roles('owner', 'editor')
  create(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: {
      accountId: string;
      categoryId?: string;
      type: string;
      amount: string;
      currency: string;
      description?: string;
      reminderDate: string;
    },
  ) {
    return this.remindersService.create(workspaceId, user.id, body);
  }

  @Patch(':reminderId')
  @Roles('owner', 'editor')
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('reminderId') reminderId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: {
      accountId?: string;
      categoryId?: string;
      type?: string;
      amount?: string;
      currency?: string;
      description?: string;
      reminderDate?: string;
    },
  ) {
    return this.remindersService.update(workspaceId, reminderId, user.id, body);
  }

  @Post(':reminderId/execute')
  @Roles('owner', 'editor')
  execute(
    @Param('workspaceId') workspaceId: string,
    @Param('reminderId') reminderId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.remindersService.execute(workspaceId, reminderId, user.id);
  }

  @Post(':reminderId/dismiss')
  @Roles('owner', 'editor')
  dismiss(
    @Param('workspaceId') workspaceId: string,
    @Param('reminderId') reminderId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.remindersService.dismiss(workspaceId, reminderId, user.id);
  }

  @Delete(':reminderId')
  @Roles('owner', 'editor')
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('reminderId') reminderId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.remindersService.softDelete(workspaceId, reminderId, user.id);
  }
}
