import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Vibration, SafeAreaView, StatusBar,
  Animated, Easing, TextInput, Image, Dimensions, Platform, Alert, Modal
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, storeColors } from '../theme';
import EquivalentsScreen from './EquivalentsScreen';

const API = 'https://botapp-u7qa.onrender.com';
const { width } = Dimensions.get('window');

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

function StoreBadge({ store, size = 48 }) {
  const key = (store || '').toLowerCase().replace(/[\s_]+/g, '');
  const bg = storeColors[key] || '#64748B';
  const label = (store || '').slice(0, 3).toUpperCase();
  return (
    <View style={{
      width: size, height: size, borderRadius: 12,
      backgroundColor: bg, justifyContent: 'center', alignItems: 'center',
      shadowColor: bg, shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4, shadowRadius: 4, elevation: 4,
    }}>
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: size * 0.3, letterSpacing: 0.5 }}>
        {label}
      </Text>
    </View>
  );
}

function ScanFrame() {
  const lineAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(lineAnim, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(lineAnim, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const lineTranslate = lineAnim.interpolate({ inputRange: [0, 1], outputRange: [-60, 60] });
  return (
    <View style={styles.scanFrame}>
      {['tl','tr','bl','br'].map(c => <View key={c} style={[styles.scanCorner, styles[c]]} />)}
      <Animated.View style={[styles.scanLine, { transform: [{ translateY: lineTranslate }] }]} />
    </View>
  );
}

function PriceRow({ item, index, maxPrice }) {
  const anim = useRef(new Animated.Value(0)).current;
  const isCheap = index === 0;
  const price = parseFloat(item.sale_price || 0);
  const minPrice = parseFloat(item.sale_price || 0);
  const barPct = maxPrice > 0 ? (price / maxPrice) * 100 : 100;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 380, delay: index * 60,
      easing: Easing.out(Easing.cubic), useNativeDriver: true
    }).start();
  }, []);

  return (
    <Animated.View style={[
      styles.priceRow,
      isCheap && styles.priceRowCheap,
      { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0,1], outputRange: [30, 0] }) }] }
    ]}>
      <StoreBadge store={item.store} size={48} />
      <View style={styles.priceRowMid}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 }}>
          <Text style={[styles.priceStoreName, isCheap && { color: colors.success }]}>
            {(item.store || '').toUpperCase()}
          </Text>
          {isCheap && <Text style={{ fontSize: 15 }}>🏆</Text>}
        </View>
        <View style={styles.barBg}>
          <View style={[styles.barFill, {
            width: `${barPct}%`,
            backgroundColor: isCheap ? colors.success : '#CBD5E1'
          }]} />
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.priceValue, isCheap && { color: colors.success }]}>
          {price.toFixed(2)}€
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
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showListPicker, setShowListPicker] = useState(false);
  const [allLists, setAllLists] = useState([]);
  const soundRef = useRef(null);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const bannerAnim = useRef(new Animated.Value(0)).current;

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
      headerAnim.setValue(0);
      bannerAnim.setValue(0);
      Animated.sequence([
        Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(bannerAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      ]).start();
      const hist = JSON.parse(await AsyncStorage.getItem('scan_history') || '[]');
      await AsyncStorage.setItem('scan_history', JSON.stringify(
        [{ ...json, scanned_at: new Date().toISOString() }, ...hist.filter(h => h.barcode !== data)].slice(0, 50)
      ));
      const saved_ = JSON.parse(await AsyncStorage.getItem('saved_products') || '[]');
      setSaved(saved_.some(s => s.barcode === data));
      const lists_ = JSON.parse(await AsyncStorage.getItem('shopping_lists') || '[]');
      setAllLists(lists_);
      fetchProductImage(data).then(url => { if (url) setProductImage(url); });
    } catch {
      setResult({ barcode: data, name: 'Ups, nešto nije štimalo', prices: [] });
    } finally { setLoading(false); }
  }

  async function loadFromEan(ean, name) {
    setScanned(true);
    setLoading(true);
    setResult(null);
    setProductImage(null);
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    try {
      const res = await fetch(`${API}/api/barcode/${ean}`);
      const json = await res.json();
      setResult(json);
      headerAnim.setValue(0);
      bannerAnim.setValue(0);
      Animated.sequence([
        Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(bannerAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      ]).start();
      fetchProductImage(ean).then(url => { if (url) setProductImage(url); });
    } catch {
      setResult({ barcode: ean, name: name || 'Greška', prices: [] });
    } finally { setLoading(false); }
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
    if (!lists.length) { Alert.alert('Kreiraj popis', 'Najprije kreiraj popis u Popis tabu!'); return; }
    if (lists.length === 1) {
      await saveToList(lists[0]);
    } else {
      setShowListPicker(true);
    }
  }

  async function saveToList(list) {
    const lists = JSON.parse(await AsyncStorage.getItem('shopping_lists') || '[]');
    const item = {
      ean: result.barcode, name: result.name, brand: result.brand,
      quantity: 1, size: `${result.quantity || ''} ${result.unit || ''}`.trim(),
      added: new Date().toISOString()
    };
    const updated = lists.map(l => l.id === list.id
      ? { ...l, items: [...(l.items || []).filter(i => i.ean !== result.barcode), item] }
      : l
    );
    await AsyncStorage.setItem('shopping_lists', JSON.stringify(updated));
    Vibration.vibrate(50);
    setShowListPicker(false);
    Alert.alert('Dodano ✓', `Spremljeno u "${list.name}"`);
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
    bannerAnim.setValue(0);
  }

  if (!permission?.granted) return (
    <SafeAreaView style={styles.centeredWrap}>
      <Image source={require('../assets/icon.png')} style={{ width: 80, height: 80, marginBottom: 20, borderRadius: 20 }} />
      <Text style={styles.permTitle}>Treba nam kamera</Text>
      <Text style={styles.permSub}>Potrebno za skeniranje barkodova u trgovini</Text>
      <TouchableOpacity style={styles.bigBtn} onPress={requestPermission}>
        <Text style={styles.bigBtnText}>Dozvoli kameru →</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  if (!scanned) return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.scanHeader}>
          <Text style={styles.scanTitle}>Štedko</Text>
        </View>

        {/* Search bar */}
        <View style={styles.searchBarWrap}>
          <View style={styles.searchBar}>
            <Text style={{ fontSize: 18, marginRight: 8 }}>🔍</Text>
            <TextInput
              style={styles.searchBarInput}
              placeholder="Pretraži proizvode..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={q => { setSearchQuery(q); if (q.length >= 2) doSearch(q); else setSearchResults([]); }}
              onFocus={() => setShowSearch(true)}
              returnKeyType="search"
              onSubmitEditing={() => doSearch(searchQuery)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setShowSearch(false); }}>
                <Text style={{ color: colors.muted, fontSize: 20, paddingHorizontal: 6 }}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search dropdown */}
        {showSearch && (searchResults.length > 0 || searching) && (
          <View style={styles.searchDropdown}>
            {searching && <ActivityIndicator color={colors.primary} style={{ padding: 16 }} />}
            {searchResults.slice(0, 7).map(item => (
              <TouchableOpacity key={item.ean} style={styles.searchDropItem}
                onPress={() => loadFromEan(item.ean, item.name)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchDropName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.searchDropSub}>{item.store_count} trgovina · od {parseFloat(item.cheapest_price).toFixed(2)}€</Text>
                </View>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>
                  {parseFloat(item.cheapest_price).toFixed(2)}€
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Camera */}
        {!showSearch && (
          <View style={styles.cameraWrap}>
            <CameraView
              style={StyleSheet.absoluteFill}
              onBarcodeScanned={handleScan}
              barcodeScannerSettings={{ barcodeTypes: ['ean13','ean8','upc_a','upc_e'] }}
            />
            <View style={styles.cameraOverlay}>
              <ScanFrame />
              <Text style={styles.scanHint}>Usmjeri na barkod</Text>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );

  // Results
  const prices = result?.prices || [];
  const maxPrice = prices.length ? Math.max(...prices.map(p => parseFloat(p.sale_price || 0))) : 0;
  const savings = prices.length > 1
    ? (parseFloat(prices[prices.length-1].sale_price) - parseFloat(prices[0].sale_price)).toFixed(2)
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="dark-content" />
      {loading ? (
        <View style={styles.centeredWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.permSub, { marginTop: 16 }]}>Tražim cijene po svim trgovinama...</Text>
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
                transform: [{ translateY: headerAnim.interpolate({ inputRange: [0,1], outputRange: [-24, 0] }) }]
              }]}>
                <View style={styles.productImgWrap}>
                  {productImage
                    ? <Image source={{ uri: productImage }} style={styles.productImg} resizeMode="contain" />
                    : <Text style={{ fontSize: 36 }}>🛒</Text>
                  }
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName} numberOfLines={2}>{result?.name || 'Nepoznat proizvod'}</Text>
                  {result?.brand ? <Text style={styles.productBrand}>{result.brand}</Text> : null}
                  {result?.quantity ? <Text style={styles.productQty}>{result.quantity} {result?.unit || ''}</Text> : null}
                  <Text style={styles.productBarcode}>#{result?.barcode}</Text>
                </View>
                <View style={{ alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity onPress={toggleSave}>
                    <Text style={{ fontSize: 28 }}>{saved ? '❤️' : '🤍'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={addToList} style={styles.addListBtn}>
                    <Text style={styles.addListBtnText}>+ Popis</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>

              {/* Savings banner */}
              {savings && parseFloat(savings) > 0 && (
                <Animated.View style={[styles.savingsBanner, {
                  opacity: bannerAnim,
                  transform: [{ scale: bannerAnim.interpolate({ inputRange: [0,1], outputRange: [0.85, 1] }) }]
                }]}>
                  <Image source={require('../assets/stedko-happy.png')} style={styles.stedkoBannerImg} />
                  <Text style={styles.savingsText}>
                    Uštedi <Text style={styles.savingsAmount}>{savings}€</Text> ako kupiš u najjeftinijoj!
                  </Text>
                </Animated.View>
              )}

              {prices.length === 0 && (
                <View style={styles.centeredWrap}>
                  <Image source={require('../assets/stedko-sad.png')} style={{ width: 130, height: 130 }} />
                  <Text style={[styles.permTitle, { marginTop: 16 }]}>Nije u bazi još</Text>
                  <Text style={styles.permSub}>Pokušaj skenirati drugi proizvod</Text>
                </View>
              )}

              {prices.length > 0 && (
                <Text style={styles.sectionLabel}>
                  {prices.length} {prices.length === 1 ? 'TRGOVINA IMA' : prices.length < 5 ? 'TRGOVINE IMAJU' : 'TRGOVINA IMA'} OVAJ PROIZVOD
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
              <TouchableOpacity style={styles.scanAgainBtn} onPress={reset}>
                <Text style={styles.scanAgainText}>📷  Skeniraj drugi proizvod</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
      <Modal visible={showListPicker} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink, marginBottom: 16 }}>Dodaj u popis</Text>
            {allLists.map(list => (
              <TouchableOpacity key={list.id} onPress={() => saveToList(list)}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ fontSize: 24, marginRight: 12 }}>🛒</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{list.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>{list.items?.length || 0} proizvoda</Text>
                </View>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Dodaj →</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowListPicker(false)}
              style={{ marginTop: 16, padding: 14, alignItems: 'center' }}>
              <Text style={{ color: colors.muted, fontWeight: '600' }}>Odustani</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centeredWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: colors.bg },
  permTitle: { fontSize: 22, fontWeight: '800', color: colors.ink, marginBottom: 8, textAlign: 'center' },
  permSub: { fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  bigBtn: { backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16, width: '100%', alignItems: 'center' },
  bigBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  scanHeader: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 4 },
  scanTitle: { fontSize: 24, fontWeight: '900', color: colors.ink },
  searchBarWrap: { paddingHorizontal: 16, paddingBottom: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11 },
  searchBarInput: { flex: 1, fontSize: 15, color: colors.ink },
  searchDropdown: { position: 'absolute', top: 118, left: 16, right: 16, backgroundColor: '#fff', borderRadius: 16, zIndex: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 10, overflow: 'hidden' },
  searchDropItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchDropName: { fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: 2 },
  searchDropSub: { fontSize: 12, color: colors.muted },
  cameraWrap: { flex: 1, margin: 16, borderRadius: 24, overflow: 'hidden', position: 'relative' },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  scanFrame: { width: 260, height: 150, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  scanCorner: { position: 'absolute', width: 30, height: 30, borderColor: colors.primary, borderWidth: 3.5 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  scanLine: { width: 220, height: 2.5, backgroundColor: colors.primary, borderRadius: 2, shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8, elevation: 6 },
  scanHint: { position: 'absolute', bottom: 20, fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500', letterSpacing: 0.3 },
  productCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  productImgWrap: { width: 80, height: 80, borderRadius: 14, backgroundColor: '#F8FAFF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  productImg: { width: 80, height: 80 },
  productName: { fontSize: 16, fontWeight: '700', color: colors.ink, lineHeight: 22, marginBottom: 3 },
  productBrand: { fontSize: 12, color: colors.muted, marginBottom: 2 },
  productQty: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  productBarcode: { fontSize: 11, color: '#CBD5E1' },
  addListBtn: { backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  addListBtnText: { fontSize: 12, color: colors.primaryDark, fontWeight: '700' },
  savingsBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1.5, borderColor: colors.success + '50', gap: 12 },
  stedkoBannerImg: { width: 52, height: 52 },
  savingsText: { flex: 1, fontSize: 14, color: '#065F46', fontWeight: '600', lineHeight: 20 },
  savingsAmount: { fontWeight: '900', color: colors.success, fontSize: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.muted, letterSpacing: 1, marginBottom: 10 },
  priceRow: { backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: colors.border, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  priceRowCheap: { borderColor: colors.success, borderWidth: 2, backgroundColor: '#ECFDF5' },
  priceRowMid: { flex: 1 },
  priceStoreName: { fontSize: 14, fontWeight: '800', color: colors.ink },
  barBg: { height: 5, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  priceValue: { fontSize: 22, fontWeight: '900', color: colors.ink },
  priceOld: { fontSize: 12, color: colors.muted, textDecorationLine: 'line-through' },
  scanAgainBtn: { marginTop: 20, backgroundColor: colors.primary, borderRadius: 16, padding: 18, alignItems: 'center' },
  scanAgainText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
