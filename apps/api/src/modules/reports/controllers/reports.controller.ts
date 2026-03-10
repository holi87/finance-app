import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { WorkspaceMemberGuard } from '../../../common/guards/workspace-member.guard';
import { ReportsService } from '../services/reports.service';

@Controller('workspaces/:workspaceId/reports')
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  getSummary(
    @Param('workspaceId') workspaceId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getSummary(workspaceId, from, to);
  }

  @Get('by-category')
  getByCategory(
    @Param('workspaceId') workspaceId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getByCategory(workspaceId, from, to);
  }
}
