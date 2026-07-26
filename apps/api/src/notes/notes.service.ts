import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  deriveNoteTitle,
  type CreateNote,
  type EmptyTrashResponse,
  type Note,
  type NoteList,
  type UpdateNote,
} from '@nestra/contracts';
import { DataSource, Repository } from 'typeorm';

import { ApiException } from '../common/api.exception';
import { toIsoDateTimeString } from '../common/date-time';
import { DatabaseConnectionService } from '../database/database-connection.service';
import { NoteEntity } from './entities/note.entity';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(NoteEntity)
    private readonly noteRepository: Repository<NoteEntity>,
    private readonly databaseConnectionService: DatabaseConnectionService,
    private readonly dataSource: DataSource,
  ) {}

  async listNotes(userId: string, isTrashed: boolean): Promise<NoteList> {
    await this.databaseConnectionService.verifyConnection();
    const notes = await this.noteRepository.find({
      where: { userId, isTrashed },
      order: {
        isPinned: 'DESC',
        updatedAt: 'DESC',
      },
    });

    return notes.map((note) => this.toNote(note));
  }

  async getNote(userId: string, noteId: string): Promise<Note> {
    await this.databaseConnectionService.verifyConnection();
    const note = await this.noteRepository.findOne({
      where: { id: noteId, userId },
    });

    if (note === null) {
      throw this.createNoteNotFoundException();
    }

    return this.toNote(note);
  }

  async createNote(userId: string, noteInput: CreateNote): Promise<Note> {
    await this.databaseConnectionService.verifyConnection();
    const note = this.noteRepository.create({
      userId,
      document: noteInput.document,
      isPinned: false,
      isTrashed: false,
    });
    const savedNote = await this.noteRepository.save(note);

    return this.toNote(savedNote);
  }

  async updateNote(userId: string, noteId: string, noteInput: UpdateNote): Promise<Note> {
    await this.databaseConnectionService.verifyConnection();

    return this.dataSource.transaction(async (entityManager) => {
      const transactionalNoteRepository = entityManager.getRepository(NoteEntity);
      const note = await transactionalNoteRepository.findOne({
        where: { id: noteId, userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (note === null) {
        throw this.createNoteNotFoundException();
      }

      const nextIsTrashed = noteInput.isTrashed ?? note.isTrashed;
      const isRestoring = note.isTrashed && !nextIsTrashed;
      const nextIsPinned =
        nextIsTrashed || isRestoring ? false : (noteInput.isPinned ?? note.isPinned);

      if ((nextIsTrashed || isRestoring) && noteInput.isPinned === true) {
        throw new ApiException(
          'VALIDATION_FAILED',
          isRestoring
            ? 'A note cannot be restored and pinned in the same request.'
            : 'Trashed notes cannot be pinned.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const isPinStateOnlyUpdate =
        noteInput.isPinned !== undefined &&
        noteInput.document === undefined &&
        noteInput.isTrashed === undefined;

      if (isPinStateOnlyUpdate) {
        await transactionalNoteRepository
          .createQueryBuilder()
          .update(NoteEntity)
          .set({
            isPinned: nextIsPinned,
            updatedAt: note.updatedAt,
          })
          .where({
            id: noteId,
            userId,
          })
          .execute();

        note.isPinned = nextIsPinned;
        return this.toNote(note);
      }

      if (noteInput.document !== undefined) {
        note.document = noteInput.document;
      }

      note.isTrashed = nextIsTrashed;
      note.isPinned = nextIsPinned;

      const savedNote = await transactionalNoteRepository.save(note);

      return this.toNote(savedNote);
    });
  }

  async deleteNote(userId: string, noteId: string): Promise<void> {
    await this.databaseConnectionService.verifyConnection();

    await this.dataSource.transaction(async (entityManager) => {
      const transactionalNoteRepository = entityManager.getRepository(NoteEntity);
      const note = await transactionalNoteRepository.findOne({
        where: { id: noteId, userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (note === null) {
        throw this.createNoteNotFoundException();
      }

      if (!note.isTrashed) {
        throw new ApiException(
          'NOTE_NOT_TRASHED',
          'Only a note in Trash can be permanently deleted.',
          HttpStatus.CONFLICT,
        );
      }

      await transactionalNoteRepository.remove(note);
    });
  }

  async emptyTrash(userId: string): Promise<EmptyTrashResponse> {
    await this.databaseConnectionService.verifyConnection();
    const deletion = await this.noteRepository.delete({ userId, isTrashed: true });

    return { deletedNotesCount: deletion.affected ?? 0 };
  }

  private toNote(note: NoteEntity): Note {
    return {
      id: note.id,
      title: this.getDerivedTitle(note.document),
      document: note.document,
      isPinned: note.isPinned,
      isTrashed: note.isTrashed,
      createdAt: toIsoDateTimeString(note.createdAt),
      updatedAt: toIsoDateTimeString(note.updatedAt),
    };
  }

  private createNoteNotFoundException(): ApiException {
    return new ApiException('NOTE_NOT_FOUND', 'The note was not found.', HttpStatus.NOT_FOUND);
  }

  private getDerivedTitle(document: string): string {
    const title = deriveNoteTitle(document);
    if (title === null) {
      throw new ApiException(
        'VALIDATION_FAILED',
        'The note document must contain a non-whitespace line.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return title;
  }
}
