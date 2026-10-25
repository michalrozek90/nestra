import {
  Body,
  Controller,
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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { ShoppingProduct, ShoppingProductList } from '@nestra/contracts';
import { ZodResponse } from 'nestjs-zod';

import { JwtAuthGuard, type RequestWithAccessToken } from '../auth';
import { ApiErrorResponseDto } from '../common/api-error-response.dto';
import { ApiException } from '../common/api.exception';
import { CreateShoppingProductDto } from './dto/create-shopping-product.dto';
import { ShoppingProductListDto } from './dto/shopping-product-list.dto';
import { ShoppingProductRouteParametersDto } from './dto/shopping-product-route-parameters.dto';
import { ShoppingProductDto } from './dto/shopping-product.dto';
import { UpdateShoppingProductDto } from './dto/update-shopping-product.dto';
import { ShoppingProductsService } from './shopping-products.service';

@ApiTags('shopping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shopping/products')
@ApiInternalServerErrorResponse({
  description: 'An unexpected server error occurred.',
  type: ApiErrorResponseDto,
})
export class ShoppingProductsController {
  constructor(private readonly shoppingProductsService: ShoppingProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List remembered products owned by the authenticated user' })
  @ZodResponse({
    status: HttpStatus.OK,
    description: 'Owned remembered products ordered by their comparison key.',
    type: ShoppingProductListDto,
  })
  @ApiOkResponse({
    description: 'Owned remembered products ordered by their comparison key.',
    type: ShoppingProductListDto,
  })
  @ApiUnauthorizedResponse({
    description: 'The access token is invalid.',
    type: ApiErrorResponseDto,
  })
  async listProducts(@Req() request: RequestWithAccessToken): Promise<ShoppingProductList> {
    return this.shoppingProductsService.listProducts(this.getAuthenticatedUserId(request));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Remember a product for the authenticated user' })
  @ApiBody({ type: CreateShoppingProductDto })
  @ZodResponse({
    status: HttpStatus.CREATED,
    description: 'The remembered product was created without recording a shopping-list usage.',
    type: ShoppingProductDto,
  })
  @ApiCreatedResponse({
    description: 'The remembered product was created without recording a shopping-list usage.',
    type: ShoppingProductDto,
  })
  @ApiBadRequestResponse({
    description: 'Request validation failed.',
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
    description: 'The user already has a remembered product with the same normalized name.',
    type: ApiErrorResponseDto,
  })
  async createProduct(
    @Req() request: RequestWithAccessToken,
    @Body() productInput: CreateShoppingProductDto,
  ): Promise<ShoppingProduct> {
    return this.shoppingProductsService.createProduct(
      this.getAuthenticatedUserId(request),
      productInput.name,
      productInput.categoryId,
    );
  }

  @Patch(':productId')
  @ApiOperation({ summary: 'Rename or recategorize an owned remembered product' })
  @ApiParam({
    name: 'productId',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiBody({ type: UpdateShoppingProductDto })
  @ZodResponse({
    status: HttpStatus.OK,
    description: 'The remembered product was updated without recording a shopping-list usage.',
    type: ShoppingProductDto,
  })
  @ApiOkResponse({
    description: 'The remembered product was updated without recording a shopping-list usage.',
    type: ShoppingProductDto,
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
    description:
      'The remembered product or shopping category is missing or is not owned by the authenticated user.',
    type: ApiErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'The user already has a remembered product with the same normalized name.',
    type: ApiErrorResponseDto,
  })
  async updateProduct(
    @Req() request: RequestWithAccessToken,
    @Param() parameters: ShoppingProductRouteParametersDto,
    @Body() productInput: UpdateShoppingProductDto,
  ): Promise<ShoppingProduct> {
    return this.shoppingProductsService.updateProduct(
      this.getAuthenticatedUserId(request),
      parameters.productId,
      productInput,
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
