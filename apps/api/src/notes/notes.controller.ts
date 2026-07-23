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
  Query,
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
import type { Note, NoteList } from '@nestra/contracts';
import { ZodResponse } from 'nestjs-zod';

import { JwtAuthGuard, type RequestWithAccessToken } from '../auth';
import { ApiErrorResponseDto } from '../common/api-error-response.dto';
import { ApiException } from '../common/api.exception';
import { CreateNoteDto } from './dto/create-note.dto';
import { NoteListDto } from './dto/note-list.dto';
import { NoteRouteParametersDto } from './dto/note-route-parameters.dto';
import { NoteDto } from './dto/note.dto';
import { NotesQueryDto } from './dto/notes-query.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NotesService } from './notes.service';

@ApiTags('notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiInternalServerErrorResponse({
  description: 'An unexpected server error occurred.',
  type: ApiErrorResponseDto,
})
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  @ApiOperation({ summary: 'List active or archived notes owned by the authenticated user' })
  @ZodResponse({
    status: HttpStatus.OK,
    description: 'Owned notes sorted by pin state and most recent update.',
    type: NoteListDto,
  })
  @ApiOkResponse({
    description: 'Owned notes sorted by pin state and most recent update.',
    type: NoteListDto,
  })
  @ApiBadRequestResponse({
    description: 'Query validation failed.',
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'The access token is invalid.',
    type: ApiErrorResponseDto,
  })
  async listNotes(
    @Req() request: RequestWithAccessToken,
    @Query() query: NotesQueryDto,
  ): Promise<NoteList> {
    return this.notesService.listNotes(this.getAuthenticatedUserId(request), query.archived);
  }

  @Get(':noteId')
  @ApiOperation({ summary: 'Return an owned note' })
  @ApiParam({
    name: 'noteId',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  @ZodResponse({
    status: HttpStatus.OK,
    description: 'The owned note was returned.',
    type: NoteDto,
  })
  @ApiOkResponse({
    description: 'The owned note was returned.',
    type: NoteDto,
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
    description: 'The note is missing or is not owned by the authenticated user.',
    type: ApiErrorResponseDto,
  })
  async getNote(
    @Req() request: RequestWithAccessToken,
    @Param() parameters: NoteRouteParametersDto,
  ): Promise<Note> {
    return this.notesService.getNote(this.getAuthenticatedUserId(request), parameters.noteId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a note for the authenticated user' })
  @ApiBody({ type: CreateNoteDto })
  @ZodResponse({
    status: HttpStatus.CREATED,
    description: 'The note was created.',
    type: NoteDto,
  })
  @ApiCreatedResponse({
    description: 'The note was created.',
    type: NoteDto,
  })
  @ApiBadRequestResponse({
    description: 'Request validation failed.',
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'The access token is invalid.',
    type: ApiErrorResponseDto,
  })
  async createNote(
    @Req() request: RequestWithAccessToken,
    @Body() noteInput: CreateNoteDto,
  ): Promise<Note> {
    return this.notesService.createNote(this.getAuthenticatedUserId(request), noteInput);
  }

  @Patch(':noteId')
  @ApiOperation({ summary: 'Update supported fields on an owned note' })
  @ApiParam({
    name: 'noteId',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiBody({ type: UpdateNoteDto })
  @ZodResponse({
    status: HttpStatus.OK,
    description: 'The note was updated.',
    type: NoteDto,
  })
  @ApiOkResponse({
    description: 'The note was updated.',
    type: NoteDto,
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
    description: 'The note is missing or is not owned by the authenticated user.',
    type: ApiErrorResponseDto,
  })
  async updateNote(
    @Req() request: RequestWithAccessToken,
    @Param() parameters: NoteRouteParametersDto,
    @Body() noteInput: UpdateNoteDto,
  ): Promise<Note> {
    return this.notesService.updateNote(
      this.getAuthenticatedUserId(request),
      parameters.noteId,
      noteInput,
    );
  }

  @Delete(':noteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete an owned note' })
  @ApiParam({
    name: 'noteId',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiNoContentResponse({
    description: 'The note was permanently deleted.',
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
    description: 'The note is missing or is not owned by the authenticated user.',
    type: ApiErrorResponseDto,
  })
  async deleteNote(
    @Req() request: RequestWithAccessToken,
    @Param() parameters: NoteRouteParametersDto,
  ): Promise<void> {
    await this.notesService.deleteNote(this.getAuthenticatedUserId(request), parameters.noteId);
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
