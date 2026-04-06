import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Image,
  SafeAreaView, StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCameraPermissions } from 'expo-camera';

const API = 'https://botapp-u7qa.onrender.com';

// Exact colors from v0 design
const PRIMARY = '#1A3C2E';   // dark green
const PRIMARY_FG = '#FFFFFF';
const BG = '#FFFFFF';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';

export default function OnboardingScreen({ onVerified }) {
  const [step, setStep] = useState('welcome');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [, requestPermission] = useCameraPermissions();

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
        body: JSON.stringify({ phone, code: code.trim() })
      });
      const data = await r.json();
      if (data.ok) {
        await AsyncStorage.setItem('user', JSON.stringify({ phone, user_id: data.user_id }));
        setStep('camera');
      } else setError(data.error || 'Pogrešan kod');
    } catch { setError('Greška pri provjeri'); }
    finally { setLoading(false); }
  }

  async function requestCamera() {
    await requestPermission();
    const u = JSON.parse(await AsyncStorage.getItem('user'));
    onVerified(u);
  }

  // Welcome screen — matches v0 exactly
  if (step === 'welcome') return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <View style={s.welcomeWrap}>
        {/* Mascot floats freely */}
        <Image
          source={require('../assets/stedko-happy.png')}
          style={s.mascot}
          resizeMode="contain"
        />
        {/* Text */}
        <Text style={s.welcomeTitle}>Dobrodošli u Štedko!</Text>
        <Text style={s.welcomeSub}>Uštedi na svojoj kupovini!</Text>
        {/* CTA */}
        <TouchableOpacity style={s.btnPrimary} onPress={() => setStep('phone')}>
          <Text style={s.btnPrimaryText}>Započni</Text>
        </TouchableOpacity>
        {/* Already have account */}
        <View style={s.row}>
          <Text style={s.mutedText}>Već imaš račun? </Text>
          <TouchableOpacity onPress={() => setStep('phone')}>
            <Text style={s.linkText}>Prijavi se</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  if (step === 'phone') return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <KeyboardAvoidingView style={s.authWrap} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Text style={s.authTitle}>Unesite broj telefona</Text>
        <Text style={s.authSub}>Poslat ćemo vam SMS kod za potvrdu</Text>
        <TextInput
          style={s.input}
          placeholder="+385 91 234 5678"
          placeholderTextColor={MUTED}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoFocus
        />
        {!!error && <Text style={s.error}>{error}</Text>}
        <TouchableOpacity style={s.btnPrimary} onPress={sendOtp} disabled={loading}>
          {loading ? <ActivityIndicator color={PRIMARY_FG} /> : <Text style={s.btnPrimaryText}>Pošalji kod</Text>}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  if (step === 'code') return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <KeyboardAvoidingView style={s.authWrap} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Text style={s.authTitle}>Unesite SMS kod</Text>
        <Text style={s.authSub}>Poslali smo kod na {phone}</Text>
        <TextInput
          style={[s.input, s.codeInput]}
          placeholder="123456"
          placeholderTextColor={MUTED}
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
        />
        {!!error && <Text style={s.error}>{error}</Text>}
        <TouchableOpacity style={s.btnPrimary} onPress={verifyOtp} disabled={loading}>
          {loading ? <ActivityIndicator color={PRIMARY_FG} /> : <Text style={s.btnPrimaryText}>Potvrdi →</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setStep('phone')} style={{ marginTop: 12 }}>
          <Text style={[s.mutedText, { textAlign: 'center' }]}>← Promijeni broj</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  if (step === 'camera') return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <View style={s.authWrap}>
        <Text style={{ fontSize: 56, textAlign: 'center', marginBottom: 20 }}>📷</Text>
        <Text style={s.authTitle}>Dozvoli pristup kameri</Text>
        <Text style={s.authSub}>Potrebno za skeniranje barkodova u trgovini</Text>
        <TouchableOpacity style={s.btnPrimary} onPress={requestCamera}>
          <Text style={s.btnPrimaryText}>Dozvoli kameru →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  welcomeWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 80 },
  mascot: { width: 260, height: 260, marginBottom: 24 },
  welcomeTitle: { fontSize: 28, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 10 },
  welcomeSub: { fontSize: 16, color: MUTED, textAlign: 'center', marginBottom: 40 },
  btnPrimary: { backgroundColor: PRIMARY, paddingVertical: 18, paddingHorizontal: 32, borderRadius: 999, alignItems: 'center', width: '100%', marginBottom: 16 },
  btnPrimaryText: { color: PRIMARY_FG, fontWeight: '700', fontSize: 17 },
  row: { flexDirection: 'row', alignItems: 'center' },
  mutedText: { fontSize: 14, color: MUTED },
  linkText: { fontSize: 14, color: PRIMARY, fontWeight: '600' },
  authWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  authTitle: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 8 },
  authSub: { fontSize: 15, color: MUTED, marginBottom: 28 },
  input: { borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, padding: 16, fontSize: 18, marginBottom: 14, color: '#111827', backgroundColor: '#F9FAFB' },
  codeInput: { fontSize: 32, textAlign: 'center', letterSpacing: 10, fontWeight: '700' },
  error: { color: '#EF4444', marginBottom: 12, fontSize: 13 },
});
