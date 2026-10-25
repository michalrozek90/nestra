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
  ApiConflictResponse,
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
import type { ShoppingPreset, ShoppingPresetSummaryList } from '@nestra/contracts';
import { ZodResponse } from 'nestjs-zod';

import { JwtAuthGuard, type RequestWithAccessToken } from '../auth';
import { ApiErrorResponseDto } from '../common/api-error-response.dto';
import { ApiException } from '../common/api.exception';
import { CreateShoppingPresetDto } from './dto/create-shopping-preset.dto';
import { ReplaceShoppingPresetEntriesDto } from './dto/replace-shopping-preset-entries.dto';
import { ShoppingPresetRouteParametersDto } from './dto/shopping-preset-route-parameters.dto';
import { ShoppingPresetSummaryListDto } from './dto/shopping-preset-summary-list.dto';
import { ShoppingPresetDto } from './dto/shopping-preset.dto';
import { UpdateShoppingPresetDto } from './dto/update-shopping-preset.dto';
import { ShoppingPresetsService } from './shopping-presets.service';

@ApiTags('shopping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shopping/presets')
@ApiInternalServerErrorResponse({
  description: 'An unexpected server error occurred.',
  type: ApiErrorResponseDto,
})
export class ShoppingPresetsController {
  constructor(private readonly shoppingPresetsService: ShoppingPresetsService) {}

  @Get()
  @ApiOperation({ summary: 'List shopping presets owned by the authenticated user' })
  @ZodResponse({ status: HttpStatus.OK, type: ShoppingPresetSummaryListDto })
  @ApiOkResponse({ type: ShoppingPresetSummaryListDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  async listPresets(@Req() request: RequestWithAccessToken): Promise<ShoppingPresetSummaryList> {
    return this.shoppingPresetsService.listPresets(this.getAuthenticatedUserId(request));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a shopping preset snapshot for the authenticated user' })
  @ApiBody({ type: CreateShoppingPresetDto })
  @ZodResponse({ status: HttpStatus.CREATED, type: ShoppingPresetDto })
  @ApiCreatedResponse({ type: ShoppingPresetDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  async createPreset(
    @Req() request: RequestWithAccessToken,
    @Body() presetInput: CreateShoppingPresetDto,
  ): Promise<ShoppingPreset> {
    return this.shoppingPresetsService.createPreset(
      this.getAuthenticatedUserId(request),
      presetInput,
    );
  }

  @Get(':presetId')
  @ApiOperation({ summary: 'Fetch one owned shopping preset and its saved products' })
  @ApiParam({ name: 'presetId', required: true, schema: { type: 'string', format: 'uuid' } })
  @ZodResponse({ status: HttpStatus.OK, type: ShoppingPresetDto })
  @ApiOkResponse({ type: ShoppingPresetDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  async getPreset(
    @Req() request: RequestWithAccessToken,
    @Param() parameters: ShoppingPresetRouteParametersDto,
  ): Promise<ShoppingPreset> {
    return this.shoppingPresetsService.getPreset(
      this.getAuthenticatedUserId(request),
      parameters.presetId,
    );
  }

  @Patch(':presetId')
  @ApiOperation({ summary: 'Rename an owned shopping preset or change its store profile' })
  @ApiParam({ name: 'presetId', required: true, schema: { type: 'string', format: 'uuid' } })
  @ApiBody({ type: UpdateShoppingPresetDto })
  @ZodResponse({ status: HttpStatus.OK, type: ShoppingPresetDto })
  @ApiOkResponse({ type: ShoppingPresetDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  async updatePreset(
    @Req() request: RequestWithAccessToken,
    @Param() parameters: ShoppingPresetRouteParametersDto,
    @Body() presetInput: UpdateShoppingPresetDto,
  ): Promise<ShoppingPreset> {
    return this.shoppingPresetsService.updatePreset(
      this.getAuthenticatedUserId(request),
      parameters.presetId,
      presetInput,
    );
  }

  @Put(':presetId/entries')
  @ApiOperation({ summary: 'Replace the saved product snapshot of an owned shopping preset' })
  @ApiParam({ name: 'presetId', required: true, schema: { type: 'string', format: 'uuid' } })
  @ApiBody({ type: ReplaceShoppingPresetEntriesDto })
  @ZodResponse({ status: HttpStatus.OK, type: ShoppingPresetDto })
  @ApiOkResponse({ type: ShoppingPresetDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  async replaceEntries(
    @Req() request: RequestWithAccessToken,
    @Param() parameters: ShoppingPresetRouteParametersDto,
    @Body() replacement: ReplaceShoppingPresetEntriesDto,
  ): Promise<ShoppingPreset> {
    return this.shoppingPresetsService.replaceEntries(
      this.getAuthenticatedUserId(request),
      parameters.presetId,
      replacement,
    );
  }

  @Delete(':presetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an owned shopping preset' })
  @ApiParam({ name: 'presetId', required: true, schema: { type: 'string', format: 'uuid' } })
  @ApiNoContentResponse({ description: 'The shopping preset was deleted.' })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  async deletePreset(
    @Req() request: RequestWithAccessToken,
    @Param() parameters: ShoppingPresetRouteParametersDto,
  ): Promise<void> {
    await this.shoppingPresetsService.deletePreset(
      this.getAuthenticatedUserId(request),
      parameters.presetId,
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
