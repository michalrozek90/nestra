import { useEffect, useRef, type CSSProperties } from 'react';

import type { NoteDocumentInputProps } from './note-document-input.types';

type NoteDocumentInputStyle = CSSProperties & {
  readonly '--nestra-note-placeholder-color': string;
};

const inputClassName = 'nestra-note-document-input';
const inputResetStyles = `
  .${inputClassName},
  .${inputClassName}:focus,
  .${inputClassName}:focus-visible {
    border: 0 !important;
    box-shadow: none !important;
    outline: none !important;
  }

  .${inputClassName}::placeholder {
    color: var(--nestra-note-placeholder-color);
    opacity: 1;
  }
`;

export function NoteDocumentInput({
  accessibilityLabel,
  autoFocus,
  maxLength,
  onBlur,
  onChangeText,
  onFocus,
  onSelectionChange,
  placeholder,
  placeholderTextColor,
  selection,
  selectionColor,
  textColor,
  value,
}: NoteDocumentInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!selection || !inputRef.current) {
      return;
    }

    inputRef.current.focus();
    inputRef.current.setSelectionRange(selection.start, selection.end);
  }, [selection]);

  const inputStyle: NoteDocumentInputStyle = {
    '--nestra-note-placeholder-color': placeholderTextColor,
    appearance: 'none',
    background: 'transparent',
    border: 0,
    boxSizing: 'border-box',
    caretColor: selectionColor,
    color: textColor,
    display: 'block',
    flex: 1,
    font: 'inherit',
    lineHeight: 'inherit',
    minHeight: 0,
    outline: 'none',
    padding: 0,
    resize: 'none',
    width: '100%',
  };

  return (
    <>
      <style>{inputResetStyles}</style>
      <textarea
        ref={inputRef}
        aria-label={accessibilityLabel}
        autoFocus={autoFocus}
        className={inputClassName}
        maxLength={maxLength}
        onBlur={onBlur}
        onChange={(event) => {
          onChangeText(event.currentTarget.value);
        }}
        onFocus={onFocus}
        onSelect={(event) => {
          onSelectionChange({
            end: event.currentTarget.selectionEnd,
            start: event.currentTarget.selectionStart,
          });
        }}
        placeholder={placeholder}
        style={inputStyle}
        value={value}
      />
    </>
  );
}
