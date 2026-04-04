import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Vibration, SafeAreaView, StatusBar,
  Animated, Easing
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

// Animated corner brackets for scanner
function ScanFrame() {
  const pulse = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.scanFrame, { transform: [{ scale: pulse }] }]}>
      {['tl','tr','bl','br'].map(c => <View key={c} style={[styles.scanCorner, styles[c]]} />)}
      <View style={styles.scanLine} />
    </Animated.View>
  );
}

// Animated price row
function PriceRow({ item, index, maxPrice }) {
  const slideAnim = useRef(new Animated.Value(60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const isCheap = index === 0;
  const barWidth = maxPrice > 0 ? (parseFloat(item.sale_price) / maxPrice) * 100 : 100;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0, duration: 350,
        delay: index * 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(opacityAnim, {
        toValue: 1, duration: 300,
        delay: index * 80,
        useNativeDriver: true
      }),
    ]).start();
  }, []);

  const bg = storeColors[item.store] || colors.primary;

  return (
    <Animated.View style={[
      styles.priceRow,
      isCheap && styles.priceRowCheap,
      { transform: [{ translateY: slideAnim }], opacity: opacityAnim }
    ]}>
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={styles.badgeText}>{item.store?.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.priceRowMid}>
        <View style={styles.storeNameRow}>
          <Text style={styles.priceStoreName}>{item.store?.toUpperCase()}</Text>
          {isCheap && <Text style={styles.trophy}>🏆</Text>}
        </View>
        {/* Price bar visualization */}
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${barWidth}%`, backgroundColor: isCheap ? '#10B981' : colors.primary + '40' }]} />
        </View>
      </View>
      <View style={styles.priceRowRight}>
        <Text style={[styles.priceValue, isCheap && styles.priceValueCheap]}>
          {parseFloat(item.sale_price).toFixed(2)}€
        </Text>
        {item.original_price && item.original_price !== item.sale_price && (
          <Text style={styles.priceOld}>{parseFloat(item.original_price).toFixed(2)}€</Text>
        )}
      </View>
    </Animated.View>
  );
}

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState(false);
  const soundRef = useRef(null);
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Audio.Sound.createAsync({ uri: 'https://www.soundjay.com/buttons/beep-08b.mp3' })
      .then(({ sound }) => { soundRef.current = sound; }).catch(() => {});
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  async function handleScan({ data }) {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    setResult(null);
    setSaved(false);
    Vibration.vibrate([0, 80, 50, 80]);
    try { await soundRef.current?.replayAsync(); } catch {}

    try {
      const phone = await getPhone();
      const q = phone ? `?phone=${encodeURIComponent(phone)}` : '';
      const res = await fetch(`${API}/api/barcode/${data}${q}`);
      const json = await res.json();
      setResult(json);

      // Animate header in
      Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();

      const hist = JSON.parse(await AsyncStorage.getItem('scan_history') || '[]');
      await AsyncStorage.setItem('scan_history', JSON.stringify(
        [{ ...json, scanned_at: new Date().toISOString() }, ...hist.filter(h => h.barcode !== data)].slice(0, 50)
      ));
      const saved_ = JSON.parse(await AsyncStorage.getItem('saved_products') || '[]');
      setSaved(saved_.some(s => s.barcode === data));
    } catch {
      setResult({ barcode: data, name: 'Ups, nešto nije štimalo', prices: [] });
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
    if (!isSaved) Vibration.vibrate(50);
  }

  async function addToList() {
    if (!result) return;
    const lists = JSON.parse(await AsyncStorage.getItem('shopping_lists') || '[]');
    if (!lists.length) {
      alert('Najprije kreiraj popis u Popis tabu!');
      return;
    }
    const activeList = lists[0];
    const item = {
      ean: result.barcode,
      name: result.name,
      brand: result.brand,
      quantity: 1,
      size: `${result.quantity || ''} ${result.unit || ''}`.trim(),
      added: new Date().toISOString()
    };
    const updatedItems = [...(activeList.items || []).filter(i => i.ean !== result.barcode), item];
    lists[0] = { ...activeList, items: updatedItems };
    await AsyncStorage.setItem('shopping_lists', JSON.stringify(lists));
    Vibration.vibrate(50);
    alert(`Dodano u "${activeList.name}"!`);
  }

  function reset() {
    setScanned(false);
    setResult(null);
    setSaved(false);
    headerAnim.setValue(0);
  }

  // Camera permission
  if (!permission?.granted) return (
    <SafeAreaView style={styles.permWrap}>
      <Text style={styles.permIcon}>📷</Text>
      <Text style={styles.permTitle}>Treba nam kamera</Text>
      <Text style={styles.permSub}>Bez nje ne možemo skenirati barkodove</Text>
      <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
        <Text style={styles.permBtnText}>Dozvoli pristup</Text>
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
          <Text style={styles.scanSub}>Usmjeri na barkod</Text>
        </View>
        <ScanFrame />
        <View style={styles.scanBottom}>
          <Text style={styles.scanHint}>EAN-13 · EAN-8 · UPC</Text>
        </View>
      </View>
    </View>
  );

  // Results
  const prices = result?.prices || [];
  const maxPrice = prices.length ? Math.max(...prices.map(p => parseFloat(p.sale_price || 0))) : 0;
  const savings = prices.length > 1
    ? (parseFloat(prices[prices.length-1].sale_price) - parseFloat(prices[0].sale_price)).toFixed(2)
    : null;

  return (
    <SafeAreaView style={styles.results}>
      <StatusBar barStyle="dark-content" />

      {loading ? (
        <View style={styles.loadWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadText}>Tražim cijene po svim trgovinama...</Text>
        </View>
      ) : (
        <FlatList
          data={prices}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListHeaderComponent={() => (
            <>
              {/* Product card */}
              <Animated.View style={[styles.productCard, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0,1], outputRange: [-20, 0] }) }] }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {result?.name || 'Nepoznat proizvod'}
                  </Text>
                  {result?.brand ? <Text style={styles.productBrand}>{result.brand}</Text> : null}
                  {result?.quantity ? <Text style={styles.productQty}>{result.quantity} {result?.unit || ''}</Text> : null}
                  <Text style={styles.productBarcode}>#{result?.barcode}</Text>
                </View>
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity onPress={toggleSave} style={styles.saveBtn}>
                    <Text style={styles.saveIcon}>{saved ? '❤️' : '🤍'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={addToList} style={styles.addListBtn}>
                    <Text style={styles.addListBtnText}>+ Popis</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>

              {/* Savings banner */}
              {savings && parseFloat(savings) > 0 && (
                <View style={styles.savingsBanner}>
                  <Text style={styles.savingsText}>
                    💰 Uštedi <Text style={styles.savingsAmount}>{savings}€</Text> ako kupiš u najjeftinijoj trgovini
                  </Text>
                </View>
              )}

              {prices.length === 0 && (
                <View style={styles.empty}>
                  <Text style={styles.emptyIcon}>🤷</Text>
                  <Text style={styles.emptyTitle}>Nije u bazi još</Text>
                  <Text style={styles.emptySub}>Pokušaj skenirati drugi proizvod ili pretraži po imenu</Text>
                </View>
              )}

              {prices.length > 0 && (
                <Text style={styles.sectionTitle}>
                  {prices.length} {prices.length === 1 ? 'trgovina' : prices.length < 5 ? 'trgovine' : 'trgovina'} ima ovaj proizvod
                </Text>
              )}
            </>
          )}
          renderItem={({ item, index }) => (
            <PriceRow item={item} index={index} maxPrice={maxPrice} />
          )}
          ListFooterComponent={() => (
            <View>
              {prices.length > 0 && <EquivalentsScreen barcode={result?.barcode} />}
              <TouchableOpacity style={styles.scanAgain} onPress={reset}>
                <Text style={styles.scanAgainText}>📷  Skeniraj drugi proizvod</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  permWrap: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 32 },
  permIcon: { fontSize: 56, marginBottom: 16 },
  permTitle: { fontSize: 22, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  permSub: { fontSize: 15, color: colors.muted, textAlign: 'center', marginBottom: 32 },
  permBtn: { backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  permBtnText: { color: '#1A1A1A', fontWeight: '700', fontSize: 16 },
  scanOverlay: { flex: 1, justifyContent: 'space-between', alignItems: 'center', padding: 32, backgroundColor: 'rgba(0,0,0,0.55)' },
  scanTop: { alignItems: 'center', marginTop: 16 },
  scanTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  scanSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  scanFrame: { width: 250, height: 160, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  scanCorner: { position: 'absolute', width: 30, height: 30, borderColor: '#fff', borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  scanLine: { width: 210, height: 2, backgroundColor: colors.primary, borderRadius: 1, opacity: 0.9 },
  scanBottom: { alignItems: 'center', marginBottom: 16 },
  scanHint: { fontSize: 12, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 },
  results: { flex: 1, backgroundColor: colors.bg },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadText: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  productCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  productName: { fontSize: 17, fontWeight: '700', color: colors.ink, lineHeight: 22, marginBottom: 4 },
  productBrand: { fontSize: 13, color: colors.muted, marginBottom: 2 },
  productQty: { fontSize: 12, color: colors.muted, marginBottom: 6 },
  productBarcode: { fontSize: 11, color: '#CBD5E1' },
  saveBtn: { padding: 4, marginLeft: 8 },
  saveIcon: { fontSize: 26 },
  savingsBanner: {
    backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#10B981' + '40',
  },
  savingsText: { fontSize: 13, color: '#065F46', fontWeight: '500' },
  savingsAmount: { fontWeight: '800', color: '#10B981' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  priceRow: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    flexDirection: 'row', alignItems: 'center', marginBottom: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  priceRowCheap: { borderColor: '#10B981', borderWidth: 2, backgroundColor: '#F0FDF4' },
  badge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  priceRowMid: { flex: 1 },
  storeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  priceStoreName: { fontSize: 14, fontWeight: '700', color: colors.ink },
  trophy: { fontSize: 14 },
  barBg: { height: 4, backgroundColor: '#F1F5F9', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
  priceRowRight: { alignItems: 'flex-end', marginLeft: 8 },
  priceValue: { fontSize: 19, fontWeight: '800', color: colors.ink },
  priceValueCheap: { color: '#10B981' },
  priceOld: { fontSize: 12, color: colors.muted, textDecorationLine: 'line-through' },
  empty: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  emptySub: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  scanAgain: { marginTop: 16, backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  scanAgainText: { color: '#1A1A1A', fontWeight: '700', fontSize: 15 },
  addListBtn: { backgroundColor: colors.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  addListBtnText: { fontSize: 11, color: colors.primary, fontWeight: '700' },
});
