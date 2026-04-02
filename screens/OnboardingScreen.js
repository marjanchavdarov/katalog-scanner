import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Camera } from 'expo-camera';

const API = 'https://botapp-u7qa.onrender.com';

export default function OnboardingScreen({ onVerified }) {
  const [step, setStep] = useState('welcome');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function sendOtp() {
    if (!phone) return;
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`${API}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await r.json();
      if (data.ok) setStep('code');
      else setError(data.error || 'Greška');
    } catch (e) {
      setError('Greška pri slanju SMS-a');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (!code) return;
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: code.trim() })
      });
      const data = await r.json();
      if (data.ok) {
        const u = { phone, user_id: data.user_id };
        await AsyncStorage.setItem('user', JSON.stringify(u));
        setStep('camera');
      } else {
        setError(data.error || 'Pogrešan kod');
      }
    } catch (e) {
      setError('Greška pri provjeri');
    } finally {
      setLoading(false);
    }
  }

  async function requestCamera() {
    await Camera.requestCameraPermissionsAsync();
    const u = JSON.parse(await AsyncStorage.getItem('user'));
    onVerified(u);
  }

  if (step === 'welcome') return (
    <View style={styles.container}>
      <View style={styles.box}>
        <Text style={styles.logo}>%</Text>
        <Text style={styles.title}>katalog.ai</Text>
        <Text style={styles.sub}>Usporedi cijene u svim hrvatskim trgovinama</Text>
        <View style={styles.features}>
          <Text style={styles.feature}>📷 Skeniraj barkod u trgovini</Text>
          <Text style={styles.feature}>💰 Vidi cijene u 21 lancu</Text>
          <Text style={styles.feature}>❤️ Spremi proizvode i prati cijene</Text>
        </View>
        <TouchableOpacity style={styles.btn} onPress={() => setStep('phone')}>
          <Text style={styles.btnText}>Počni →</Text>
        </TouchableOpacity>
        <Text style={styles.terms}>Nastavkom prihvaćate naše{' '}
          <Text style={styles.link}>Uvjete korištenja</Text>. Podaci o cijenama su informativni i mogu sadržavati greške. Vaši podaci (broj telefona) se koriste isključivo za identifikaciju.
        </Text>
      </View>
    </View>
  );

  if (step === 'phone') return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.box}>
        <Text style={styles.stepTitle}>Unesite broj telefona</Text>
        <Text style={styles.stepSub}>Poslat ćemo vam SMS kod za potvrdu</Text>
        <TextInput
          style={styles.input}
          placeholder="+385 91 234 5678"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoFocus
        />
        {error && typeof error === 'string' && error.length > 0 ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.btn} onPress={sendOtp} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Pošalji kod</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  if (step === 'code') return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.box}>
        <Text style={styles.stepTitle}>Unesite SMS kod</Text>
        <Text style={styles.stepSub}>Poslali smo kod na {phone}</Text>
        <TextInput
          style={[styles.input, styles.codeInput]}
          placeholder="123456"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
        />
        {error && typeof error === 'string' && error.length > 0 ? <Text style={styles.error}>{error}</Text> : null}
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
      <View style={styles.box}>
        <Text style={styles.cameraIcon}>📷</Text>
        <Text style={styles.stepTitle}>Dozvoli pristup kameri</Text>
        <Text style={styles.stepSub}>Potrebno za skeniranje barkodova u trgovini</Text>
        <TouchableOpacity style={styles.btn} onPress={requestCamera}>
          <Text style={styles.btnText}>Dozvoli kameru →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A', justifyContent: 'center', padding: 24 },
  box: { backgroundColor: '#fff', borderRadius: 20, padding: 28 },
  logo: { fontSize: 48, color: '#E8572A', fontWeight: '800', textAlign: 'center' },
  title: { fontSize: 32, fontWeight: '800', color: '#1A1A1A', textAlign: 'center', marginBottom: 8 },
  sub: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 24 },
  features: { gap: 12, marginBottom: 24 },
  feature: { fontSize: 15, color: '#444' },
  btn: { backgroundColor: '#E8572A', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  terms: { fontSize: 11, color: '#aaa', textAlign: 'center', lineHeight: 16 },
  link: { color: '#E8572A' },
  stepTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginBottom: 8 },
  stepSub: { fontSize: 14, color: '#888', marginBottom: 20 },
  input: { borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 18, marginBottom: 12 },
  codeInput: { fontSize: 28, textAlign: 'center', letterSpacing: 8 },
  error: { color: 'red', marginBottom: 8, fontSize: 13 },
  back: { textAlign: 'center', color: '#E8572A', fontSize: 14 },
  cameraIcon: { fontSize: 56, textAlign: 'center', marginBottom: 16 },
});
