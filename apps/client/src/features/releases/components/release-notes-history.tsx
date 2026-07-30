import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { radii, spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';

import type { ReleaseNote } from '../release-notes';
import { ReleaseNoteChanges } from './release-note-changes';

type ReleaseNotesHistoryProps = {
  readonly initiallyExpandedVersion?: string;
  readonly releaseNotes: readonly ReleaseNote[];
};

export function ReleaseNotesHistory({
  initiallyExpandedVersion,
  releaseNotes,
}: ReleaseNotesHistoryProps) {
  const [expandedVersions, setExpandedVersions] = useState<ReadonlySet<string>>(
    () => new Set(initiallyExpandedVersion ? [initiallyExpandedVersion] : []),
  );

  function toggleVersion(version: string): void {
    setExpandedVersions((currentVersions) => {
      const nextVersions = new Set(currentVersions);

      if (nextVersions.has(version)) {
        nextVersions.delete(version);
      } else {
        nextVersions.add(version);
      }

      return nextVersions;
    });
  }

  return (
    <View style={styles.list}>
      {releaseNotes.map((releaseNote) => (
        <ReleaseNotesHistoryItem
          isExpanded={expandedVersions.has(releaseNote.version)}
          key={releaseNote.version}
          onToggle={() => toggleVersion(releaseNote.version)}
          releaseNote={releaseNote}
        />
      ))}
    </View>
  );
}

type ReleaseNotesHistoryItemProps = {
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
  readonly releaseNote: ReleaseNote;
};

function ReleaseNotesHistoryItem({
  isExpanded,
  onToggle,
  releaseNote,
}: ReleaseNotesHistoryItemProps) {
  const { i18n, t } = useTranslation('releases');
  const theme = useNestraTheme();
  const formattedDate = formatReleaseDate(releaseNote.releaseDate, i18n.language);
  const title = t(releaseNote.titleTranslationKey);

  return (
    <View
      style={[
        styles.item,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        onPress={onToggle}
        style={styles.header}
      >
        <View style={styles.headerCopy}>
          <Text style={styles.version}>{releaseNote.version}</Text>
          <Text style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}>
            {title}
            {formattedDate ? ` · ${formattedDate}` : ''}
          </Text>
        </View>
        <Icon
          color={theme.colors.onSurfaceVariant}
          size={24}
          source={isExpanded ? 'chevron-up' : 'chevron-down'}
        />
      </Pressable>
      {isExpanded ? (
        <View style={styles.body}>
          <ReleaseNoteChanges releaseNote={releaseNote} />
        </View>
      ) : null}
    </View>
  );
}

function formatReleaseDate(releaseDate: string, language: string): string {
  const parsedDate = new Date(`${releaseDate}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return parsedDate.toLocaleDateString(language, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  item: {
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  list: {
    gap: spacing.md,
  },
  meta: {
    ...typography.supporting,
  },
  version: {
    ...typography.settingsTitle,
  },
});
