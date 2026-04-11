import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Image,
  SafeAreaView, StatusBar, Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '../theme';

const API = 'https://botapp-u7qa.onrender.com';

export default function OnboardingScreen({ onVerified }) {
  const [step, setStep] = useState('welcome');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [, requestPermission] = useCameraPermissions();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  function transition(nextStep) {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setStep(nextStep);
      setError('');
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
  }

  async function sendOtp() {
    if (!phone.trim()) return;
    setLoading(true); setError('');
    try {
      const r = await fetch(`${API}/api/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await r.json();
      if (data.ok) transition('code');
      else setError(data.error || 'Greška pri slanju');
    } catch { setError('Nema veze s internetom'); }
    finally { setLoading(false); }
  }

  async function verifyOtp() {
    if (!code.trim()) return;
    setLoading(true); setError('');
    try {
      const r = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: code.trim() })
      });
      const data = await r.json();
      if (data.ok) {
        await AsyncStorage.setItem('user', JSON.stringify({ phone, user_id: data.user_id }));
        transition('camera');
      } else setError(data.error || 'Pogrešan kod');
    } catch { setError('Greška pri provjeri'); }
    finally { setLoading(false); }
  }

  async function requestCamera() {
    await requestPermission();
    const u = JSON.parse(await AsyncStorage.getItem('user'));
    onVerified(u);
  }

  // WELCOME
  if (step === 'welcome') return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Animated.View style={[styles.welcomeWrap, { opacity: fadeAnim }]}>
        <View style={styles.mascotWrap}>
          <Image source={require('../assets/stedko-wave.png')} style={styles.mascotLarge} />
        </View>
        <View style={styles.welcomeBottom}>
          <Text style={styles.appName}>Štedko</Text>
          <Text style={styles.tagline}>Usporedi cijene u svim{'\n'}hrvatskim trgovinama</Text>
          <View style={styles.featuresList}>
            {[
              { icon: '📷', text: 'Skeniraj barkod u sekundi' },
              { icon: '💰', text: 'Cijene u svim lancima odjednom' },
              { icon: '🛒', text: 'Pametna košarica s uštedom' },
            ].map((f, i) => (
              <View key={i} style={styles.featureItem}>
                <Text style={styles.featureItemIcon}>{f.icon}</Text>
                <Text style={styles.featureItemText}>{f.text}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => transition('phone')}>
            <Text style={styles.primaryBtnText}>Započni besplatno →</Text>
          </TouchableOpacity>
          <Text style={styles.terms}>Podaci o cijenama su informativni.</Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );

  // PHONE
  if (step === 'phone') return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View style={[styles.stepWrap, { opacity: fadeAnim }]}>
          <Image source={require('../assets/stedko-scan.png')} style={styles.mascotMed} />
          <Text style={styles.stepTitle}>Unesi broj telefona</Text>
          <Text style={styles.stepSub}>Poslat ćemo ti SMS kod za potvrdu</Text>
          <TextInput
            style={styles.input}
            placeholder="+385 91 234 5678"
            placeholderTextColor={colors.muted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoFocus
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity style={styles.primaryBtn} onPress={sendOtp} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Pošalji kod →</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => transition('welcome')}>
            <Text style={styles.backLink}>← Nazad</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // CODE
  if (step === 'code') return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View style={[styles.stepWrap, { opacity: fadeAnim }]}>
          <View style={styles.otpIconWrap}>
            <Text style={{ fontSize: 56 }}>💬</Text>
          </View>
          <Text style={styles.stepTitle}>Upiši SMS kod</Text>
          <Text style={styles.stepSub}>Poslali smo ga na{'\n'}<Text style={{ fontWeight: '700', color: colors.ink }}>{phone}</Text></Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="• • • • • •"
            placeholderTextColor={colors.border}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity style={styles.primaryBtn} onPress={verifyOtp} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Potvrdi →</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => transition('phone')}>
            <Text style={styles.backLink}>← Promijeni broj</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // CAMERA
  if (step === 'camera') return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Animated.View style={[styles.stepWrap, { opacity: fadeAnim }]}>
        <Image source={require('../assets/stedko-scan.png')} style={styles.mascotMed} />
        <Text style={styles.stepTitle}>Dozvoli kameru</Text>
        <Text style={styles.stepSub}>Potrebno za skeniranje barkodova{'\n'}u trgovini</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={requestCamera}>
          <Text style={styles.primaryBtnText}>Dozvoli kameru →</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  welcomeWrap: { flex: 1 },
  mascotWrap: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
    minHeight: 320,
  },
  mascotLarge: { width: 220, height: 220 },
  welcomeBottom: { padding: 28, paddingTop: 24 },
  appName: { fontSize: 38, fontWeight: '900', color: colors.ink, marginBottom: 6, letterSpacing: -1 },
  tagline: { fontSize: 16, color: colors.muted, lineHeight: 24, marginBottom: 24 },
  featuresList: { gap: 12, marginBottom: 28 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureItemIcon: { fontSize: 22, width: 32, textAlign: 'center' },
  featureItemText: { fontSize: 15, color: colors.ink, fontWeight: '500' },
  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: 18,
    padding: 18, alignItems: 'center', marginBottom: 12,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  terms: { fontSize: 11, color: colors.muted, textAlign: 'center' },
  stepWrap: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 28,
  },
  mascotMed: { width: 160, height: 160, marginBottom: 16 },
  otpIconWrap: { marginBottom: 16 },
  stepTitle: { fontSize: 28, fontWeight: '900', color: colors.ink, marginBottom: 8, textAlign: 'center' },
  stepSub: { fontSize: 15, color: colors.muted, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  input: {
    width: '100%', borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 16, padding: 18, fontSize: 18,
    color: colors.ink, backgroundColor: colors.bg, marginBottom: 12,
  },
  codeInput: { fontSize: 32, textAlign: 'center', letterSpacing: 12, fontWeight: '800' },
  error: { color: colors.danger, fontSize: 13, fontWeight: '600', marginBottom: 10, textAlign: 'center' },
  backLink: { color: colors.muted, fontSize: 14, marginTop: 8, fontWeight: '600' },
});
