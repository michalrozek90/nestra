import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';

import { ExternalAuthTransactionEntity } from './entities/external-auth-transaction.entity';

const TERMINAL_TRANSACTION_RETENTION_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ExternalAuthTransactionMaintenanceService {
  private readonly logger = new Logger(ExternalAuthTransactionMaintenanceService.name);

  constructor(
    @InjectRepository(ExternalAuthTransactionEntity)
    private readonly transactionRepository: Repository<ExternalAuthTransactionEntity>,
  ) {}

  async scrubExpiredTransactions(now = new Date()): Promise<void> {
    const expiredProviderResult = await this.transactionRepository.update(
      {
        status: In(['pending_provider', 'processing_provider']),
        providerExpiresAt: LessThan(now),
      },
      {
        status: 'expired',
        requestSecretsCiphertext: null,
        validatedClaimsCiphertext: null,
        processingLeaseExpiresAt: null,
      },
    );

    const expiredHandoffResult = await this.transactionRepository.update(
      {
        status: 'pending_handoff',
        handoffExpiresAt: LessThan(now),
      },
      {
        status: 'expired',
        requestSecretsCiphertext: null,
        validatedClaimsCiphertext: null,
        processingLeaseExpiresAt: null,
      },
    );

    const terminalCutoff = new Date(now.getTime() - TERMINAL_TRANSACTION_RETENTION_MS);
    const deletedTerminalResult = await this.transactionRepository.delete({
      status: In(['consumed', 'expired', 'failed']),
      updatedAt: LessThan(terminalCutoff),
    });

    this.logger.log(
      `operation=google_transaction_scrub expiredProvider=${expiredProviderResult.affected ?? 0} expiredHandoff=${expiredHandoffResult.affected ?? 0} deletedTerminal=${deletedTerminalResult.affected ?? 0}`,
    );
  }
}
