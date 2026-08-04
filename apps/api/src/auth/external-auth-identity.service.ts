import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';

import { ApiException } from '../common/api.exception';
import {
  ExternalAuthIdentityEntity,
  type ExternalAuthProvider,
} from './entities/external-auth-identity.entity';
import { normalizeEmail } from './email-normalization';
import { mapExternalAuthIdentityUniqueViolation } from './external-auth-identity-unique-violation';

export type CreateExternalAuthIdentityInput = {
  readonly userId: string;
  readonly provider: ExternalAuthProvider;
  readonly providerSubject: string;
  readonly providerEmail: string;
};

@Injectable()
export class ExternalAuthIdentityService {
  constructor(
    @InjectRepository(ExternalAuthIdentityEntity)
    private readonly externalAuthIdentityRepository: Repository<ExternalAuthIdentityEntity>,
  ) {}

  async createIdentity(
    input: CreateExternalAuthIdentityInput,
    entityManager?: EntityManager,
  ): Promise<ExternalAuthIdentityEntity> {
    const repository =
      entityManager?.getRepository(ExternalAuthIdentityEntity) ??
      this.externalAuthIdentityRepository;

    try {
      const identity = repository.create({
        userId: input.userId,
        provider: input.provider,
        providerSubject: input.providerSubject,
        providerEmail: normalizeEmail(input.providerEmail),
      });

      return await repository.save(identity);
    } catch (error: unknown) {
      throw this.toDomainException(error);
    }
  }

  async findByProviderSubject(
    provider: ExternalAuthProvider,
    providerSubject: string,
    entityManager?: EntityManager,
  ): Promise<ExternalAuthIdentityEntity | null> {
    const repository =
      entityManager?.getRepository(ExternalAuthIdentityEntity) ??
      this.externalAuthIdentityRepository;
    return repository.findOne({ where: { provider, providerSubject }, relations: { user: true } });
  }

  async updateProviderEmail(
    identity: ExternalAuthIdentityEntity,
    providerEmail: string,
    entityManager?: EntityManager,
  ): Promise<void> {
    const repository =
      entityManager?.getRepository(ExternalAuthIdentityEntity) ??
      this.externalAuthIdentityRepository;
    await repository.update(identity.id, { providerEmail: normalizeEmail(providerEmail) });
  }

  private toDomainException(error: unknown): never {
    const uniqueViolationCode = mapExternalAuthIdentityUniqueViolation(error);

    if (uniqueViolationCode === 'AUTH_EXTERNAL_IDENTITY_ALREADY_LINKED') {
      throw new ApiException(
        uniqueViolationCode,
        'This account already has a linked Google identity.',
        HttpStatus.CONFLICT,
      );
    }

    if (uniqueViolationCode === 'AUTH_EXTERNAL_IDENTITY_CONFLICT') {
      throw new ApiException(
        uniqueViolationCode,
        'This Google identity cannot be linked.',
        HttpStatus.CONFLICT,
      );
    }

    throw error;
  }
}
