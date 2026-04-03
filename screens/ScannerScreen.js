import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Vibration, SafeAreaView, StatusBar
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, storeColors } from '../theme';
import EquivalentsScreen from './EquivalentsScreen';

const API = 'https://botapp-u7qa.onrender.com';

async function getPhone() {
  const u = await AsyncStorage.getItem('user');
  return u ? JSON.parse(u).phone : null;
}

function StoreBadge({ store, size = 44 }) {
  const bg = storeColors[store] || colors.primary;
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { fontSize: size * 0.38 }]}>
        {store ? store.charAt(0).toUpperCase() : '?'}
      </Text>
    </View>
  );
}

function PriceRow({ item, index }) {
  const isCheap = index === 0;
  return (
    <View style={[styles.priceRow, isCheap && styles.priceRowCheap]}>
      <StoreBadge store={item.store} size={40} />
      <View style={styles.priceRowMid}>
        <Text style={styles.priceStoreName}>{item.store.toUpperCase()}</Text>
        {isCheap && <Text style={styles.cheapTag}>NAJJEFTINIJE</Text>}
      </View>
      <View style={styles.priceRowRight}>
        <Text style={[styles.priceValue, isCheap && styles.priceValueCheap]}>
          {parseFloat(item.sale_price).toFixed(2)}€
        </Text>
        {item.original_price && item.original_price !== item.sale_price && (
          <Text style={styles.priceOld}>{parseFloat(item.original_price).toFixed(2)}€</Text>
        )}
      </View>
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
    Audio.Sound.createAsync({ uri: 'https://www.soundjay.com/buttons/beep-07a.mp3' })
      .then(({ sound }) => { soundRef.current = sound; }).catch(() => {});
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  async function handleScan({ data }) {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    setResult(null);
    Vibration.vibrate(80);
    try { await soundRef.current?.replayAsync(); } catch {}

    try {
      const phone = await getPhone();
      const q = phone ? `?phone=${encodeURIComponent(phone)}` : '';
      const res = await fetch(`${API}/api/barcode/${data}${q}`);
      const json = await res.json();
      setResult(json);

      const hist = JSON.parse(await AsyncStorage.getItem('scan_history') || '[]');
      await AsyncStorage.setItem('scan_history', JSON.stringify(
        [{ ...json, scanned_at: new Date().toISOString() }, ...hist.filter(h => h.barcode !== data)].slice(0, 50)
      ));

      const saved_ = JSON.parse(await AsyncStorage.getItem('saved_products') || '[]');
      setSaved(saved_.some(s => s.barcode === data));
    } catch {
      setResult({ barcode: data, name: 'Greška', prices: [] });
    } finally {
      setLoading(false);
    }
  }

  async function toggleSave() {
    if (!result) return;
    const existing = JSON.parse(await AsyncStorage.getItem('saved_products') || '[]');
    const isSaved = existing.some(e => e.barcode === result.barcode);
    const updated = isSaved
      ? existing.filter(e => e.barcode !== result.barcode)
      : [{ ...result, saved_at: new Date().toISOString() }, ...existing];
    await AsyncStorage.setItem('saved_products', JSON.stringify(updated));
    setSaved(!isSaved);
  }

  function reset() { setScanned(false); setResult(null); setSaved(false); }

  // Camera permission
  if (!permission?.granted) return (
    <SafeAreaView style={styles.permWrap}>
      <StatusBar barStyle="dark-content" />
      <Text style={styles.permIcon}>📷</Text>
      <Text style={styles.permTitle}>Pristup kameri</Text>
      <Text style={styles.permSub}>Potrebno za skeniranje barkodova</Text>
      <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
        <Text style={styles.permBtnText}>Dozvoli</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  // Scanner view
  if (!scanned) return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <CameraView style={StyleSheet.absoluteFill}
        onBarcodeScanned={handleScan}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
      />
      <View style={styles.scanOverlay}>
        <View style={styles.scanTop}>
          <Text style={styles.scanTitle}>katalog.ai</Text>
          <Text style={styles.scanSub}>Usmjeri prema barkodu</Text>
        </View>
        <View style={styles.scanFrame}>
          {['tl','tr','bl','br'].map(c => <View key={c} style={[styles.scanCorner, styles[c]]} />)}
          <View style={styles.scanLine} />
        </View>
        <View style={styles.scanBottom}>
          <Text style={styles.scanHint}>EAN-13 · EAN-8 · UPC</Text>
        </View>
      </View>
    </View>
  );

  // Results view
  return (
    <SafeAreaView style={styles.results}>
      <StatusBar barStyle="dark-content" />

      {loading ? (
        <View style={styles.loadWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadText}>Tražim cijene...</Text>
        </View>
      ) : (
        <FlatList
          data={result?.prices || []}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListHeaderComponent={() => (
            <>
              {/* Product Card */}
              <View style={styles.productCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {result?.name || 'Nepoznat proizvod'}
                  </Text>
                  {result?.brand ? <Text style={styles.productBrand}>{result.brand}</Text> : null}
                  {result?.quantity ? (
                    <Text style={styles.productQty}>{result.quantity} {result?.unit || ''}</Text>
                  ) : null}
                  <Text style={styles.productBarcode}>#{result?.barcode}</Text>
                </View>
                <TouchableOpacity onPress={toggleSave} style={styles.saveBtn}>
                  <Text style={styles.saveIcon}>{saved ? '❤️' : '🤍'}</Text>
                </TouchableOpacity>
              </View>

              {/* Summary bar */}
              {result?.prices?.length > 0 && (
                <View style={styles.summaryBar}>
                  <Text style={styles.summaryText}>
                    {result.prices.length} {result.prices.length === 1 ? 'trgovina' : 'trgovina'} · 
                    najjeftinije <Text style={styles.summaryPrice}>
                      {parseFloat(result.prices[0].sale_price).toFixed(2)}€
                    </Text>
                  </Text>
                </View>
              )}

              {result?.prices?.length === 0 && (
                <View style={styles.empty}>
                  <Text style={styles.emptyIcon}>🔍</Text>
                  <Text style={styles.emptyTitle}>Nema rezultata</Text>
                  <Text style={styles.emptySub}>Ovaj produkt nije u našoj bazi</Text>
                </View>
              )}
            </>
          )}
          renderItem={({ item, index }) => <PriceRow item={item} index={index} />}
          ListFooterComponent={() => (
            <View>
              {result?.prices?.length > 0 && <EquivalentsScreen barcode={result.barcode} />}
              <TouchableOpacity style={styles.scanAgain} onPress={reset}>
                <Text style={styles.scanAgainText}>Skeniraj drugi produkt</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Permission
  permWrap: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 32 },
  permIcon: { fontSize: 56, marginBottom: 16 },
  permTitle: { fontSize: 22, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  permSub: { fontSize: 15, color: colors.muted, textAlign: 'center', marginBottom: 32 },
  permBtn: { backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Scanner overlay
  scanOverlay: { flex: 1, justifyContent: 'space-between', alignItems: 'center', padding: 32 },
  scanTop: { alignItems: 'center', marginTop: 16 },
  scanTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  scanSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  scanFrame: { width: 240, height: 150, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  scanCorner: { position: 'absolute', width: 28, height: 28, borderColor: '#fff', borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  scanLine: { width: 200, height: 2, backgroundColor: colors.primary, opacity: 0.8, borderRadius: 1 },
  scanBottom: { alignItems: 'center', marginBottom: 16 },
  scanHint: { fontSize: 12, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 },

  // Results
  results: { flex: 1, backgroundColor: colors.bg },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadText: { fontSize: 15, color: colors.muted },

  // Product card
  productCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  productName: { fontSize: 17, fontWeight: '700', color: colors.ink, lineHeight: 22, marginBottom: 4 },
  productBrand: { fontSize: 13, color: colors.muted, marginBottom: 2 },
  productQty: { fontSize: 12, color: colors.muted, marginBottom: 6 },
  productBarcode: { fontSize: 11, color: '#CBD5E1', fontVariant: ['tabular-nums'] },
  saveBtn: { padding: 4, marginLeft: 8 },
  saveIcon: { fontSize: 26 },

  // Summary
  summaryBar: {
    backgroundColor: colors.primaryLight, borderRadius: 10,
    padding: 10, marginBottom: 12,
  },
  summaryText: { fontSize: 13, color: colors.primary, fontWeight: '500' },
  summaryPrice: { fontWeight: '800' },

  // Price rows
  priceRow: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  priceRowCheap: {
    borderColor: '#10B981', borderWidth: 1.5,
    backgroundColor: '#F0FDF4',
  },
  badge: { justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  badgeText: { color: '#fff', fontWeight: '800' },
  priceRowMid: { flex: 1 },
  priceStoreName: { fontSize: 14, fontWeight: '700', color: colors.ink },
  cheapTag: { fontSize: 10, color: '#10B981', fontWeight: '700', marginTop: 2, letterSpacing: 0.5 },
  priceRowRight: { alignItems: 'flex-end' },
  priceValue: { fontSize: 19, fontWeight: '800', color: colors.ink },
  priceValueCheap: { color: '#10B981' },
  priceOld: { fontSize: 12, color: colors.muted, textDecorationLine: 'line-through' },

  // Empty
  empty: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  emptySub: { fontSize: 14, color: colors.muted },

  // Scan again
  scanAgain: {
    marginTop: 16, backgroundColor: colors.primary,
    borderRadius: 12, padding: 16, alignItems: 'center',
  },
  scanAgainText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
