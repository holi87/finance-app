import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { WorkspaceMemberGuard } from '../../../common/guards/workspace-member.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { BudgetsService } from '../services/budgets.service';

@Controller('workspaces/:workspaceId')
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  // --- Budget Periods ---

  @Get('budget-periods')
  findAllPeriods(@Param('workspaceId') workspaceId: string) {
    return this.budgetsService.findAllPeriods(workspaceId);
  }

  @Post('budget-periods')
  @Roles('owner', 'editor')
  createPeriod(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { periodType: string; startsAt: string; endsAt: string },
  ) {
    return this.budgetsService.createPeriod(workspaceId, body);
  }

  // --- Budget Limits ---

  @Get('budget-limits')
  findAllLimits(
    @Param('workspaceId') workspaceId: string,
    @Query('budgetPeriodId') budgetPeriodId?: string,
  ) {
    return this.budgetsService.findAllLimits(workspaceId, budgetPeriodId);
  }

  @Post('budget-limits')
  @Roles('owner', 'editor')
  createLimit(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { budgetPeriodId: string; categoryId: string; amount: string; currency: string },
  ) {
    return this.budgetsService.createLimit(workspaceId, user.id, body);
  }

  @Patch('budget-limits/:budgetLimitId')
  @Roles('owner', 'editor')
  updateLimit(
    @Param('workspaceId') workspaceId: string,
    @Param('budgetLimitId') budgetLimitId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { amount?: string },
  ) {
    return this.budgetsService.updateLimit(workspaceId, budgetLimitId, user.id, body);
  }

  @Delete('budget-limits/:budgetLimitId')
  @Roles('owner', 'editor')
  removeLimit(
    @Param('workspaceId') workspaceId: string,
    @Param('budgetLimitId') budgetLimitId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.budgetsService.softDeleteLimit(workspaceId, budgetLimitId, user.id);
  }
}
