import { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScannerScreen from './screens/ScannerScreen';
import SavedScreen from './screens/SavedScreen';
import ProfileScreen from './screens/ProfileScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import { colors } from './theme';

const Tab = createBottomTabNavigator();

function TabIcon({ label, emoji, focused }) {
  return (
    <View style={[styles.tabItem, focused && styles.tabItemActive]}>
      <Text style={styles.tabEmoji}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

function ScanButton() {
  return (
    <View style={styles.scanWrap}>
      <View style={styles.scanBtn}>
        <Text style={styles.scanEmoji}>⊙</Text>
      </View>
      <Text style={styles.scanLabel}>Skeniraj</Text>
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
      <Text style={styles.splashLogo}>katalog</Text>
      <Text style={styles.splashDot}>.ai</Text>
      <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
    </View>
  );

  if (!user) return <OnboardingScreen onVerified={setUser} />;

  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        headerShown: false,
      }}>
        <Tab.Screen name="Spremljeno" component={SavedScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon label="Moji" emoji="❤️" focused={focused} /> }} />
        <Tab.Screen name="Skeniraj" component={ScannerScreen}
          options={{ tabBarIcon: () => <ScanButton /> }} />
        <Tab.Screen name="Profil" component={ProfileScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon label="Profil" emoji="👤" focused={focused} /> }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap',
  },
  splashLogo: { fontSize: 36, fontWeight: '800', color: '#fff' },
  splashDot: { fontSize: 36, fontWeight: '300', color: 'rgba(255,255,255,0.7)' },
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
    height: 78,
    paddingTop: 8,
    paddingBottom: 12,
    elevation: 20,
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  tabItem: { alignItems: 'center', gap: 3, opacity: 0.45, paddingTop: 4 },
  tabItemActive: { opacity: 1 },
  tabEmoji: { fontSize: 20 },
  tabLabel: { fontSize: 10, color: colors.ink2, fontWeight: '500' },
  tabLabelActive: { color: colors.primary, fontWeight: '700' },
  scanWrap: { alignItems: 'center', gap: 3, marginBottom: 4 },
  scanBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginTop: -16,
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  scanEmoji: { fontSize: 24, color: '#fff' },
  scanLabel: { fontSize: 9, color: colors.primary, fontWeight: '700', letterSpacing: -0.3 },
});
