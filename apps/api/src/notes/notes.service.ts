import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateNote, Note, NoteList, UpdateNote } from '@nestra/contracts';
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

  async listNotes(userId: string, isArchived: boolean): Promise<NoteList> {
    await this.databaseConnectionService.verifyConnection();
    const notes = await this.noteRepository.find({
      where: { userId, isArchived },
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
      title: noteInput.title,
      content: noteInput.content,
      isPinned: false,
      isArchived: false,
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

      const nextIsArchived = noteInput.isArchived ?? note.isArchived;
      const nextIsPinned = nextIsArchived ? false : (noteInput.isPinned ?? note.isPinned);

      if (nextIsArchived && noteInput.isPinned === true) {
        throw new ApiException(
          'VALIDATION_FAILED',
          'Archived notes cannot be pinned.',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (noteInput.title !== undefined) {
        note.title = noteInput.title;
      }

      if (noteInput.content !== undefined) {
        note.content = noteInput.content;
      }

      note.isArchived = nextIsArchived;
      note.isPinned = nextIsPinned;

      const savedNote = await transactionalNoteRepository.save(note);

      return this.toNote(savedNote);
    });
  }

  async deleteNote(userId: string, noteId: string): Promise<void> {
    await this.databaseConnectionService.verifyConnection();
    const deletion = await this.noteRepository.delete({ id: noteId, userId });

    if (deletion.affected !== 1) {
      throw this.createNoteNotFoundException();
    }
  }

  private toNote(note: NoteEntity): Note {
    return {
      id: note.id,
      title: note.title,
      content: note.content,
      isPinned: note.isPinned,
      isArchived: note.isArchived,
      createdAt: toIsoDateTimeString(note.createdAt),
      updatedAt: toIsoDateTimeString(note.updatedAt),
    };
  }

  private createNoteNotFoundException(): ApiException {
    return new ApiException('NOTE_NOT_FOUND', 'The note was not found.', HttpStatus.NOT_FOUND);
  }
}
