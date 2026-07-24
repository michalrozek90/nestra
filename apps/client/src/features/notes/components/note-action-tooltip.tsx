import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { Tooltip } from 'react-native-paper';

const WEB_TOOLTIP_HIDE_DELAY_MS = 120;
const NATIVE_TOOLTIP_HIDE_DELAY_MS = 1_500;

type NoteActionTooltipProps = {
  readonly children: ReactElement;
  readonly title: string;
};

export function NoteActionTooltip({ children, title }: NoteActionTooltipProps) {
  return (
    <Tooltip
      leaveTouchDelay={
        Platform.OS === 'web' ? WEB_TOOLTIP_HIDE_DELAY_MS : NATIVE_TOOLTIP_HIDE_DELAY_MS
      }
      title={title}
    >
      {children}
    </Tooltip>
  );
}
