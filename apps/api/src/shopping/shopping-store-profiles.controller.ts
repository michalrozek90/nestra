import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type {
  ShoppingStoreProfile,
  ShoppingStoreProfileCollection,
  ShoppingStoreProfileSelection,
} from '@nestra/contracts';
import { ZodResponse } from 'nestjs-zod';

import { JwtAuthGuard, type RequestWithAccessToken } from '../auth';
import { ApiErrorResponseDto } from '../common/api-error-response.dto';
import { ApiException } from '../common/api.exception';
import { CreateShoppingStoreProfileDto } from './dto/create-shopping-store-profile.dto';
import { ReplaceShoppingStoreProfileOrderDto } from './dto/replace-shopping-store-profile-order.dto';
import { ShoppingStoreProfileCollectionDto } from './dto/shopping-store-profile-collection.dto';
import { ShoppingStoreProfileRouteParametersDto } from './dto/shopping-store-profile-route-parameters.dto';
import { ShoppingStoreProfileSelectionDto } from './dto/shopping-store-profile-selection.dto';
import { ShoppingStoreProfileDto } from './dto/shopping-store-profile.dto';
import { UpdateShoppingStoreProfileDto } from './dto/update-shopping-store-profile.dto';
import { ShoppingStoreProfilesService } from './shopping-store-profiles.service';

@ApiTags('shopping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shopping/store-profiles')
@ApiInternalServerErrorResponse({ type: ApiErrorResponseDto })
export class ShoppingStoreProfilesController {
  constructor(private readonly shoppingStoreProfilesService: ShoppingStoreProfilesService) {}

  @Get()
  @ApiOperation({ summary: 'List store profiles owned by the authenticated user' })
  @ZodResponse({ status: HttpStatus.OK, type: ShoppingStoreProfileCollectionDto })
  @ApiOkResponse({ type: ShoppingStoreProfileCollectionDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  async listProfiles(
    @Req() request: RequestWithAccessToken,
  ): Promise<ShoppingStoreProfileCollection> {
    return this.shoppingStoreProfilesService.listProfiles(this.getAuthenticatedUserId(request));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a store profile with every current category in default order' })
  @ApiBody({ type: CreateShoppingStoreProfileDto })
  @ZodResponse({ status: HttpStatus.CREATED, type: ShoppingStoreProfileDto })
  @ApiCreatedResponse({ type: ShoppingStoreProfileDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  async createProfile(
    @Req() request: RequestWithAccessToken,
    @Body() profileInput: CreateShoppingStoreProfileDto,
  ): Promise<ShoppingStoreProfile> {
    return this.shoppingStoreProfilesService.createProfile(
      this.getAuthenticatedUserId(request),
      profileInput.name,
    );
  }

  @Get(':profileId')
  @ApiOperation({ summary: 'Fetch one owned store profile without changing the last selection' })
  @ApiParam({ name: 'profileId', required: true, schema: { type: 'string', format: 'uuid' } })
  @ZodResponse({ status: HttpStatus.OK, type: ShoppingStoreProfileDto })
  @ApiOkResponse({ type: ShoppingStoreProfileDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  async getProfile(
    @Req() request: RequestWithAccessToken,
    @Param() parameters: ShoppingStoreProfileRouteParametersDto,
  ): Promise<ShoppingStoreProfile> {
    return this.shoppingStoreProfilesService.getProfile(
      this.getAuthenticatedUserId(request),
      parameters.profileId,
    );
  }

  @Patch(':profileId')
  @ApiOperation({ summary: 'Rename an owned store profile without moving its categories' })
  @ApiParam({ name: 'profileId', required: true, schema: { type: 'string', format: 'uuid' } })
  @ApiBody({ type: UpdateShoppingStoreProfileDto })
  @ZodResponse({ status: HttpStatus.OK, type: ShoppingStoreProfileDto })
  @ApiOkResponse({ type: ShoppingStoreProfileDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  async renameProfile(
    @Req() request: RequestWithAccessToken,
    @Param() parameters: ShoppingStoreProfileRouteParametersDto,
    @Body() profileInput: UpdateShoppingStoreProfileDto,
  ): Promise<ShoppingStoreProfile> {
    return this.shoppingStoreProfilesService.renameProfile(
      this.getAuthenticatedUserId(request),
      parameters.profileId,
      profileInput.name,
    );
  }

  @Put(':profileId/categories')
  @ApiOperation({ summary: 'Replace the category order of an owned store profile' })
  @ApiParam({ name: 'profileId', required: true, schema: { type: 'string', format: 'uuid' } })
  @ApiBody({ type: ReplaceShoppingStoreProfileOrderDto })
  @ZodResponse({ status: HttpStatus.OK, type: ShoppingStoreProfileDto })
  @ApiOkResponse({ type: ShoppingStoreProfileDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  async replaceOrder(
    @Req() request: RequestWithAccessToken,
    @Param() parameters: ShoppingStoreProfileRouteParametersDto,
    @Body() order: ReplaceShoppingStoreProfileOrderDto,
  ): Promise<ShoppingStoreProfile> {
    return this.shoppingStoreProfilesService.replaceOrder(
      this.getAuthenticatedUserId(request),
      parameters.profileId,
      order,
    );
  }

  @Post(':profileId/selection')
  @ApiOperation({ summary: 'Remember an owned store profile as the explicit last selection' })
  @ApiParam({ name: 'profileId', required: true, schema: { type: 'string', format: 'uuid' } })
  @ZodResponse({ status: HttpStatus.OK, type: ShoppingStoreProfileSelectionDto })
  @ApiOkResponse({ type: ShoppingStoreProfileSelectionDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  async selectProfile(
    @Req() request: RequestWithAccessToken,
    @Param() parameters: ShoppingStoreProfileRouteParametersDto,
  ): Promise<ShoppingStoreProfileSelection> {
    return this.shoppingStoreProfilesService.selectProfile(
      this.getAuthenticatedUserId(request),
      parameters.profileId,
    );
  }

  @Delete(':profileId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an owned store profile and clear list and last-selection references',
  })
  @ApiParam({ name: 'profileId', required: true, schema: { type: 'string', format: 'uuid' } })
  @ApiNoContentResponse({ description: 'The store profile was deleted.' })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  async deleteProfile(
    @Req() request: RequestWithAccessToken,
    @Param() parameters: ShoppingStoreProfileRouteParametersDto,
  ): Promise<void> {
    await this.shoppingStoreProfilesService.deleteProfile(
      this.getAuthenticatedUserId(request),
      parameters.profileId,
    );
  }

  private getAuthenticatedUserId(request: RequestWithAccessToken): string {
    const accessToken = request.accessToken;

    if (accessToken === undefined) {
      throw new ApiException(
        'AUTH_ACCESS_TOKEN_INVALID',
        'The access token is invalid.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return accessToken.userId;
  }
}
