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
import type { ShoppingList, ShoppingListSummaryList } from '@nestra/contracts';
import { ZodResponse } from 'nestjs-zod';

import { JwtAuthGuard, type RequestWithAccessToken } from '../auth';
import { ApiErrorResponseDto } from '../common/api-error-response.dto';
import { ApiException } from '../common/api.exception';
import { AddShoppingListItemDto } from './dto/add-shopping-list-item.dto';
import { CreateShoppingListDto } from './dto/create-shopping-list.dto';
import { ShoppingListRouteParametersDto } from './dto/shopping-list-route-parameters.dto';
import { ShoppingListSummaryListDto } from './dto/shopping-list-summary-list.dto';
import { ShoppingListDto } from './dto/shopping-list.dto';
import { UpdateShoppingListDto } from './dto/update-shopping-list.dto';
import { ShoppingListsService } from './shopping-lists.service';

@ApiTags('shopping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shopping/lists')
@ApiInternalServerErrorResponse({
  description: 'An unexpected server error occurred.',
  type: ApiErrorResponseDto,
})
export class ShoppingListsController {
  constructor(private readonly shoppingListsService: ShoppingListsService) {}

  @Get()
  @ApiOperation({ summary: 'List shopping lists owned by the authenticated user' })
  @ZodResponse({ status: HttpStatus.OK, type: ShoppingListSummaryListDto })
  @ApiOkResponse({ type: ShoppingListSummaryListDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  async listLists(@Req() request: RequestWithAccessToken): Promise<ShoppingListSummaryList> {
    return this.shoppingListsService.listLists(this.getAuthenticatedUserId(request));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an empty shopping list for the authenticated user' })
  @ApiBody({ type: CreateShoppingListDto })
  @ZodResponse({ status: HttpStatus.CREATED, type: ShoppingListDto })
  @ApiCreatedResponse({ type: ShoppingListDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  async createList(
    @Req() request: RequestWithAccessToken,
    @Body() listInput: CreateShoppingListDto,
  ): Promise<ShoppingList> {
    return this.shoppingListsService.createList(
      this.getAuthenticatedUserId(request),
      listInput.name,
    );
  }

  @Get(':listId')
  @ApiOperation({ summary: 'Fetch one owned shopping list and its products' })
  @ApiParam({ name: 'listId', required: true, schema: { type: 'string', format: 'uuid' } })
  @ZodResponse({ status: HttpStatus.OK, type: ShoppingListDto })
  @ApiOkResponse({ type: ShoppingListDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  async getList(
    @Req() request: RequestWithAccessToken,
    @Param() parameters: ShoppingListRouteParametersDto,
  ): Promise<ShoppingList> {
    return this.shoppingListsService.getList(
      this.getAuthenticatedUserId(request),
      parameters.listId,
    );
  }

  @Patch(':listId')
  @ApiOperation({ summary: 'Rename an owned shopping list' })
  @ApiParam({ name: 'listId', required: true, schema: { type: 'string', format: 'uuid' } })
  @ApiBody({ type: UpdateShoppingListDto })
  @ZodResponse({ status: HttpStatus.OK, type: ShoppingListDto })
  @ApiOkResponse({ type: ShoppingListDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  async renameList(
    @Req() request: RequestWithAccessToken,
    @Param() parameters: ShoppingListRouteParametersDto,
    @Body() listInput: UpdateShoppingListDto,
  ): Promise<ShoppingList> {
    return this.shoppingListsService.renameList(
      this.getAuthenticatedUserId(request),
      parameters.listId,
      listInput.name,
    );
  }

  @Delete(':listId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an owned shopping list without deleting remembered products' })
  @ApiParam({ name: 'listId', required: true, schema: { type: 'string', format: 'uuid' } })
  @ApiNoContentResponse({ description: 'The shopping list was deleted.' })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  async deleteList(
    @Req() request: RequestWithAccessToken,
    @Param() parameters: ShoppingListRouteParametersDto,
  ): Promise<void> {
    await this.shoppingListsService.deleteList(
      this.getAuthenticatedUserId(request),
      parameters.listId,
    );
  }

  @Post(':listId/items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Add a product to an owned shopping list, merging a duplicate by quantity',
  })
  @ApiParam({ name: 'listId', required: true, schema: { type: 'string', format: 'uuid' } })
  @ApiBody({ type: AddShoppingListItemDto })
  @ZodResponse({ status: HttpStatus.OK, type: ShoppingListDto })
  @ApiOkResponse({ type: ShoppingListDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  async addItem(
    @Req() request: RequestWithAccessToken,
    @Param() parameters: ShoppingListRouteParametersDto,
    @Body() itemInput: AddShoppingListItemDto,
  ): Promise<ShoppingList> {
    return this.shoppingListsService.addItem(
      this.getAuthenticatedUserId(request),
      parameters.listId,
      itemInput,
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
