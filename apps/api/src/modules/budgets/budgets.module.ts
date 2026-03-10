import { Module } from '@nestjs/common';
import { BudgetsController } from './controllers/budgets.controller';
import { BudgetsService } from './services/budgets.service';

@Module({
  controllers: [BudgetsController],
  providers: [BudgetsService],
  exports: [BudgetsService],
})
export class BudgetsModule {}
