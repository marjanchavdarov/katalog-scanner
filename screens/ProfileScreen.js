import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, Image, ScrollView, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ saved: 0, scanned: 0, lists: 0 });

  useEffect(() => { loadUser(); }, []);

  async function loadUser() {
    try {
      const u = await AsyncStorage.getItem('user');
      if (u) setUser(JSON.parse(u));
      const saved = JSON.parse(await AsyncStorage.getItem('saved_products') || '[]');
      const history = JSON.parse(await AsyncStorage.getItem('scan_history') || '[]');
      const lists = JSON.parse(await AsyncStorage.getItem('shopping_lists') || '[]');
      setStats({ saved: saved.length, scanned: history.length, lists: lists.length });
    } catch {}
  }

  async function logout() {
    Alert.alert('Odjava', 'Sigurno se želiš odjaviti?', [
      { text: 'Odustani', style: 'cancel' },
      {
        text: 'Odjavi se', style: 'destructive', onPress: async () => {
          await AsyncStorage.removeItem('user');
          setUser(null);
        }
      }
    ]);
  }

  if (!user) return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.notLoggedWrap}>
        <Image source={require('../assets/stedko-wave.png')} style={styles.mascot} />
        <Text style={styles.notLoggedTitle}>Nisi prijavljen</Text>
        <Text style={styles.notLoggedSub}>Prijavi se za personalizirane preporuke i praćenje cijena</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Hero */}
        <View style={styles.hero}>
          <Image source={require('../assets/stedko-wave.png')} style={styles.mascot} />
          <Text style={styles.heroTitle}>Zdravo!</Text>
          <View style={styles.phoneBadge}>
            <Text style={styles.phoneBadgeText}>{user.phone}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats.scanned}</Text>
            <Text style={styles.statLabel}>Skeniranja</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxMid]}>
            <Text style={styles.statNum}>{stats.saved}</Text>
            <Text style={styles.statLabel}>Spremljeno</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats.lists}</Text>
            <Text style={styles.statLabel}>Popisi</Text>
          </View>
        </View>

        {/* Features card */}
        <View style={styles.featuresCard}>
          {[
            { icon: '🛒', text: 'Praćenje cijena aktivno' },
            { icon: '💰', text: 'Kupujte pametno i štedite' },
            { icon: '📊', text: 'Usporedba 21 trgovine' },
          ].map((f, i) => (
            <View key={i} style={[styles.featureRow, i < 2 && styles.featureRowBorder]}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Odjava</Text>
        </TouchableOpacity>

        <Text style={styles.version}>katalog.ai · v1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  hero: { alignItems: 'center', paddingVertical: 24 },
  mascot: { width: 160, height: 160, marginBottom: 8 },
  heroTitle: { fontSize: 28, fontWeight: '900', color: colors.ink, marginBottom: 8 },
  phoneBadge: {
    backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  phoneBadgeText: { fontSize: 16, fontWeight: '700', color: colors.ink },
  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, marginVertical: 16,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    overflow: 'hidden',
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 20 },
  statBoxMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
  statNum: { fontSize: 28, fontWeight: '900', color: colors.primary },
  statLabel: { fontSize: 11, color: colors.muted, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  featuresCard: {
    backgroundColor: '#fff', borderRadius: 20, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    overflow: 'hidden',
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  featureRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  featureIcon: { fontSize: 22 },
  featureText: { fontSize: 15, fontWeight: '600', color: colors.ink },
  logoutBtn: {
    borderRadius: 16, padding: 16, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#fff',
  },
  logoutText: { color: colors.muted, fontWeight: '700', fontSize: 15 },
  version: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 20 },
  notLoggedWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  notLoggedTitle: { fontSize: 22, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  notLoggedSub: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
});
