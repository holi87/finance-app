import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { WorkspaceMemberGuard } from '../../../common/guards/workspace-member.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { CategoriesService } from '../services/categories.service';

@Controller('workspaces/:workspaceId/categories')
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@Param('workspaceId') workspaceId: string) {
    return this.categoriesService.findAll(workspaceId);
  }

  @Post()
  @Roles('owner', 'editor')
  create(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      name: string;
      kind: string;
      parentCategoryId?: string;
      color?: string;
      icon?: string;
    },
  ) {
    return this.categoriesService.create(workspaceId, user.id, body);
  }

  @Patch(':categoryId')
  @Roles('owner', 'editor')
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('categoryId') categoryId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { name?: string; kind?: string; color?: string; icon?: string; isArchived?: boolean },
  ) {
    return this.categoriesService.update(workspaceId, categoryId, user.id, body);
  }

  @Delete(':categoryId')
  @Roles('owner', 'editor')
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('categoryId') categoryId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.categoriesService.softDelete(workspaceId, categoryId, user.id);
  }
}
