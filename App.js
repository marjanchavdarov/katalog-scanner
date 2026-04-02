import { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScannerScreen from './screens/ScannerScreen';
import SavedScreen from './screens/SavedScreen';
import ProfileScreen from './screens/ProfileScreen';
import OnboardingScreen from './screens/OnboardingScreen';

const Tab = createBottomTabNavigator();

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
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#E8572A" />
    </View>
  );

  if (!user) return <OnboardingScreen onVerified={(u) => setUser(u)} />;

  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{
        tabBarActiveTintColor: '#E8572A',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#eee' },
        headerStyle: { backgroundColor: '#1A1A1A' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}>
        <Tab.Screen name="Skeniraj" component={ScannerScreen}
          options={{ tabBarIcon: () => <Text style={{ fontSize: 22 }}>📷</Text>, title: 'katalog.ai' }} />
        <Tab.Screen name="Spremljeno" component={SavedScreen}
          options={{ tabBarIcon: () => <Text style={{ fontSize: 22 }}>❤️</Text> }} />
        <Tab.Screen name="Profil" component={ProfileScreen}
          options={{ tabBarIcon: () => <Text style={{ fontSize: 22 }}>👤</Text> }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
