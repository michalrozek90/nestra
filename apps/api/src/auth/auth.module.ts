import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import type { ApiEnvironment } from '../config/api-environment';
import { DatabaseModule } from '../database/database.module';
import { AccessTokenService } from './access-token.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ExternalAuthIdentityEntity } from './entities/external-auth-identity.entity';
import { RefreshSessionEntity } from './entities/refresh-session.entity';
import { UserEntity } from './entities/user.entity';
import { ExternalAuthIdentityService } from './external-auth-identity.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PasswordService } from './password.service';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([UserEntity, RefreshSessionEntity, ExternalAuthIdentityEntity]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<ApiEnvironment, true>) => ({
        secret: configService.get('jwtAccessSecret', { infer: true }),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    AccessTokenService,
    JwtAuthGuard,
    ExternalAuthIdentityService,
  ],
  exports: [AccessTokenService, JwtAuthGuard, ExternalAuthIdentityService],
})
export class AuthModule {}
