export type NoteDocumentSelection = {
  readonly start: number;
  readonly end: number;
};

export type NoteDocumentInputProps = {
  readonly accessibilityLabel: string;
  readonly autoFocus: boolean;
  readonly maxLength: number;
  readonly onBlur: () => void;
  readonly onChangeText: (document: string) => void;
  readonly onFocus: () => void;
  readonly onSelectionChange: (selection: NoteDocumentSelection) => void;
  readonly placeholder: string;
  readonly placeholderTextColor: string;
  readonly selection: NoteDocumentSelection | undefined;
  readonly selectionColor: string;
  readonly textColor: string;
  readonly value: string;
};
