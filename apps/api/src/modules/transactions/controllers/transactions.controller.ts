import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { WorkspaceMemberGuard } from '../../../common/guards/workspace-member.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { TransactionsService } from '../services/transactions.service';

@Controller('workspaces/:workspaceId/transactions')
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  findAll(
    @Param('workspaceId') workspaceId: string,
    @Query() query: {
      from?: string;
      to?: string;
      accountId?: string;
      categoryId?: string;
      type?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    return this.transactionsService.findAll(workspaceId, query);
  }

  @Get(':transactionId')
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('transactionId') transactionId: string,
  ) {
    return this.transactionsService.findOne(workspaceId, transactionId);
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
      notes?: string;
      transactionDate: string;
    },
  ) {
    return this.transactionsService.create(workspaceId, user.id, body);
  }

  @Patch(':transactionId')
  @Roles('owner', 'editor')
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('transactionId') transactionId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: {
      categoryId?: string;
      amount?: string;
      description?: string;
      notes?: string;
      transactionDate?: string;
    },
  ) {
    return this.transactionsService.update(workspaceId, transactionId, user.id, body);
  }

  @Delete(':transactionId')
  @Roles('owner', 'editor')
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('transactionId') transactionId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transactionsService.softDelete(workspaceId, transactionId, user.id);
  }
}

@Controller('workspaces/:workspaceId/transfers')
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
export class TransfersController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @Roles('owner', 'editor')
  create(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: {
      fromAccountId: string;
      toAccountId: string;
      amount: string;
      currency: string;
      description?: string;
      transactionDate: string;
    },
  ) {
    return this.transactionsService.createTransfer(workspaceId, user.id, body);
  }
}
