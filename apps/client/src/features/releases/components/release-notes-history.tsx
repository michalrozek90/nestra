import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { getResponsiveLayout } from '@/theme/breakpoints';
import { radii, spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';

import { formatReleaseDate } from '../format-release-date';
import type { ReleaseNote } from '../release-notes';
import { splitReleaseHistory } from '../split-release-history';
import { ReleaseNoteChanges } from './release-note-changes';

type ReleaseNotesHistoryProps = {
  readonly releaseNotes: readonly ReleaseNote[];
};

export function ReleaseNotesHistory({ releaseNotes }: ReleaseNotesHistoryProps) {
  const { t } = useTranslation('releases');
  const { earlier, latest } = splitReleaseHistory(releaseNotes);
  const [expandedVersions, setExpandedVersions] = useState<ReadonlySet<string>>(
    () => new Set(latest ? [latest.version] : []),
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
      {latest ? (
        <ReleaseNotesHistoryItem
          isExpanded={expandedVersions.has(latest.version)}
          onToggle={() => toggleVersion(latest.version)}
          prominence="latest"
          releaseNote={latest}
        />
      ) : null}
      {earlier.length > 0 ? (
        <>
          <Text accessibilityRole="header" style={styles.earlierHeading}>
            {t('whatsNew.earlier')}
          </Text>
          {earlier.map((releaseNote) => (
            <ReleaseNotesHistoryItem
              isExpanded={expandedVersions.has(releaseNote.version)}
              key={releaseNote.version}
              onToggle={() => toggleVersion(releaseNote.version)}
              prominence="earlier"
              releaseNote={releaseNote}
            />
          ))}
        </>
      ) : null}
    </View>
  );
}

type ReleaseNotesHistoryItemProps = {
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
  readonly prominence: 'earlier' | 'latest';
  readonly releaseNote: ReleaseNote;
};

function ReleaseNotesHistoryItem({
  isExpanded,
  onToggle,
  prominence,
  releaseNote,
}: ReleaseNotesHistoryItemProps) {
  const { i18n, t } = useTranslation('releases');
  const { width: windowWidth } = useWindowDimensions();
  const theme = useNestraTheme();
  const isCompact = getResponsiveLayout(windowWidth) === 'compact';
  const isEarlier = prominence === 'earlier';
  const formattedDate = formatReleaseDate(releaseNote.releaseDate, i18n.language);
  const accessibilityLabel = formattedDate
    ? t('whatsNew.versionSummary', { date: formattedDate, version: releaseNote.version })
    : releaseNote.version;

  return (
    <View
      style={[
        styles.item,
        {
          backgroundColor: isEarlier ? theme.colors.surfaceVariant : theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        onPress={onToggle}
        style={[styles.header, isCompact ? styles.compactHeader : null]}
      >
        <View style={styles.headerCopy}>
          <Text
            style={[
              isEarlier ? styles.earlierVersion : styles.version,
              { color: theme.colors.onSurface },
            ]}
          >
            {releaseNote.version}
          </Text>
          {formattedDate ? (
            <Text style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}>
              {formattedDate}
            </Text>
          ) : null}
        </View>
        <Icon
          color={theme.colors.onSurfaceVariant}
          size={24}
          source={isExpanded ? 'chevron-up' : 'chevron-down'}
        />
      </Pressable>
      {isExpanded ? (
        <View style={[styles.body, isCompact ? styles.compactBody : null]}>
          <ReleaseNoteChanges isCompact={isCompact || isEarlier} releaseNote={releaseNote} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  compactBody: {
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  compactHeader: {
    padding: spacing.md,
  },
  earlierHeading: {
    ...typography.sectionTitle,
  },
  earlierVersion: {
    ...typography.supporting,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 48,
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
