import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, Image, SafeAreaView, StatusBar,
  FlatList, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, storeColors } from '../theme';

const API = 'https://botapp-u7qa.onrender.com';

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('profile'); // 'profile' | 'saved'
  const [saved, setSaved] = useState([]);
  const [rescanning, setRescanning] = useState(null);

  useEffect(() => { loadUser(); }, []);

  useEffect(() => { if (tab === 'saved') loadSaved(); }, [tab]);

  async function loadUser() {
    const u = await AsyncStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
  }

  async function loadSaved() {
    const s = JSON.parse(await AsyncStorage.getItem('saved_products') || '[]');
    setSaved(s);
  }

  async function rescan(barcode) {
    setRescanning(barcode);
    try {
      const r = await fetch(`${API}/api/barcode/${barcode}`);
      const json = await r.json();
      const existing = JSON.parse(await AsyncStorage.getItem('saved_products') || '[]');
      const updated = existing.map(e => e.barcode === barcode
        ? { ...e, prices: json.prices, rescanned_at: new Date().toISOString() }
        : e
      );
      await AsyncStorage.setItem('saved_products', JSON.stringify(updated));
      setSaved(updated);
    } catch { Alert.alert('Greška', 'Nije moguće dohvatiti cijene.'); }
    finally { setRescanning(null); }
  }

  async function removeSaved(barcode) {
    const updated = saved.filter(e => e.barcode !== barcode);
    setSaved(updated);
    await AsyncStorage.setItem('saved_products', JSON.stringify(updated));
  }

  async function sendOtp() {
    if (!phone) return;
    setLoading(true); setError('');
    try {
      const r = await fetch(`${API}/api/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await r.json();
      if (data.ok) setStep('code');
      else setError(data.error || 'Greška');
    } catch { setError('Greška pri slanju SMS-a'); }
    finally { setLoading(false); }
  }

  async function verifyOtp() {
    if (!code) return;
    setLoading(true); setError('');
    try {
      const r = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code })
      });
      const data = await r.json();
      if (data.ok) {
        const u = { phone, user_id: data.user_id };
        await AsyncStorage.setItem('user', JSON.stringify(u));
        setUser(u);
      } else setError(data.error || 'Pogrešan kod');
    } catch { setError('Greška pri provjeri koda'); }
    finally { setLoading(false); }
  }

  async function logout() {
    await AsyncStorage.removeItem('user');
    setUser(null); setStep('phone'); setPhone(''); setCode(''); setTab('profile');
  }

  function timeAgo(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

  if (!user) return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'center' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.loginWrap}>
          <Image source={require('../assets/stedko-scan.png')} style={styles.loginMascot} resizeMode="contain" />
          <Text style={styles.loginTitle}>Prijava</Text>
          <Text style={styles.loginSub}>Pratite cijene i upravljajte popisima</Text>
          <View style={styles.loginCard}>
            {step === 'phone' ? (
              <>
                <Text style={styles.inputLabel}>Broj telefona</Text>
                <TextInput style={styles.input} placeholder="+385 91 234 5678"
                  placeholderTextColor={colors.muted} value={phone} onChangeText={setPhone}
                  keyboardType="phone-pad" autoComplete="tel" />
                {!!error && <Text style={styles.error}>{error}</Text>}
                <TouchableOpacity style={styles.btn} onPress={sendOtp} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Pošalji SMS kod</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>SMS kod poslan na {phone}</Text>
                <TextInput style={[styles.input, styles.codeInput]} placeholder="123456"
                  placeholderTextColor={colors.muted} value={code} onChangeText={setCode}
                  keyboardType="number-pad" maxLength={6} autoFocus />
                {!!error && <Text style={styles.error}>{error}</Text>}
                <TouchableOpacity style={styles.btn} onPress={verifyOtp} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Potvrdi →</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setStep('phone')} style={{ alignItems: 'center', marginTop: 12 }}>
                  <Text style={{ color: colors.muted, fontSize: 14 }}>← Promijeni broj</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'profile' && styles.tabBtnActive]}
          onPress={() => setTab('profile')}>
          <Text style={[styles.tabBtnText, tab === 'profile' && styles.tabBtnTextActive]}>👤 Profil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'saved' && styles.tabBtnActive]}
          onPress={() => { setTab('saved'); loadSaved(); }}>
          <Text style={[styles.tabBtnText, tab === 'saved' && styles.tabBtnTextActive]}>❤️ Spremljeno ({saved.length})</Text>
        </TouchableOpacity>
      </View>

      {tab === 'profile' && (
        <View style={styles.profileWrap}>
          <Image source={require('../assets/stedko-happy.png')} style={styles.mascot} resizeMode="contain" />
          <View style={styles.profileCard}>
            <Text style={styles.profileLabel}>Prijavljeni ste kao</Text>
            <Text style={styles.profilePhone}>{user.phone}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoRow}>🛒  Praćenje cijena aktivno</Text>
            <Text style={styles.infoRow}>💰  Kupujte pametno i štedite</Text>
            <Text style={styles.infoRow}>📊  Usporedba 21 trgovine</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Odjava</Text>
          </TouchableOpacity>
        </View>
      )}

      {tab === 'saved' && (
        <FlatList
          data={saved}
          keyExtractor={item => item.barcode}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={() => (
            <View style={{ alignItems: 'center', padding: 48 }}>
              <Image source={require('../assets/stedko-sad.png')} style={{ width: 120, height: 120, marginBottom: 16 }} resizeMode="contain" />
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>Nema spremljenih</Text>
              <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center' }}>Skeniraj proizvod i klikni ❤️ da ga spremiš</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.savedCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.savedName} numberOfLines={1}>{item.name || 'Nepoznat'}</Text>
                {item.brand && <Text style={styles.savedBrand}>{item.brand}</Text>}
                {item.rescanned_at && <Text style={styles.savedTime}>Ažurirano {timeAgo(item.rescanned_at)}</Text>}
                {item.prices?.length > 0 && (
                  <View style={styles.cheapRow}>
                    <View style={[styles.storeDot, { backgroundColor: storeColors[(item.prices[0].store || '').toLowerCase().replace(/[\s_]+/g, '')] || '#64748B' }]} />
                    <Text style={styles.cheapStore}>{(item.prices[0].store || '').toUpperCase()}</Text>
                    <Text style={styles.cheapPrice}>{parseFloat(item.prices[0].sale_price).toFixed(2)}€</Text>
                    {item.prices.length > 1 && (
                      <Text style={styles.moreStores}>+{item.prices.length - 1} trgovina</Text>
                    )}
                  </View>
                )}
              </View>
              <View style={styles.savedActions}>
                <TouchableOpacity style={styles.rescanBtn} onPress={() => rescan(item.barcode)} disabled={rescanning === item.barcode}>
                  {rescanning === item.barcode
                    ? <ActivityIndicator size="small" color={colors.primary} />
                    : <Text style={styles.rescanText}>🔄</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Alert.alert('Ukloni', `Ukloniti "${item.name}" iz spremljenih?`, [
                  { text: 'Odustani' },
                  { text: 'Ukloni', style: 'destructive', onPress: () => removeSaved(item.barcode) }
                ])}>
                  <Text style={{ fontSize: 20 }}>❤️</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  tabRow: { flexDirection: 'row', margin: 16, backgroundColor: '#F1F5F9', borderRadius: 14, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  tabBtnTextActive: { color: colors.ink, fontWeight: '700' },
  profileWrap: { flex: 1, alignItems: 'center', padding: 16, paddingTop: 8 },
  mascot: { width: 130, height: 130, marginBottom: 12 },
  profileCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '100%', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  profileLabel: { fontSize: 13, color: colors.muted, marginBottom: 6 },
  profilePhone: { fontSize: 20, fontWeight: '800', color: colors.ink },
  infoCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '100%', marginBottom: 24, borderWidth: 1, borderColor: colors.border, gap: 14 },
  infoRow: { fontSize: 14, color: colors.ink, fontWeight: '500' },
  logoutBtn: { borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 48, paddingVertical: 14 },
  logoutText: { color: '#94A3B8', fontWeight: '700', fontSize: 15 },
  savedCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, gap: 12 },
  savedName: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 2 },
  savedBrand: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  savedTime: { fontSize: 11, color: '#CBD5E1', marginBottom: 4 },
  cheapRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  storeDot: { width: 10, height: 10, borderRadius: 5 },
  cheapStore: { fontSize: 12, fontWeight: '700', color: colors.ink },
  cheapPrice: { fontSize: 14, fontWeight: '800', color: colors.primary },
  moreStores: { fontSize: 11, color: colors.muted },
  savedActions: { alignItems: 'center', gap: 12 },
  rescanBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  rescanText: { fontSize: 18 },
  loginWrap: { alignItems: 'center', padding: 24 },
  loginMascot: { width: 100, height: 100, marginBottom: 12 },
  loginTitle: { fontSize: 32, fontWeight: '900', color: colors.ink, marginBottom: 4 },
  loginSub: { fontSize: 14, color: colors.muted, marginBottom: 24, textAlign: 'center' },
  loginCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', borderWidth: 1, borderColor: colors.border },
  inputLabel: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 18, marginBottom: 16, color: colors.ink, backgroundColor: '#F8FAFC' },
  codeInput: { fontSize: 32, textAlign: 'center', letterSpacing: 10, fontWeight: '700' },
  error: { color: '#EF4444', marginBottom: 12, fontSize: 13, fontWeight: '500' },
  btn: { backgroundColor: colors.primary, padding: 16, borderRadius: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
