import { Platform, useColorScheme, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { lightColors, darkColors } from '@/theme/colors';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function makeIcon(inactive: MCIName, active: MCIName) {
  return function Icon({
    focused,
    color,
    size,
  }: {
    focused: boolean;
    color: ColorValue;
    size: number;
  }) {
    return <MaterialCommunityIcons name={focused ? active : inactive} size={size} color={color} />;
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
          paddingTop: Platform.OS === 'android' ? 8 : 10,
          height: Platform.OS === 'ios' ? 82 : 66,
          shadowColor: 'rgba(15,27,45,1)',
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontFamily: 'Nunito_600SemiBold',
          fontSize: Platform.OS === 'android' ? 8 : 10,
          marginBottom: Platform.OS === 'android' ? 2 : 0,
          includeFontPadding: false,
          letterSpacing: 0,
        },
        tabBarShowLabel: true,
        tabBarIconStyle: {
          marginTop: Platform.OS === 'android' ? 2 : 0,
        },
        tabBarItemStyle: {
          paddingHorizontal: 0,
          paddingVertical: 0,
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
        }}
      />
      <Tabs.Screen
        name="medications"
        options={{
          title: 'Medicines',
          tabBarIcon: makeIcon('pill', 'pill'),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: makeIcon('calendar-month-outline', 'calendar-month'),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: makeIcon('chart-timeline-variant', 'chart-timeline-variant'),
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: 'Family',
          tabBarIcon: makeIcon('account-group-outline', 'account-group'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: makeIcon('cog-outline', 'cog'),
        }}
      />
    </Tabs>
  );
}
