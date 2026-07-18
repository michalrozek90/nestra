import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, useWindowDimensions, type ColorValue } from 'react-native';

import { getResponsiveLayout } from '@/theme/breakpoints';
import { colors, sizes } from '@/theme/tokens';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({ color, name, size }: { color: ColorValue; name: IoniconName; size: number }) {
  return <Ionicons color={color} name={name} size={size} />;
}

export default function ApplicationLayout() {
  const { t } = useTranslation('common');
  const { width } = useWindowDimensions();
  const responsiveLayout = getResponsiveLayout(width);
  const isCompact = responsiveLayout === 'compact';
  const isExpanded = responsiveLayout === 'expanded';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: styles.scene,
        tabBarActiveBackgroundColor: isCompact ? colors.surface : colors.primarySoft,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
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
        tabBarStyle: isCompact
          ? styles.tabBar
          : [
              styles.tabBar,
              {
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
  scene: {
    backgroundColor: colors.background,
  },
  sideTab: {
    borderRadius: 0,
    minHeight: 56,
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
