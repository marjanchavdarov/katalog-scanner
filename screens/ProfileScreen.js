import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image, SafeAreaView, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';

const API = 'https://botapp-u7qa.onrender.com';

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadUser(); }, []);

  async function loadUser() {
    const u = await AsyncStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
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
    setUser(null); setStep('phone'); setPhone(''); setCode('');
  }

  if (user) return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
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
    </SafeAreaView>
  );

  return (
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
                <TextInput
                  style={styles.input}
                  placeholder="+385 91 234 5678"
                  placeholderTextColor={colors.muted}
                  value={phone} onChangeText={setPhone}
                  keyboardType="phone-pad" autoComplete="tel"
                />
                {!!error && <Text style={styles.error}>{error}</Text>}
                <TouchableOpacity style={styles.btn} onPress={sendOtp} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Pošalji SMS kod</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>SMS kod poslan na {phone}</Text>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="123456" placeholderTextColor={colors.muted}
                  value={code} onChangeText={setCode}
                  keyboardType="number-pad" maxLength={6} autoFocus
                />
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
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  profileWrap: { flex: 1, alignItems: 'center', padding: 24, paddingTop: 32 },
  mascot: { width: 150, height: 150, marginBottom: 12 },
  profileCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    width: '100%', alignItems: 'center', marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  profileLabel: { fontSize: 13, color: colors.muted, marginBottom: 6 },
  profilePhone: { fontSize: 22, fontWeight: '800', color: colors.ink },
  infoCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    width: '100%', marginBottom: 28,
    borderWidth: 1, borderColor: colors.border, gap: 14,
  },
  infoRow: { fontSize: 14, color: colors.ink, fontWeight: '500' },
  logoutBtn: {
    borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 16, paddingHorizontal: 48, paddingVertical: 14,
  },
  logoutText: { color: '#94A3B8', fontWeight: '700', fontSize: 15 },
  loginWrap: { alignItems: 'center', padding: 24 },
  loginMascot: { width: 100, height: 100, marginBottom: 12 },
  loginTitle: { fontSize: 32, fontWeight: '900', color: colors.ink, marginBottom: 4 },
  loginSub: { fontSize: 14, color: colors.muted, marginBottom: 24, textAlign: 'center' },
  loginCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    width: '100%', borderWidth: 1, borderColor: colors.border,
  },
  inputLabel: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
    padding: 14, fontSize: 18, marginBottom: 16,
    color: colors.ink, backgroundColor: '#F8FAFC',
  },
  codeInput: { fontSize: 32, textAlign: 'center', letterSpacing: 10, fontWeight: '700' },
  error: { color: '#EF4444', marginBottom: 12, fontSize: 13, fontWeight: '500' },
  btn: { backgroundColor: colors.primary, padding: 16, borderRadius: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
