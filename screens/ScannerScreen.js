import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Vibration, SafeAreaView, StatusBar,
  Animated, Easing, TextInput, Image
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

async function fetchProductImage(ean) {
  try {
    const r = await fetch(`${API}/api/image/${ean}`);
    const data = await r.json();
    return data.url || null;
  } catch { return null; }
}

// 3-letter store badge
function StoreBadge({ store, size = 44 }) {
  const key = (store || '').toLowerCase().replace(/\s+/g, '');
  const bg = storeColors[key] || colors.primary;
  const label = (store || '').slice(0, 3).toUpperCase();
  const textSize = size * 0.32;
  return (
    <View style={{
      width: size, height: size, borderRadius: 10,
      backgroundColor: bg, justifyContent: 'center', alignItems: 'center',
    }}>
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: textSize, letterSpacing: 0.5 }}>
        {label}
      </Text>
    </View>
  );
}

// Animated scan frame
function ScanFrame() {
  const pulse = useRef(new Animated.Value(1)).current;
  const lineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.03, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(lineAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(lineAnim, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const lineTranslate = lineAnim.interpolate({ inputRange: [0, 1], outputRange: [-55, 55] });

  return (
    <Animated.View style={[styles.scanFrame, { transform: [{ scale: pulse }] }]}>
      {['tl', 'tr', 'bl', 'br'].map(c => <View key={c} style={[styles.scanCorner, styles[c]]} />)}
      <Animated.View style={[styles.scanLine, { transform: [{ translateY: lineTranslate }] }]} />
    </Animated.View>
  );
}

// Animated price row
function PriceRow({ item, index, maxPrice }) {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const isCheap = index === 0;
  const barWidth = maxPrice > 0 ? (parseFloat(item.sale_price) / maxPrice) * 100 : 100;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 350, delay: index * 70, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 280, delay: index * 70, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[
      styles.priceRow,
      isCheap && styles.priceRowCheap,
      { transform: [{ translateY: slideAnim }], opacity: opacityAnim }
    ]}>
      <StoreBadge store={item.store} size={44} />
      <View style={styles.priceRowMid}>
        <View style={styles.storeNameRow}>
          <Text style={styles.priceStoreName}>{(item.store || '').toUpperCase()}</Text>
          {isCheap && <Text style={styles.trophy}>🏆</Text>}
        </View>
        <View style={styles.barBg}>
          <View style={[styles.barFill, {
            width: `${barWidth}%`,
            backgroundColor: isCheap ? colors.success : colors.border
          }]} />
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
  const [productImage, setProductImage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const soundRef = useRef(null);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const stedkoAnim = useRef(new Animated.Value(0)).current;

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
    setProductImage(null);
    setSaved(false);
    setShowSearch(false);
    Vibration.vibrate([0, 80, 50, 80]);
    try { await soundRef.current?.replayAsync(); } catch {}

    try {
      const phone = await getPhone();
      const q = phone ? `?phone=${encodeURIComponent(phone)}` : '';
      const res = await fetch(`${API}/api/barcode/${data}${q}`);
      const json = await res.json();
      setResult(json);

      Animated.parallel([
        Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(stedkoAnim, { toValue: 1, duration: 600, delay: 300, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      ]).start();

      const hist = JSON.parse(await AsyncStorage.getItem('scan_history') || '[]');
      await AsyncStorage.setItem('scan_history', JSON.stringify(
        [{ ...json, scanned_at: new Date().toISOString() }, ...hist.filter(h => h.barcode !== data)].slice(0, 50)
      ));
      const saved_ = JSON.parse(await AsyncStorage.getItem('saved_products') || '[]');
      setSaved(saved_.some(s => s.barcode === data));

      // Fetch product image in background
      fetchProductImage(data).then(url => { if (url) setProductImage(url); });

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
    alert(`✓ Dodano u "${activeList.name}"!`);
  }

  async function doSearch(q) {
    if (!q || q.length < 2) return;
    setSearching(true);
    try {
      const r = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}&ai=0`);
      const data = await r.json();
      setSearchResults(data.products || []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  }

  async function selectSearchResult(item) {
    setShowSearch(false);
    setSearchResults([]);
    setSearchQuery('');
    setScanned(true);
    setLoading(true);
    setResult(null);
    setProductImage(null);
    try {
      const res = await fetch(`${API}/api/barcode/${item.ean}`);
      const json = await res.json();
      setResult(json);
      Animated.parallel([
        Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(stedkoAnim, { toValue: 1, duration: 600, delay: 300, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      ]).start();
      fetchProductImage(item.ean).then(url => { if (url) setProductImage(url); });
    } catch {
      setResult({ barcode: item.ean, name: item.name, prices: [] });
    } finally { setLoading(false); }
  }

  function reset() {
    setScanned(false);
    setResult(null);
    setSaved(false);
    setProductImage(null);
    setShowSearch(false);
    setSearchResults([]);
    setSearchQuery('');
    headerAnim.setValue(0);
    stedkoAnim.setValue(0);
  }

  // ── Camera permission ──
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

  // ── Scanner view ──
  if (!scanned) return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.scannerWrap}>

        {/* Header */}
        <View style={styles.scanHeader}>
          <Text style={styles.scanTitle}>Štedko</Text>
        </View>

        {/* Search bar */}
        <View style={styles.searchBarWrap}>
          <View style={styles.searchBar}>
            <Text style={styles.searchBarIcon}>🔍</Text>
            <TextInput
              style={styles.searchBarInput}
              placeholder="Pretraži proizvode..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setShowSearch(true)}
              onSubmitEditing={() => doSearch(searchQuery)}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setShowSearch(false); }}>
                <Text style={{ color: colors.muted, fontSize: 18, paddingHorizontal: 8 }}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search results dropdown */}
        {showSearch && searchResults.length > 0 && (
          <View style={styles.searchDropdown}>
            {searching && <ActivityIndicator color={colors.primary} style={{ padding: 12 }} />}
            {searchResults.slice(0, 6).map(item => (
              <TouchableOpacity key={item.ean} style={styles.searchDropItem} onPress={() => selectSearchResult(item)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchDropName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.searchDropSub}>{item.store_count} trgovina · od {parseFloat(item.cheapest_price).toFixed(2)}€</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Camera + frame */}
        {!showSearch && (
          <View style={styles.cameraWrap}>
            <CameraView
              style={StyleSheet.absoluteFill}
              onBarcodeScanned={handleScan}
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            />
            <View style={styles.cameraOverlay}>
              <ScanFrame />
              <Text style={styles.scanHint}>Usmjeri na barkod</Text>
            </View>
          </View>
        )}

        {/* Štedko floating bubble */}
        {!showSearch && (
          <View style={styles.stedkoBubble}>
            <View style={styles.stedkoBubbleText}>
              <Text style={styles.stedkoBubbleLabel}>Skeniraj{'\n'}proizvod!</Text>
            </View>
            <Image
              source={require('../assets/stedko-scan.png')}
              style={styles.stedkoFloat}
              defaultSource={require('../assets/icon.png')}
            />
          </View>
        )}

      </SafeAreaView>
    </View>
  );

  // ── Results ──
  const prices = result?.prices || [];
  const maxPrice = prices.length ? Math.max(...prices.map(p => parseFloat(p.sale_price || 0))) : 0;
  const savings = prices.length > 1
    ? (parseFloat(prices[prices.length - 1].sale_price) - parseFloat(prices[0].sale_price)).toFixed(2)
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
              <Animated.View style={[styles.productCard, {
                opacity: headerAnim,
                transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }]
              }]}>
                {/* Product image */}
                <View style={styles.productImgWrap}>
                  {productImage
                    ? <Image source={{ uri: productImage }} style={styles.productImg} resizeMode="contain" />
                    : <View style={styles.productImgPlaceholder}>
                        <Text style={{ fontSize: 32 }}>🐷</Text>
                      </View>
                  }
                </View>

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

              {/* Savings banner with Štedko */}
              {savings && parseFloat(savings) > 0 && (
                <Animated.View style={[styles.savingsBanner, {
                  opacity: stedkoAnim,
                  transform: [{ scale: stedkoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }]
                }]}>
                  <Image
                    source={require('../assets/stedko-happy.png')}
                    style={styles.stedkoInline}
                    defaultSource={require('../assets/icon.png')}
                  />
                  <Text style={styles.savingsText}>
                    Uštedi <Text style={styles.savingsAmount}>{savings}€</Text> ako kupiš u najjeftinijoj trgovini!
                  </Text>
                </Animated.View>
              )}

              {prices.length === 0 && (
                <View style={styles.empty}>
                  <Image
                    source={require('../assets/stedko-sad.png')}
                    style={{ width: 120, height: 120 }}
                    defaultSource={require('../assets/icon.png')}
                  />
                  <Text style={styles.emptyTitle}>Nije u bazi još</Text>
                  <Text style={styles.emptySub}>Pokušaj skenirati drugi proizvod</Text>
                </View>
              )}

              {prices.length > 0 && (
                <Text style={styles.sectionTitle}>
                  {prices.length} {prices.length === 1 ? 'trgovina ima' : prices.length < 5 ? 'trgovine imaju' : 'trgovina ima'} ovaj proizvod
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
  // Permission
  permWrap: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 32 },
  permIcon: { fontSize: 56, marginBottom: 16 },
  permTitle: { fontSize: 22, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  permSub: { fontSize: 15, color: colors.muted, textAlign: 'center', marginBottom: 32 },
  permBtn: { backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  permBtnText: { color: '#1A1A1A', fontWeight: '700', fontSize: 16 },

  // Scanner
  scannerWrap: { flex: 1, backgroundColor: '#fff' },
  scanHeader: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  scanTitle: { fontSize: 28, fontWeight: '900', color: colors.ink },
  searchBarWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  searchBarIcon: { fontSize: 16, marginRight: 8 },
  searchBarInput: { flex: 1, fontSize: 15, color: colors.ink, fontFamily: undefined },
  searchDropdown: { position: 'absolute', top: 120, left: 16, right: 16, backgroundColor: '#fff', borderRadius: 14, zIndex: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  searchDropItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchDropName: { fontSize: 14, fontWeight: '600', color: colors.ink },
  searchDropSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  cameraWrap: { flex: 1, position: 'relative', margin: 16, borderRadius: 20, overflow: 'hidden' },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  scanFrame: { width: 260, height: 160, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  scanCorner: { position: 'absolute', width: 28, height: 28, borderColor: colors.primary, borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  scanLine: { width: 220, height: 2.5, backgroundColor: colors.primary, borderRadius: 2, shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 4 },
  scanHint: { position: 'absolute', bottom: 24, fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  stedkoBubble: { position: 'absolute', bottom: 24, right: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  stedkoBubbleText: { backgroundColor: '#fff', borderRadius: 12, borderBottomRightRadius: 2, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
  stedkoBubbleLabel: { fontSize: 11, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  stedkoFloat: { width: 64, height: 64 },

  // Results
  results: { flex: 1, backgroundColor: colors.bg },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadText: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  productCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  productImgWrap: { width: 72, height: 72, borderRadius: 12, backgroundColor: '#F8FAFF', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  productImg: { width: 72, height: 72 },
  productImgPlaceholder: { width: 72, height: 72, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12 },
  productName: { fontSize: 16, fontWeight: '700', color: colors.ink, lineHeight: 22, marginBottom: 3 },
  productBrand: { fontSize: 12, color: colors.muted, marginBottom: 2 },
  productQty: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  productBarcode: { fontSize: 11, color: '#CBD5E1' },
  saveBtn: { padding: 4 },
  saveIcon: { fontSize: 26 },
  addListBtn: { backgroundColor: colors.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  addListBtnText: { fontSize: 11, color: colors.primaryDark, fontWeight: '700' },
  savingsBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.success + '40', gap: 10 },
  stedkoInline: { width: 44, height: 44 },
  savingsText: { flex: 1, fontSize: 13, color: '#065F46', fontWeight: '500', lineHeight: 18 },
  savingsAmount: { fontWeight: '800', color: colors.success },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  priceRow: { backgroundColor: '#fff', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: colors.border, gap: 12 },
  priceRowCheap: { borderColor: colors.success, borderWidth: 2, backgroundColor: '#F0FDF4' },
  priceRowMid: { flex: 1 },
  storeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  priceStoreName: { fontSize: 14, fontWeight: '700', color: colors.ink },
  trophy: { fontSize: 14 },
  barBg: { height: 4, backgroundColor: '#F1F5F9', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
  priceRowRight: { alignItems: 'flex-end' },
  priceValue: { fontSize: 20, fontWeight: '800', color: colors.ink },
  priceValueCheap: { color: colors.success },
  priceOld: { fontSize: 12, color: colors.muted, textDecorationLine: 'line-through' },
  empty: { alignItems: 'center', padding: 32, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.ink },
  emptySub: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  scanAgain: { marginTop: 16, backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  scanAgainText: { color: '#1A1A1A', fontWeight: '700', fontSize: 15 },
});
