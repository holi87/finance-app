import { Module } from '@nestjs/common';
import { MembershipsController } from './controllers/memberships.controller';
import { MembershipsService } from './services/memberships.service';

@Module({
  controllers: [MembershipsController],
  providers: [MembershipsService],
  exports: [MembershipsService],
})
export class MembershipsModule {}
