import { StyleSheet, TextInput } from 'react-native';

import { typography } from '@/theme/tokens';
import type { NoteDocumentInputProps } from './note-document-input.types';

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
  return (
    <TextInput
      accessibilityLabel={accessibilityLabel}
      autoFocus={autoFocus}
      maxLength={maxLength}
      multiline
      onBlur={onBlur}
      onChangeText={onChangeText}
      onFocus={onFocus}
      onSelectionChange={({ nativeEvent }) => {
        onSelectionChange(nativeEvent.selection);
      }}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      selection={selection}
      selectionColor={selectionColor}
      style={[styles.input, { color: textColor }]}
      textAlignVertical="top"
      value={value}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    ...typography.body,
    borderWidth: 0,
    flex: 1,
    padding: 0,
  },
});
