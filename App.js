import { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScannerScreen from './screens/ScannerScreen';
import SavedScreen from './screens/SavedScreen';
import ProfileScreen from './screens/ProfileScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import { colors } from './theme';

const Tab = createBottomTabNavigator();

function TabIcon({ label, icon, focused }) {
  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.tabIconText, focused && styles.tabIconActive]}>{icon}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

function ScanTabIcon({ focused }) {
  return (
    <View style={styles.scanButton}>
      <Text style={styles.scanIcon}>📷</Text>
    </View>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => { checkUser(); }, []);

  async function checkUser() {
    const u = await AsyncStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
    setLoading(false);
  }

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  if (!user) return <OnboardingScreen onVerified={(u) => setUser(u)} />;

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: styles.tabBar,
          tabBarShowLabel: false,
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        }}>
        <Tab.Screen name="Spremljeno" component={SavedScreen}
          options={{
            title: 'katalog.ai',
            tabBarIcon: ({ focused }) => <TabIcon label="Spremljeno" icon="❤️" focused={focused} />
          }} />
        <Tab.Screen name="Skeniraj" component={ScannerScreen}
          options={{
            title: 'katalog.ai',
            tabBarIcon: ({ focused }) => <ScanTabIcon focused={focused} />
          }} />
        <Tab.Screen name="Profil" component={ProfileScreen}
          options={{
            title: 'Profil',
            tabBarIcon: ({ focused }) => <TabIcon label="Profil" icon="👤" focused={focused} />
          }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopColor: colors.border,
    height: 70,
    paddingBottom: 8,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tabIcon: { alignItems: 'center', justifyContent: 'center', paddingTop: 6 },
  tabIconText: { fontSize: 22, opacity: 0.5 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 10, color: colors.muted, marginTop: 2 },
  tabLabelActive: { color: colors.primary, fontWeight: '600' },
  scanButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 5,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  scanIcon: { fontSize: 26 },
});
