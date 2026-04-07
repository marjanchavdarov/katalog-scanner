import { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScannerScreen from './screens/ScannerScreen';
import MojPopisScreen from './screens/MojPopisScreen';
import ProfileScreen from './screens/ProfileScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import { colors } from './theme';

const Tab = createBottomTabNavigator();

function ScanButton() {
  return (
    <View style={styles.scanBtn}>
      <View style={styles.scanInner} />
    </View>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('user').then(u => {
      if (u) setUser(JSON.parse(u));
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <View style={styles.splash}>
      <Text style={styles.splashText}>Štedko</Text>
      <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
    </View>
  );

  if (!user) return <OnboardingScreen onVerified={setUser} />;

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarShowLabel: true,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tab.Screen
          name="Popis"
          component={MojPopisScreen}
          options={{
            tabBarLabel: 'Popis',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 20, lineHeight: 24, color }}>🛒</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Skeniraj"
          component={ScannerScreen}
          options={{
            tabBarLabel: '',
            tabBarIcon: () => <ScanButton />,
          }}
        />
        <Tab.Screen
          name="Profil"
          component={ProfileScreen}
          options={{
            tabBarLabel: 'Profil',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 20, lineHeight: 24, color }}>👤</Text>
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  splashText: {
    fontSize: 36, fontWeight: '900', color: colors.primary,
  },
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    height: 68,
    paddingBottom: 10,
    paddingTop: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 0,
  },
  scanBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginTop: -20,
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  scanInner: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 3, borderColor: '#fff',
  },
});
