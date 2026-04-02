import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
        body: JSON.stringify({ phone, code })
      });
      const data = await r.json();
      if (data.ok) {
        const u = { phone, user_id: data.user_id };
        await AsyncStorage.setItem('user', JSON.stringify(u));
        setUser(u);
      } else {
        setError(data.error || 'Pogrešan kod');
      }
    } catch (e) {
      setError('Greška pri provjeri koda');
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await AsyncStorage.removeItem('user');
    setUser(null);
    setStep('phone');
    setPhone('');
    setCode('');
  }

  if (user) return (
    <View style={styles.container}>
      <View style={styles.profileCard}>
        <Text style={styles.avatar}>👤</Text>
        <Text style={styles.phoneText}>{user.phone}</Text>
        <Text style={styles.subText}>Prijavljeni ste</Text>
      </View>
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Odjava</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.loginBox}>
        <Text style={styles.title}>katalog.ai</Text>
        <Text style={styles.sub}>Prijava putem SMS-a</Text>

        {step === 'phone' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="+385 91 234 5678"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            <TouchableOpacity style={styles.btn} onPress={sendOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Pošalji SMS kod</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.sentTo}>Kod poslan na {phone}</Text>
            <TextInput
              style={styles.input}
              placeholder="123456"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            <TouchableOpacity style={styles.btn} onPress={verifyOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Potvrdi</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('phone')}>
              <Text style={styles.back}>← Promijeni broj</Text>
            </TouchableOpacity>
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', justifyContent: 'center' },
  loginBox: { margin: 24, backgroundColor: '#fff', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#eee' },
  title: { fontSize: 28, fontWeight: '800', color: '#E8572A', textAlign: 'center', marginBottom: 4 },
  sub: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 24 },
  input: { borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 18, marginBottom: 12 },
  btn: { backgroundColor: '#E8572A', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 8 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  sentTo: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 12 },
  back: { textAlign: 'center', color: '#E8572A', marginTop: 8, fontSize: 14 },
  error: { color: 'red', textAlign: 'center', marginTop: 12 },
  profileCard: { alignItems: 'center', padding: 40 },
  avatar: { fontSize: 64, marginBottom: 16 },
  phoneText: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  subText: { fontSize: 14, color: '#888', marginTop: 4 },
  logoutBtn: { margin: 24, padding: 16, borderRadius: 10, borderWidth: 1.5, borderColor: '#E8572A', alignItems: 'center' },
  logoutText: { color: '#E8572A', fontWeight: '700', fontSize: 16 },
});
