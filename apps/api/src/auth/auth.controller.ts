import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticationSessionResponse, PublicUser } from '@nestra/contracts';
import { ZodResponse } from 'nestjs-zod';

import { ApiErrorResponseDto } from '../common/api-error-response.dto';
import { ApiException } from '../common/api.exception';
import { AuthService } from './auth.service';
import { AuthenticationSessionResponseDto } from './dto/authentication-session-response.dto';
import { LoginRequestDto } from './dto/login-request.dto';
import { LogoutRequestDto } from './dto/logout-request.dto';
import { PublicUserDto } from './dto/public-user.dto';
import { RefreshRequestDto } from './dto/refresh-request.dto';
import { RegisterRequestDto } from './dto/register-request.dto';
import { JwtAuthGuard, type RequestWithAccessToken } from './jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new account and start an authenticated session' })
  @ZodResponse({
    status: HttpStatus.CREATED,
    description: 'The account was created and authenticated successfully.',
    type: AuthenticationSessionResponseDto,
  })
  @ApiCreatedResponse({
    description: 'The account was created and authenticated successfully.',
    type: AuthenticationSessionResponseDto,
  })
  @ApiConflictResponse({
    description: 'An account with the submitted email already exists.',
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Request validation failed.',
    type: ApiErrorResponseDto,
  })
  async register(@Body() request: RegisterRequestDto): Promise<AuthenticationSessionResponse> {
    return this.authService.register(request.email, request.password);
  }

  @Post('login')
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ZodResponse({
    status: HttpStatus.OK,
    description: 'The user was authenticated successfully.',
    type: AuthenticationSessionResponseDto,
  })
  @ApiOkResponse({
    description: 'The user was authenticated successfully.',
    type: AuthenticationSessionResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'The email or password is invalid.',
    type: ApiErrorResponseDto,
  })
  async login(@Body() request: LoginRequestDto): Promise<AuthenticationSessionResponse> {
    return this.authService.login(request.email, request.password);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate the refresh token and issue a new authenticated session' })
  @ZodResponse({
    status: HttpStatus.OK,
    description: 'The refresh token was rotated successfully.',
    type: AuthenticationSessionResponseDto,
  })
  @ApiOkResponse({
    description: 'The refresh token was rotated successfully.',
    type: AuthenticationSessionResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'The refresh token or session is invalid or expired.',
    type: ApiErrorResponseDto,
  })
  async refresh(@Body() request: RefreshRequestDto): Promise<AuthenticationSessionResponse> {
    return this.authService.refresh(request.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a refresh session when possible' })
  @ApiNoContentResponse({
    description: 'Logout completed idempotently.',
  })
  async logout(@Body() request: LogoutRequestDto): Promise<void> {
    await this.authService.logout(request.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the authenticated user' })
  @ZodResponse({
    status: HttpStatus.OK,
    description: 'The authenticated user was returned successfully.',
    type: PublicUserDto,
  })
  @ApiOkResponse({
    description: 'The authenticated user was returned successfully.',
    type: PublicUserDto,
  })
  @ApiUnauthorizedResponse({
    description: 'The access token is invalid.',
    type: ApiErrorResponseDto,
  })
  async getCurrentUser(@Req() request: RequestWithAccessToken): Promise<PublicUser> {
    const accessToken = request.accessToken;

    if (accessToken === undefined) {
      throw new ApiException(
        'AUTH_ACCESS_TOKEN_INVALID',
        'The access token is invalid.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.authService.getCurrentUser(accessToken.userId);
  }
}
