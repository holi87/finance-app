import { Module } from '@nestjs/common';
import { RemindersService } from './services/reminders.service';
import { RemindersController } from './controllers/reminders.controller';

@Module({
  controllers: [RemindersController],
  providers: [RemindersService],
  exports: [RemindersService],
})
export class RemindersModule {}
