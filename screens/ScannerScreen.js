import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Vibration } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, storeColors } from '../theme';

const API = 'https://botapp-u7qa.onrender.com';

async function getPhone() {
  const u = await AsyncStorage.getItem('user');
  return u ? JSON.parse(u).phone : null;
}

function StoreLogo({ store }) {
  const bg = storeColors[store] || colors.primary;
  const initial = store ? store.charAt(0).toUpperCase() : '?';
  return (
    <View style={[styles.storeLogo, { backgroundColor: bg }]}>
      <Text style={styles.storeLogoText}>{initial}</Text>
    </View>
  );
}

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState(false);
  const soundRef = useRef(null);

  useEffect(() => {
    loadSound();
    return () => { if (soundRef.current) soundRef.current.unloadAsync(); };
  }, []);

  async function loadSound() {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: 'https://www.soundjay.com/buttons/beep-07a.mp3' });
      soundRef.current = sound;
    } catch (e) {}
  }

  async function playBeep() {
    try { if (soundRef.current) await soundRef.current.replayAsync(); } catch (e) {}
    Vibration.vibrate(100);
  }

  async function saveToHistory(barcode, name, brand, prices) {
    try {
      const existing = JSON.parse(await AsyncStorage.getItem('scan_history') || '[]');
      const entry = { barcode, name, brand, prices, scanned_at: new Date().toISOString() };
      const updated = [entry, ...existing.filter(e => e.barcode !== barcode)].slice(0, 50);
      await AsyncStorage.setItem('scan_history', JSON.stringify(updated));
    } catch (e) {}
  }

  async function toggleSave() {
    if (!result) return;
    try {
      const existing = JSON.parse(await AsyncStorage.getItem('saved_products') || '[]');
      const isSaved = existing.some(e => e.barcode === result.barcode);
      let updated;
      if (isSaved) {
        updated = existing.filter(e => e.barcode !== result.barcode);
        setSaved(false);
      } else {
        updated = [{ barcode: result.barcode, name: result.name, brand: result.brand, prices: result.prices, saved_at: new Date().toISOString() }, ...existing];
        setSaved(true);
      }
      await AsyncStorage.setItem('saved_products', JSON.stringify(updated));
    } catch (e) {}
  }

  async function handleScan({ data }) {
    if (scanned) return;
    setScanned(true);
    setLoading(true);
    setResult(null);
    setSaved(false);
    await playBeep();

    try {
      const phone = await getPhone();
      const phoneParam = phone ? `?phone=${encodeURIComponent(phone)}` : '';
      const r = await fetch(`${API}/api/barcode/${data}${phoneParam}`);
      const json = await r.json();
      setResult(json);
      await saveToHistory(json.barcode, json.name, json.brand, json.prices);
      const existing = JSON.parse(await AsyncStorage.getItem('saved_products') || '[]');
      setSaved(existing.some(e => e.barcode === json.barcode));
    } catch (e) {
      setResult({ barcode: data, name: 'Greška pri dohvaćanju', prices: [] });
    } finally {
      setLoading(false);
    }
  }

  if (!permission) return <View />;
  if (!permission.granted) return (
    <View style={styles.center}>
      <Text style={styles.permText}>Potreban pristup kameri</Text>
      <TouchableOpacity style={styles.btn} onPress={requestPermission}>
        <Text style={styles.btnText}>Dozvoli kameru</Text>
      </TouchableOpacity>
    </View>
  );

  if (!scanned) return (
    <CameraView style={styles.camera} onBarcodeScanned={handleScan}
      barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}>
      <View style={styles.overlay}>
        <View style={styles.scanArea}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
        </View>
        <Text style={styles.hint}>Usmjeri kameru prema barkodu</Text>
      </View>
    </CameraView>
  );

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Tražim cijene...</Text>
        </View>
      )}

      {result && !loading && (
        <FlatList
          data={result.prices}
          keyExtractor={(_, i) => i.toString()}
          ListHeaderComponent={() => (
            <View>
              <View style={styles.productCard}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{result.name || 'Nepoznat proizvod'}</Text>
                  {result.brand ? <Text style={styles.brand}>{result.brand}</Text> : null}
                  {result.quantity ? <Text style={styles.quantity}>{result.quantity} {result.unit}</Text> : null}
                  <Text style={styles.barcode}>#{result.barcode}</Text>
                </View>
                <TouchableOpacity onPress={toggleSave} style={styles.saveBtn}>
                  <Text style={{ fontSize: 28 }}>{saved ? '❤️' : '🤍'}</Text>
                </TouchableOpacity>
              </View>

              {result.prices.length === 0 && (
                <View style={styles.noResultsBox}>
                  <Text style={styles.noResultsIcon}>🔍</Text>
                  <Text style={styles.noResults}>Nema cijena u bazi</Text>
                  <Text style={styles.noResultsSub}>Pokušaj skenirat drugi produkt</Text>
                </View>
              )}

              {result.prices.length > 0 && (
                <Text style={styles.sectionTitle}>Cijene u trgovinama</Text>
              )}
            </View>
          )}
          renderItem={({ item, index }) => (
            <View style={[styles.priceCard, index === 0 && styles.cheapestCard]}>
              <StoreLogo store={item.store} />
              <View style={styles.priceInfo}>
                <Text style={styles.storeName}>{item.store.toUpperCase()}</Text>
                {index === 0 && <Text style={styles.cheapestBadge}>NAJJEFTINIJE</Text>}
              </View>
              <View style={styles.priceRight}>
                <Text style={[styles.price, index === 0 && styles.cheapestPrice]}>
                  {parseFloat(item.sale_price).toFixed(2)}€
                </Text>
                {item.original_price && item.original_price !== item.sale_price && (
                  <Text style={styles.originalPrice}>{parseFloat(item.original_price).toFixed(2)}€</Text>
                )}
              </View>
            </View>
          )}
          ListFooterComponent={() => (
            <TouchableOpacity style={styles.scanAgainBtn} onPress={() => { setScanned(false); setResult(null); }}>
              <Text style={styles.scanAgainText}>📷  Skeniraj drugi produkt</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  scanArea: { width: 260, height: 160, position: 'relative' },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: '#fff', borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  hint: { color: '#fff', marginTop: 24, fontSize: 14, opacity: 0.9 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: colors.muted, fontSize: 15 },
  productCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: colors.border },
  productInfo: { flex: 1 },
  productName: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  brand: { fontSize: 13, color: colors.muted, marginBottom: 2 },
  quantity: { fontSize: 13, color: colors.muted, marginBottom: 4 },
  barcode: { fontSize: 11, color: colors.muted },
  saveBtn: { padding: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  priceCard: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  cheapestCard: { borderColor: colors.success, borderWidth: 2, backgroundColor: '#F0FDF4' },
  storeLogo: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  storeLogoText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  priceInfo: { flex: 1 },
  storeName: { fontSize: 15, fontWeight: '700', color: colors.ink },
  cheapestBadge: { fontSize: 10, color: colors.success, fontWeight: '700', marginTop: 2 },
  priceRight: { alignItems: 'flex-end' },
  price: { fontSize: 20, fontWeight: '800', color: colors.ink },
  cheapestPrice: { color: colors.success },
  originalPrice: { fontSize: 12, color: colors.muted, textDecorationLine: 'line-through' },
  noResultsBox: { alignItems: 'center', padding: 40 },
  noResultsIcon: { fontSize: 48, marginBottom: 12 },
  noResults: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  noResultsSub: { fontSize: 14, color: colors.muted },
  scanAgainBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  scanAgainText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  permText: { fontSize: 16, marginBottom: 20, color: colors.ink },
  btn: { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
