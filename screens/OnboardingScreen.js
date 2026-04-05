import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';

const API = 'https://botapp-u7qa.onrender.com';

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
      const r = await fetch(`${API}/api/auth/send-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) });
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
      const r = await fetch(`${API}/api/auth/verify-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, code: code.trim() }) });
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

  if (step === 'welcome') return (
    <View style={styles.container}>
      <Image source={require('../assets/stedko-happy.png')} style={styles.mascot} />
      <Text style={styles.title}>Štedko</Text>
      <Text style={styles.sub}>Usporedi cijene u svim hrvatskim trgovinama</Text>
      <View style={styles.features}>
        <Text style={styles.feature}>📷  Skeniraj barkod u trgovini</Text>
        <Text style={styles.feature}>💰  Vidi cijene u 21 lancu</Text>
        <Text style={styles.feature}>❤️  Spremi proizvode i prati cijene</Text>
      </View>
      <TouchableOpacity style={styles.btn} onPress={() => setStep('phone')}>
        <Text style={styles.btnText}>Započni →</Text>
      </TouchableOpacity>
      <Text style={styles.terms}>Nastavkom prihvaćate naše <Text style={styles.link}>Uvjete korištenja</Text>. Podaci o cijenama su informativni.</Text>
    </View>
  );

  if (step === 'phone') return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Image source={require('../assets/stedko-scan.png')} style={[styles.mascot, { width: 120, height: 120 }]} />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Unesite broj telefona</Text>
        <Text style={styles.cardSub}>Poslat ćemo vam SMS kod za potvrdu</Text>
        <TextInput style={styles.input} placeholder="+385 91 234 5678" placeholderTextColor="#aaa" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoFocus />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity style={styles.btn} onPress={sendOtp} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Pošalji kod</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  if (step === 'code') return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Unesite SMS kod</Text>
        <Text style={styles.cardSub}>Poslali smo kod na {phone}</Text>
        <TextInput style={[styles.input, styles.codeInput]} placeholder="123456" placeholderTextColor="#aaa" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} autoFocus />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity style={styles.btn} onPress={verifyOtp} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Potvrdi →</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setStep('phone')}>
          <Text style={styles.back}>← Promijeni broj</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  if (step === 'camera') return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={{ fontSize: 56, textAlign: 'center', marginBottom: 16 }}>📷</Text>
        <Text style={styles.cardTitle}>Dozvoli pristup kameri</Text>
        <Text style={styles.cardSub}>Potrebno za skeniranje barkodova u trgovini</Text>
        <TouchableOpacity style={styles.btn} onPress={requestCamera}>
          <Text style={styles.btnText}>Dozvoli kameru →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9', justifyContent: 'center', alignItems: 'center', padding: 24 },
  mascot: { width: 180, height: 180, marginBottom: 8 },
  title: { fontSize: 40, fontWeight: '900', color: '#1E293B', marginBottom: 8, letterSpacing: -1 },
  sub: { fontSize: 16, color: '#64748B', textAlign: 'center', marginBottom: 28, lineHeight: 22 },
  features: { gap: 14, marginBottom: 32, alignSelf: 'stretch' },
  feature: { fontSize: 16, color: '#334155', fontWeight: '500' },
  btn: { backgroundColor: '#00C853', padding: 18, borderRadius: 16, alignItems: 'center', marginBottom: 16, alignSelf: 'stretch' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  terms: { fontSize: 11, color: '#94A3B8', textAlign: 'center', lineHeight: 16, paddingHorizontal: 8 },
  link: { color: '#00C853' },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 28, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
  cardTitle: { fontSize: 24, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  cardSub: { fontSize: 14, color: '#64748B', marginBottom: 24, lineHeight: 20 },
  input: { borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, fontSize: 18, marginBottom: 14, color: '#1E293B', backgroundColor: '#F8FAFC' },
  codeInput: { fontSize: 32, textAlign: 'center', letterSpacing: 10, fontWeight: '700' },
  error: { color: '#EF4444', marginBottom: 10, fontSize: 13, fontWeight: '500' },
  back: { textAlign: 'center', color: '#64748B', fontSize: 14, marginTop: 4 },
});
