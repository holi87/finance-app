import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { SyncService } from '../services/sync.service';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  async push(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      deviceId: string;
      workspaceId: string;
      operations: Array<{
        operationId: string;
        entityType: string;
        entityId: string;
        operationType: 'create' | 'update' | 'delete';
        baseVersion: number;
        payload: Record<string, unknown>;
      }>;
    },
  ) {
    return this.syncService.push(
      user.id,
      body.deviceId,
      body.workspaceId,
      body.operations,
    );
  }

  @Get('pull')
  async pull(
    @CurrentUser() user: AuthUser,
    @Query('workspaceId') workspaceId: string,
    @Query('cursor') cursor: string,
    @Query('limit') limit?: string,
  ) {
    return this.syncService.pull(
      user.id,
      workspaceId,
      cursor || '0',
      limit ? parseInt(limit, 10) : 100,
    );
  }
}
