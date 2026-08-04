import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type {
  AuthenticationSessionResponse,
  ExternalIdentityResponse,
  GoogleAuthStartResponse,
  PublicUser,
} from '@nestra/contracts';
import { ZodResponse } from 'nestjs-zod';
import type { Request, Response } from 'express';

import { ApiErrorResponseDto } from '../common/api-error-response.dto';
import { ApiException } from '../common/api.exception';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';
import {
  ExternalIdentityResponseDto,
  GoogleAuthExchangeRequestDto,
  GoogleAuthStartRequestDto,
  GoogleAuthStartResponseDto,
  GoogleLinkStartRequestDto,
} from './dto/google-auth.dto';
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
  constructor(
    private readonly authService: AuthService,
    private readonly googleAuthService: GoogleAuthService,
  ) {}

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
  @ApiBadRequestResponse({
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
  @ApiBadRequestResponse({
    description: 'Request validation failed.',
    type: ApiErrorResponseDto,
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
  @ApiBadRequestResponse({
    description: 'Request validation failed.',
    type: ApiErrorResponseDto,
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
  @ApiBadRequestResponse({
    description: 'Request validation failed.',
    type: ApiErrorResponseDto,
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

  @Post('google/sign-in/start')
  @ZodResponse({ status: HttpStatus.OK, type: GoogleAuthStartResponseDto })
  async startGoogleSignIn(
    @Body() request: GoogleAuthStartRequestDto,
  ): Promise<GoogleAuthStartResponse> {
    return this.googleAuthService.startSignIn(request.platform, request.handoffChallenge);
  }

  @Post('google/link/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ZodResponse({ status: HttpStatus.OK, type: GoogleAuthStartResponseDto })
  async startGoogleLink(
    @Req() request: RequestWithAccessToken,
    @Body() body: GoogleLinkStartRequestDto,
  ): Promise<GoogleAuthStartResponse> {
    const accessToken = request.accessToken;
    if (accessToken === undefined) {
      throw new ApiException(
        'AUTH_ACCESS_TOKEN_INVALID',
        'The access token is invalid.',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return this.googleAuthService.startLink(
      accessToken.userId,
      body.currentPassword,
      body.platform,
      body.handoffChallenge,
    );
  }

  @Post('google/callback')
  async googleCallback(@Req() request: Request, @Res() response: Response): Promise<void> {
    if (!request.is('application/x-www-form-urlencoded')) {
      response
        .status(HttpStatus.BAD_REQUEST)
        .set(this.googleCallbackHeaders())
        .send(this.googleCallbackErrorPage());
      return;
    }
    const callbackResult = await this.googleAuthService.handleCallback(
      request.body as unknown as Record<string, unknown>,
    );
    if (callbackResult.kind === 'error') {
      response
        .status(HttpStatus.BAD_REQUEST)
        .set(this.googleCallbackHeaders())
        .send(this.googleCallbackErrorPage());
      return;
    }
    const redirectUrl = new URL(callbackResult.returnUri);
    redirectUrl.searchParams.set('handoff', callbackResult.handoffCode);
    response
      .status(HttpStatus.SEE_OTHER)
      .set({
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        Location: redirectUrl.toString(),
      })
      .send();
  }

  @Post('google/sign-in/exchange')
  @ZodResponse({ status: HttpStatus.OK, type: AuthenticationSessionResponseDto })
  async exchangeGoogleSignIn(
    @Body() request: GoogleAuthExchangeRequestDto,
  ): Promise<AuthenticationSessionResponse> {
    return this.googleAuthService.exchangeSignIn(request);
  }

  @Post('google/link/exchange')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ZodResponse({ status: HttpStatus.OK, type: ExternalIdentityResponseDto })
  async exchangeGoogleLink(
    @Req() request: RequestWithAccessToken,
    @Body() body: GoogleAuthExchangeRequestDto,
  ): Promise<ExternalIdentityResponse> {
    const accessToken = request.accessToken;
    if (accessToken === undefined) {
      throw new ApiException(
        'AUTH_ACCESS_TOKEN_INVALID',
        'The access token is invalid.',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return this.googleAuthService.exchangeLink(accessToken.userId, body);
  }

  private googleCallbackHeaders(): Record<string, string> {
    return {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
      'Referrer-Policy': 'no-referrer',
    };
  }

  private googleCallbackErrorPage(): string {
    return '<!doctype html><html><head><title>Authentication unavailable</title></head><body><p>Authentication could not be completed. Return to Nestra and try again.</p></body></html>';
  }
}
