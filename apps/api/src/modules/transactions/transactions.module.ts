import { Module } from '@nestjs/common';
import { TransactionsController, TransfersController } from './controllers/transactions.controller';
import { TransactionsService } from './services/transactions.service';

@Module({
  controllers: [TransactionsController, TransfersController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
