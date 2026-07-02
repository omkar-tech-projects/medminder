import { Platform, useColorScheme, type ColorValue, Text as RNText } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { lightColors, darkColors } from '@/theme/colors';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function makeIcon(inactive: MCIName, active: MCIName) {
  return function Icon({
    focused,
    color,
  }: {
    focused: boolean;
    color: ColorValue;
    size: number;
  }) {
    // Use 20 instead of the default 24 — gives labels slightly more vertical breathing room
    return <MaterialCommunityIcons name={focused ? active : inactive} size={20} color={color} />;
  };
}

function makeLabel(title: string) {
  return function TabLabel({ color }: { focused: boolean; color: ColorValue; children: string }) {
    return (
      <RNText
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
        allowFontScaling={false}
        style={{
          fontFamily: 'Nunito_600SemiBold',
          fontSize: 10,
          color: color as string,
          textAlign: 'center',
          includeFontPadding: false,
          letterSpacing: 0,
        }}
      >
        {title}
      </RNText>
    );
  };
}

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? darkColors : lightColors;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 20 : 6,
          paddingTop: Platform.OS === 'android' ? 6 : 10,
          height: Platform.OS === 'ios' ? 82 : 64,
          shadowColor: 'rgba(15,27,45,1)',
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarShowLabel: true,
        tabBarIconStyle: {
          marginTop: Platform.OS === 'android' ? 2 : 0,
          marginBottom: Platform.OS === 'android' ? 1 : 0,
        },
        tabBarItemStyle: {
          paddingHorizontal: 0,
          paddingVertical: 0,
          flex: 1,
          minWidth: 0,
        },
        tabBarAllowFontScaling: false,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: makeIcon('home-outline', 'home'),
          tabBarLabel: makeLabel('Home'),
        }}
      />
      <Tabs.Screen
        name="medications"
        options={{
          title: 'Medicines',
          tabBarIcon: makeIcon('pill', 'pill'),
          tabBarLabel: makeLabel('Medicines'),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: makeIcon('calendar-month-outline', 'calendar-month'),
          tabBarLabel: makeLabel('Calendar'),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: makeIcon('chart-timeline-variant', 'chart-timeline-variant'),
          tabBarLabel: makeLabel('History'),
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: 'Family',
          tabBarIcon: makeIcon('account-group-outline', 'account-group'),
          tabBarLabel: makeLabel('Family'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: makeIcon('cog-outline', 'cog'),
          tabBarLabel: makeLabel('Settings'),
        }}
      />
    </Tabs>
  );
}
