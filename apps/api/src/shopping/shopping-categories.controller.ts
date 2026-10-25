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
import type { ShoppingCategory, ShoppingCategoryList } from '@nestra/contracts';
import { ZodResponse } from 'nestjs-zod';

import { JwtAuthGuard, type RequestWithAccessToken } from '../auth';
import { ApiErrorResponseDto } from '../common/api-error-response.dto';
import { ApiException } from '../common/api.exception';
import { CreateShoppingCategoryDto } from './dto/create-shopping-category.dto';
import { ShoppingCategoryListDto } from './dto/shopping-category-list.dto';
import { ShoppingCategoryRouteParametersDto } from './dto/shopping-category-route-parameters.dto';
import { ShoppingCategoryDto } from './dto/shopping-category.dto';
import { UpdateShoppingCategoryDto } from './dto/update-shopping-category.dto';
import { ShoppingCategoriesService } from './shopping-categories.service';

@ApiTags('shopping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiInternalServerErrorResponse({
  description: 'An unexpected server error occurred.',
  type: ApiErrorResponseDto,
})
@Controller('shopping/categories')
export class ShoppingCategoriesController {
  constructor(private readonly shoppingCategoriesService: ShoppingCategoriesService) {}

  @Get()
  @ApiOperation({
    summary: 'List built-in shopping categories and custom categories owned by the user',
  })
  @ZodResponse({
    status: HttpStatus.OK,
    description: 'Built-in categories in catalog order, followed by the owned custom categories.',
    type: ShoppingCategoryListDto,
  })
  @ApiOkResponse({
    description: 'Built-in categories in catalog order, followed by the owned custom categories.',
    type: ShoppingCategoryListDto,
  })
  @ApiUnauthorizedResponse({
    description: 'The access token is invalid.',
    type: ApiErrorResponseDto,
  })
  async listCategories(@Req() request: RequestWithAccessToken): Promise<ShoppingCategoryList> {
    return this.shoppingCategoriesService.listCategories(this.getAuthenticatedUserId(request));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a custom shopping category for the authenticated user' })
  @ApiBody({ type: CreateShoppingCategoryDto })
  @ZodResponse({
    status: HttpStatus.CREATED,
    description: 'The custom shopping category was created.',
    type: ShoppingCategoryDto,
  })
  @ApiCreatedResponse({
    description: 'The custom shopping category was created.',
    type: ShoppingCategoryDto,
  })
  @ApiBadRequestResponse({
    description: 'Request validation failed.',
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'The access token is invalid.',
    type: ApiErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'The user already has a custom category with the same normalized name.',
    type: ApiErrorResponseDto,
  })
  async createCategory(
    @Req() request: RequestWithAccessToken,
    @Body() categoryInput: CreateShoppingCategoryDto,
  ): Promise<ShoppingCategory> {
    return this.shoppingCategoriesService.createCategory(
      this.getAuthenticatedUserId(request),
      categoryInput.name,
    );
  }

  @Patch(':categoryId')
  @ApiOperation({ summary: 'Rename an owned custom shopping category' })
  @ApiParam({
    name: 'categoryId',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiBody({ type: UpdateShoppingCategoryDto })
  @ZodResponse({
    status: HttpStatus.OK,
    description: 'The custom shopping category was renamed without changing its id.',
    type: ShoppingCategoryDto,
  })
  @ApiOkResponse({
    description: 'The custom shopping category was renamed without changing its id.',
    type: ShoppingCategoryDto,
  })
  @ApiBadRequestResponse({
    description: 'Request or route parameter validation failed.',
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'The access token is invalid.',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'The shopping category is missing or is not owned by the authenticated user.',
    type: ApiErrorResponseDto,
  })
  @ApiConflictResponse({
    description:
      'The category is built in, or the user already has a custom category with the same normalized name.',
    type: ApiErrorResponseDto,
  })
  async renameCategory(
    @Req() request: RequestWithAccessToken,
    @Param() parameters: ShoppingCategoryRouteParametersDto,
    @Body() categoryInput: UpdateShoppingCategoryDto,
  ): Promise<ShoppingCategory> {
    return this.shoppingCategoriesService.renameCategory(
      this.getAuthenticatedUserId(request),
      parameters.categoryId,
      categoryInput.name,
    );
  }

  @Delete(':categoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an owned custom shopping category' })
  @ApiParam({
    name: 'categoryId',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiNoContentResponse({
    description: 'The custom shopping category was deleted.',
  })
  @ApiBadRequestResponse({
    description: 'Route parameter validation failed.',
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'The access token is invalid.',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'The shopping category is missing or is not owned by the authenticated user.',
    type: ApiErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Built-in shopping categories, including Other, cannot be deleted.',
    type: ApiErrorResponseDto,
  })
  async deleteCategory(
    @Req() request: RequestWithAccessToken,
    @Param() parameters: ShoppingCategoryRouteParametersDto,
  ): Promise<void> {
    await this.shoppingCategoriesService.deleteCategory(
      this.getAuthenticatedUserId(request),
      parameters.categoryId,
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
