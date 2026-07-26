# 004 — Unified note document model

## Status

Accepted

## Context

The initial Notes model stored independently editable `title` and `content` values. That model
forced the client to present a form even though a note should behave as one directly editable
document. It also allowed the title displayed on the notes list to diverge from the first logical
line users saw in the note body.

Existing records can contain a 120-character title and 20,000 characters of content. Combining
those values with the required blank line can therefore produce a 20,122-character document.
Migration must preserve that text without truncation or reordering.

## Decision

The persisted user-editable note value is a single normalized `document` column. Create and update
contracts accept `document`, and the client editor and local draft storage use the same value.

The API derives `title` from the trimmed first non-empty logical line after normalizing line
endings. The derived line is limited to 240 characters. `title` remains part of API responses for
list display but is neither accepted as input nor stored in the database.

The document limit is 20,122 characters. This documented adjustment from the preferred
20,000-character limit is required so the migration can combine the previous maximum title, two
line feeds, and previous maximum content without data loss.

The migration normally converts existing records to `title + "\n\n" + content` when content is
present, drops the old title and content columns, and preserves note identity, ownership, state,
and timestamps. Existing local drafts are converted through the same composition when read and
are written back in the unified format.

## Consequences

- Reading, editing, autosave, and draft recovery share one source of truth.
- List titles cannot drift from note documents.
- List responses derive titles in the API service instead of reading a dedicated indexed column.
- The maximum document length is slightly higher than the preferred new-note limit to guarantee a
  lossless migration.
- A future need for title-specific database search or indexing requires a new measured decision,
  such as an expression index, without reintroducing an independently editable field.

## Alternatives considered

- Keep independently editable title and content columns: rejected because it preserves the form
  model and allows the two user-visible representations to diverge.
- Store a derived title column: rejected because JavaScript and PostgreSQL would need permanently
  identical logical-line and whitespace normalization semantics, creating avoidable drift risk.
- Enforce a 20,000-character unified limit during migration: rejected because valid existing
  maximum-length records would need truncation or migration failure.
