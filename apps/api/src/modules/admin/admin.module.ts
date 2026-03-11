import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminService } from './services/admin.service';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminWorkspacesController } from './controllers/admin-workspaces.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AdminUsersController, AdminWorkspacesController],
  providers: [AdminService],
})
export class AdminModule {}
