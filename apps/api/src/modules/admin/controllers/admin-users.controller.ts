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
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { AdminService } from '../services/admin.service';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminUsersController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  listUsers(
    @Query() query: { page?: string; pageSize?: string; search?: string },
  ) {
    return this.adminService.listUsers({
      page: query.page ? parseInt(query.page, 10) : undefined,
      pageSize: query.pageSize ? parseInt(query.pageSize, 10) : undefined,
      search: query.search,
    });
  }

  @Get(':userId')
  getUser(@Param('userId') userId: string) {
    return this.adminService.getUser(userId);
  }

  @Post()
  createUser(
    @Body()
    body: {
      email: string;
      password: string;
      displayName: string;
      isAdmin?: boolean;
    },
  ) {
    return this.adminService.createUser(body);
  }

  @Patch(':userId')
  updateUser(
    @Param('userId') userId: string,
    @Body()
    body: {
      displayName?: string;
      isAdmin?: boolean;
      isActive?: boolean;
      password?: string;
    },
  ) {
    return this.adminService.updateUser(userId, body);
  }

  @Delete(':userId')
  deleteUser(@Param('userId') userId: string) {
    return this.adminService.deleteUser(userId);
  }
}
