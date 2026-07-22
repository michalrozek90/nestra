import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, type ColorValue } from 'react-native';
import { Text } from 'react-native-paper';

import { getResponsiveLayout } from '@/theme/breakpoints';
import { sizes } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';
import { useAuth } from '@/infrastructure/auth/auth-provider';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({ color, name, size }: { color: ColorValue; name: IoniconName; size: number }) {
  return <Ionicons color={color} name={name} size={size} />;
}

export default function ApplicationLayout() {
  const { t } = useTranslation('common');
  const { width } = useWindowDimensions();
  const theme = useNestraTheme();
  const { status } = useAuth();
  const responsiveLayout = getResponsiveLayout(width);
  const isCompact = responsiveLayout === 'compact';
  const isExpanded = responsiveLayout === 'expanded';

  if (status !== 'authenticated') {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background },
        tabBarActiveBackgroundColor: isCompact
          ? theme.colors.surface
          : theme.colors.primaryContainer,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarItemStyle: isCompact ? styles.compactTab : styles.sideTab,
        ...(isCompact
          ? {
              tabBarLabel: ({ children, color }) => (
                <Text numberOfLines={1} style={[styles.compactTabLabel, { color }]}>
                  {children}
                </Text>
              ),
            }
          : {}),
        tabBarLabelPosition: isCompact ? 'below-icon' : 'beside-icon',
        tabBarLabelStyle: styles.tabLabel,
        tabBarPosition: isCompact ? 'bottom' : 'left',
        tabBarShowLabel: isCompact || isExpanded,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
          isCompact
            ? null
            : {
                minWidth: isExpanded ? sizes.navigationSidebarWidth : sizes.navigationRailWidth,
                width: isExpanded ? sizes.navigationSidebarWidth : sizes.navigationRailWidth,
              },
        ],
        tabBarVariant: isCompact ? 'uikit' : 'material',
      }}
    >
      <Tabs.Screen
        name="notes"
        options={{
          tabBarAccessibilityLabel: t('navigation.notes'),
          tabBarIcon: ({ color, size }) => (
            <TabIcon color={color} name="document-text-outline" size={size} />
          ),
          title: t('navigation.notes'),
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          tabBarAccessibilityLabel: t('navigation.shopping'),
          tabBarIcon: ({ color, size }) => (
            <TabIcon color={color} name="cart-outline" size={size} />
          ),
          title: t('navigation.shopping'),
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          tabBarAccessibilityLabel: t('navigation.reminders'),
          tabBarIcon: ({ color, size }) => (
            <TabIcon color={color} name="notifications-outline" size={size} />
          ),
          title: t('navigation.reminders'),
        }}
      />
      <Tabs.Screen
        name="relax"
        options={{
          tabBarAccessibilityLabel: t('navigation.relax'),
          tabBarIcon: ({ color, size }) => (
            <TabIcon color={color} name="headset-outline" size={size} />
          ),
          title: t('navigation.relax'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarAccessibilityLabel: t('navigation.settings'),
          tabBarIcon: ({ color, size }) => (
            <TabIcon color={color} name="settings-outline" size={size} />
          ),
          title: t('navigation.settings'),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  compactTab: {
    flex: 1,
    maxWidth: '20%',
    minHeight: sizes.minimumTouchTarget,
    minWidth: 0,
  },
  compactTabLabel: {
    fontSize: 10,
    maxWidth: 64,
  },
  sideTab: {
    borderRadius: 0,
    minHeight: 56,
  },
  tabBar: {
    borderStyle: 'solid',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
