import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Vibration, StatusBar,
  Animated, Easing, TextInput, Image, Dimensions, Platform, Alert, Modal
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, storeColors } from '../theme';
import EquivalentsScreen from './EquivalentsScreen';

const API = 'https://botapp-u7qa.onrender.com';
const { height } = Dimensions.get('window');
const CF_R2 = 'https://pub-293216a071274ad2b9836cb3fe9f54ef.r2.dev/products';

function distStr(km) {
  if (km == null) return '';
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

async function getPhone() {
  const u = await AsyncStorage.getItem('user');
  return u ? JSON.parse(u).phone : null;
}

async function fetchProductImage(ean) {
  try {
    const r = await fetch(`${CF_R2}/${ean}.jpg`, { method: 'HEAD' });
    if (r.ok) return `${CF_R2}/${ean}.jpg`;
  } catch {}
  try {
    const r = await fetch(`${API}/api/image/${ean}`);
    const data = await r.json();
    return data.url || null;
  } catch { return null; }
}

const STORE_DISPLAY = {
  lidl: 'Lidl', konzum: 'Konzum', kaufland: 'Kaufland', spar: 'Spar',
  studenac: 'Studenac', tommy: 'Tommy', plodine: 'Plodine', eurospin: 'Eurospin',
  dm: 'dm', ktc: 'KTC', metro: 'Metro', ntl: 'NTL', ribola: 'Ribola',
  roto: 'Roto', trgocentar: 'Trgocentar', brodokomerc: 'Brodokomerc',
  lorenco: 'Lorenco', boso: 'Boso', vrutak: 'Vrutak', zabac: 'Žabac',
  jadrankatrgovina: 'Jadranka', trgovinakrk: 'Trg. Krk',
  djelovodice: 'Djelo Vodice', branka: 'Branka', gavranovic: 'Gavranović',
};

const LOGO_MAP = {
  lidl: require('../assets/logos/lidl.png'), konzum: require('../assets/logos/konzum.png'),
  kaufland: require('../assets/logos/kaufland.png'), spar: require('../assets/logos/spar.png'),
  studenac: require('../assets/logos/studenac.png'), tommy: require('../assets/logos/tommy.png'),
  plodine: require('../assets/logos/plodine.png'), eurospin: require('../assets/logos/eurospin.png'),
  dm: require('../assets/logos/dm.png'), ktc: require('../assets/logos/ktc.png'),
  metro: require('../assets/logos/metro.png'), ntl: require('../assets/logos/ntl.png'),
  ribola: require('../assets/logos/ribola.png'), roto: require('../assets/logos/roto.png'),
  trgocentar: require('../assets/logos/trgocentar.png'), brodokomerc: require('../assets/logos/brodokomerc.png'),
  lorenco: require('../assets/logos/lorenco.png'), boso: require('../assets/logos/boso.png'),
  vrutak: require('../assets/logos/vrutak.png'), zabac: require('../assets/logos/zabac.png'),
  jadrankatrgovina: require('../assets/logos/jadranka_trgovina.png'),
  trgovinakrk: require('../assets/logos/trgovina_krk.png'),
};

function StoreBadge({ store, size = 48 }) {
  const key = (store || '').toLowerCase().replace(/[\s_-]+/g, '');
  const logo = LOGO_MAP[key];
  const bg = storeColors[key] || '#64748B';
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.22, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 }}>
      {logo
        ? <Image source={logo} style={{ width: size * 0.98, height: size * 0.98 }} resizeMode="contain" />
        : <View style={{ width: size, height: size, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: '900', fontSize: size * 0.3 }}>{(store || '').slice(0, 3).toUpperCase()}</Text></View>
      }
    </View>
  );
}

function ScanFrame() {
  const lineAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(lineAnim, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(lineAnim, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
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
  const [expanded, setExpanded] = useState(false);
  const isCheap = index === 0;
  const price = parseFloat(item.sale_price || 0);
  const barPct = maxPrice > 0 ? (price / maxPrice) * 100 : 100;
  const locationCount = item.locations ? item.locations.length : 0;
  const firstLoc = item.locations?.[0];

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 380, delay: index * 60, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[
      styles.priceRow, isCheap && styles.priceRowCheap,
      { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0,1], outputRange: [30, 0] }) }] }
    ]}>
      {/* Main row — tap to expand */}
      <TouchableOpacity
        activeOpacity={locationCount > 1 ? 0.7 : 1}
        onPress={() => locationCount > 1 && setExpanded(e => !e)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
      >
        <StoreBadge store={item.store} size={48} />
        <View style={styles.priceRowMid}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Text style={[styles.priceStoreName, isCheap && { color: colors.success }]}>
              {STORE_DISPLAY[(item.store || '').toLowerCase().replace(/[\s_-]+/g, '')] || (item.store || '').toUpperCase()}
            </Text>
            {isCheap && <Text style={{ fontSize: 15 }}>🏆</Text>}
          </View>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${barPct}%`, backgroundColor: isCheap ? colors.success : '#CBD5E1' }]} />
          </View>
          {locationCount > 1 && (
            <Text style={styles.locationCount}>{locationCount} lokacija  {expanded ? '▲' : '▼'}</Text>
          )}
          {locationCount === 1 && firstLoc?.address && (
            <Text style={styles.branchAddress} numberOfLines={1}>
              📍 {firstLoc.address}{firstLoc.distance_km != null ? `  ·  ${distStr(firstLoc.distance_km)}` : ''}
            </Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.priceValue, isCheap && { color: colors.success }]}>{price.toFixed(2)}€</Text>
          {item.original_price && item.original_price !== item.sale_price && (
            <Text style={styles.priceOld}>{parseFloat(item.original_price).toFixed(2)}€</Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Expanded locations list — separate from the badge row */}
      {expanded && locationCount > 1 && (
        <View style={styles.locationsList}>
          {item.locations.map((loc, i) => (
            <View key={i} style={styles.locationItem}>
              <Text style={styles.locationItemAddress} numberOfLines={1}>📍 {loc.address}, {loc.city}</Text>
              {loc.distance_km != null && <Text style={styles.locationItemDist}>{distStr(loc.distance_km)}</Text>}
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
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
  const [liveLocation, setLiveLocation] = useState(false);
  const [homeCity, setHomeCity] = useState('');
  const [liveCoords, setLiveCoords] = useState(null);
  const [allLists, setAllLists] = useState([]);
  const soundRef = useRef(null);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const bannerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Audio.Sound.createAsync({ uri: 'https://www.soundjay.com/buttons/beep-08b.mp3' })
      .then(({ sound }) => { soundRef.current = sound; }).catch(() => {});
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('home_city').then(c => { if (c) setHomeCity(c); });
    AsyncStorage.getItem('live_location').then(v => { if (v === 'true') setLiveLocation(true); });
  }, []);

  async function getLocationParams() {
    if (liveLocation) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setLiveCoords({ lat: loc.coords.latitude, lon: loc.coords.longitude });
          return `lat=${loc.coords.latitude}&lon=${loc.coords.longitude}&d=5`;
        }
      } catch {}
    }
    try {
      const cached = await AsyncStorage.getItem('home_coords');
      if (cached) { const { lat, lon } = JSON.parse(cached); return `lat=${lat}&lon=${lon}&d=10`; }
    } catch {}
    if (homeCity) {
      try {
        const gr = await fetch(`${API}/api/geocode?city=${encodeURIComponent(homeCity)}`);
        const gd = await gr.json();
        if (gd.lat) {
          await AsyncStorage.setItem('home_coords', JSON.stringify({ lat: gd.lat, lon: gd.lon }));
          return `lat=${gd.lat}&lon=${gd.lon}&d=10`;
        }
      } catch {}
      return `city=${encodeURIComponent(homeCity)}`;
    }
    return '';
  }

  async function handleScan({ data }) {
    if (scanned || loading) return;
    setScanned(true); setLoading(true); setResult(null); setProductImage(null); setSaved(false); setShowSearch(false);
    Vibration.vibrate([0, 80, 50, 80]);
    try { await soundRef.current?.replayAsync(); } catch {}
    try {
      const phone = await getPhone();
      const locParams = await getLocationParams();
      const phoneParam = phone ? `&phone=${encodeURIComponent(phone)}` : '';
      const res = await fetch(`${API}/api/barcode/${data}?${locParams}${phoneParam}`);
      const json = await res.json();
      setResult(json);
      headerAnim.setValue(0); bannerAnim.setValue(0);
      Animated.sequence([
        Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(bannerAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      ]).start();
      const hist = JSON.parse(await AsyncStorage.getItem('scan_history') || '[]');
      await AsyncStorage.setItem('scan_history', JSON.stringify([{ ...json, scanned_at: new Date().toISOString() }, ...hist.filter(h => h.barcode !== data)].slice(0, 50)));
      const saved_ = JSON.parse(await AsyncStorage.getItem('saved_products') || '[]');
      setSaved(saved_.some(s => s.barcode === data));
      setAllLists(JSON.parse(await AsyncStorage.getItem('shopping_lists') || '[]'));
      if (json.image_url) setProductImage(json.image_url);
      else fetchProductImage(data).then(url => { if (url) setProductImage(url); });
    } catch { setResult({ barcode: data, name: 'Ups, nešto nije štimalo', prices: [] }); }
    finally { setLoading(false); }
  }

  async function loadFromEan(ean, name) {
    setScanned(true); setLoading(true); setResult(null); setProductImage(null);
    setShowSearch(false); setSearchQuery(''); setSearchResults([]);
    try {
      const locParams = await getLocationParams();
      const res = await fetch(`${API}/api/barcode/${ean}?${locParams}`);
      const json = await res.json();
      setResult(json);
      headerAnim.setValue(0); bannerAnim.setValue(0);
      Animated.sequence([
        Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(bannerAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      ]).start();
      if (json.image_url) setProductImage(json.image_url);
      else fetchProductImage(ean).then(url => { if (url) setProductImage(url); });
    } catch { setResult({ barcode: ean, name: name || 'Greška', prices: [] }); }
    finally { setLoading(false); }
  }

  async function doSearch(q) {
    if (!q || q.length < 2) return;
    setSearching(true);
    try { const r = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}&ai=0`); const data = await r.json(); setSearchResults(data.products || []); }
    catch { setSearchResults([]); } finally { setSearching(false); }
  }

  async function toggleSave() {
    if (!result) return;
    const existing = JSON.parse(await AsyncStorage.getItem('saved_products') || '[]');
    const isSaved = existing.some(e => e.barcode === result.barcode);
    const updated = isSaved ? existing.filter(e => e.barcode !== result.barcode) : [{ ...result, saved_at: new Date().toISOString() }, ...existing];
    await AsyncStorage.setItem('saved_products', JSON.stringify(updated));
    setSaved(!isSaved);
    if (!isSaved) Vibration.vibrate(50);
  }

  async function addToList() {
    if (!result) return;
    const lists = JSON.parse(await AsyncStorage.getItem('shopping_lists') || '[]');
    if (!lists.length) { Alert.alert('Kreiraj popis', 'Najprije kreiraj popis u Popis tabu!'); return; }
    if (lists.length === 1) await saveToList(lists[0]);
    else setShowListPicker(true);
  }

  async function saveToList(list) {
    const lists = JSON.parse(await AsyncStorage.getItem('shopping_lists') || '[]');
    const item = { ean: result.barcode, name: result.name, brand: result.brand, quantity: 1, size: `${result.quantity || ''} ${result.unit || ''}`.trim(), added: new Date().toISOString() };
    const updated = lists.map(l => l.id === list.id ? { ...l, items: [...(l.items || []).filter(i => i.ean !== result.barcode), item] } : l);
    await AsyncStorage.setItem('shopping_lists', JSON.stringify(updated));
    Vibration.vibrate(50); setShowListPicker(false);
    Alert.alert('Dodano ✓', `Spremljeno u "${list.name}"`);
  }

  function reset() {
    setScanned(false); setResult(null); setSaved(false); setProductImage(null);
    setShowSearch(false); setSearchResults([]); setSearchQuery('');
    headerAnim.setValue(0); bannerAnim.setValue(0);
  }

  if (!permission?.granted) return (
    <SafeAreaView style={[styles.centeredWrap, { paddingTop: insets.top }]}>
      <Image source={require('../assets/icon.png')} style={{ width: 80, height: 80, marginBottom: 20, borderRadius: 20 }} />
      <Text style={styles.permTitle}>Treba nam kamera</Text>
      <Text style={styles.permSub}>Potrebno za skeniranje barkodova u trgovini</Text>
      <TouchableOpacity style={styles.bigBtn} onPress={requestPermission}><Text style={styles.bigBtnText}>Dozvoli kameru →</Text></TouchableOpacity>
    </SafeAreaView>
  );

  if (!scanned) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.locationBar}>
        {homeCity
          ? <Text style={styles.locationBarText}>📍 {liveLocation && liveCoords ? 'GPS aktivan' : homeCity}</Text>
          : <Text style={styles.locationBarEmpty}>📍 Postavi lokaciju u Profil tabu</Text>
        }
        <TouchableOpacity
          style={[styles.locationToggle, liveLocation && styles.locationToggleActive]}
          onPress={async () => {
            const next = !liveLocation;
            setLiveLocation(next);
            await AsyncStorage.setItem('live_location', String(next));
            if (next) {
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status !== 'granted') { setLiveLocation(false); await AsyncStorage.setItem('live_location', 'false'); }
            }
          }}>
          <Text style={[styles.locationToggleText, liveLocation && { color: '#fff' }]}>{liveLocation ? '🛰 Uživo' : '🏠 Dom'}</Text>
        </TouchableOpacity>
      </View>

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

      {showSearch && (searchResults.length > 0 || searching) && (
        <View style={styles.searchDropdown}>
          {searching && <ActivityIndicator color={colors.primary} style={{ padding: 16 }} />}
          {searchResults.slice(0, 7).map(item => (
            <TouchableOpacity key={item.ean} style={styles.searchDropItem} onPress={() => loadFromEan(item.ean, item.name)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.searchDropName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.searchDropSub}>{item.store_count} trgovina · od {parseFloat(item.cheapest_price).toFixed(2)}€</Text>
              </View>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>{parseFloat(item.cheapest_price).toFixed(2)}€</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!showSearch && (
        <View style={{ flex: 1, position: 'relative' }}>
          <View style={styles.cameraWrap}>
            <CameraView style={StyleSheet.absoluteFill} onBarcodeScanned={handleScan} barcodeScannerSettings={{ barcodeTypes: ['ean13','ean8','upc_a','upc_e'] }} />
            <View style={styles.cameraOverlay}>
              <ScanFrame />
              <Text style={styles.scanHint}>Usmjeri na barkod</Text>
            </View>
          </View>
          <View style={styles.stedkoBubble}>
            <Image source={require('../assets/stedko-scan.png')} style={styles.stedkoFloat} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );

  // Group branches by chain+price
  const rawPrices = result?.prices || [];
  const prices = (() => {
    const groups = {};
    for (const p of rawPrices) {
      const key = `${p.store}__${p.sale_price}`;
      if (!groups[key]) groups[key] = { ...p, locations: [] };
      if (p.address || p.distance_km != null) {
        groups[key].locations.push({ address: p.address || '', city: p.city || '', distance_km: p.distance_km, store_code: p.store_code || '' });
      }
    }
    return Object.values(groups).map(g => {
      g.locations.sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
      return g;
    }).sort((a, b) => parseFloat(a.sale_price) - parseFloat(b.sale_price));
  })();
  const maxPrice = prices.length ? Math.max(...prices.map(p => parseFloat(p.sale_price || 0))) : 0;
  const savings = prices.length > 1 ? (parseFloat(prices[prices.length-1].sale_price) - parseFloat(prices[0].sale_price)).toFixed(2) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
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
              <Animated.View style={[styles.productCard, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0,1], outputRange: [-24, 0] }) }] }]}>
                <View style={styles.productImgWrap}>
                  {productImage ? <Image source={{ uri: productImage }} style={styles.productImg} resizeMode="contain" /> : <Text style={{ fontSize: 36 }}>🛒</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName} numberOfLines={2}>{result?.name || 'Nepoznat proizvod'}</Text>
                  {result?.brand ? <Text style={styles.productBrand}>{result.brand}</Text> : null}
                  {result?.quantity ? <Text style={styles.productQty}>{result.quantity} {result?.unit || ''}</Text> : null}
                  <Text style={styles.productBarcode}>#{result?.barcode}</Text>
                </View>
                <View style={{ alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity onPress={toggleSave}><Text style={{ fontSize: 28 }}>{saved ? '❤️' : '🤍'}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={addToList} style={styles.addListBtn}>
                    <Text style={{ fontSize: 20 }}>🛒</Text>
                    <Text style={styles.addListBtnText}>Popis</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>

              {savings && parseFloat(savings) > 0 && (
                <Animated.View style={[styles.savingsBanner, { opacity: bannerAnim, transform: [{ scale: bannerAnim.interpolate({ inputRange: [0,1], outputRange: [0.85, 1] }) }] }]}>
                  <Image source={require('../assets/stedko-happy.png')} style={styles.stedkoBannerImg} />
                  <Text style={styles.savingsText}>Uštedi <Text style={styles.savingsAmount}>{savings}€</Text> ako kupiš u najjeftinijoj!</Text>
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
          renderItem={({ item, index }) => <PriceRow item={item} index={index} maxPrice={maxPrice} />}
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
              <TouchableOpacity key={list.id} onPress={() => saveToList(list)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ fontSize: 24, marginRight: 12 }}>🛒</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{list.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>{list.items?.length || 0} proizvoda</Text>
                </View>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Dodaj →</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowListPicker(false)} style={{ marginTop: 16, padding: 14, alignItems: 'center' }}>
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
  locationBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  locationBarText: { fontSize: 13, color: colors.ink, fontWeight: '600', flex: 1 },
  locationBarEmpty: { fontSize: 12, color: colors.muted, flex: 1 },
  locationToggle: { backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.border },
  locationToggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  locationToggleText: { fontSize: 12, fontWeight: '700', color: colors.ink },
  searchBarWrap: { paddingHorizontal: 16, paddingBottom: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11 },
  searchBarInput: { flex: 1, fontSize: 15, color: colors.ink },
  searchDropdown: { position: 'absolute', top: 118, left: 16, right: 16, backgroundColor: '#fff', borderRadius: 16, zIndex: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 10, overflow: 'hidden' },
  searchDropItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchDropName: { fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: 2 },
  searchDropSub: { fontSize: 12, color: colors.muted },
  cameraWrap: { flex: 1, margin: 16, borderRadius: 24, overflow: 'hidden' },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  scanFrame: { width: 260, height: 150, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  scanCorner: { position: 'absolute', width: 30, height: 30, borderColor: colors.primary, borderWidth: 3.5 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  scanLine: { width: 220, height: 2.5, backgroundColor: colors.primary, borderRadius: 2, shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8, elevation: 6 },
  scanHint: { position: 'absolute', bottom: 20, fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  stedkoBubble: { position: 'absolute', bottom: 16, right: 12 },
  stedkoFloat: { width: height * 0.18, height: height * 0.18 },
  productCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  productImgWrap: { width: 80, height: 80, borderRadius: 14, backgroundColor: '#F8FAFF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  productImg: { width: 80, height: 80 },
  productName: { fontSize: 16, fontWeight: '700', color: colors.ink, lineHeight: 22, marginBottom: 3 },
  productBrand: { fontSize: 12, color: colors.muted, marginBottom: 2 },
  productQty: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  productBarcode: { fontSize: 11, color: '#CBD5E1' },
  addListBtn: { backgroundColor: colors.primaryLight, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', gap: 2 },
  addListBtnText: { fontSize: 10, color: colors.primaryDark, fontWeight: '800' },
  savingsBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1.5, borderColor: colors.success + '50', gap: 12 },
  stedkoBannerImg: { width: 52, height: 52 },
  savingsText: { flex: 1, fontSize: 14, color: '#065F46', fontWeight: '600', lineHeight: 20 },
  savingsAmount: { fontWeight: '900', color: colors.success, fontSize: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.muted, letterSpacing: 1, marginBottom: 10 },
  priceRow: { backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'column', marginBottom: 8, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  priceRowCheap: { borderColor: colors.success, borderWidth: 2, backgroundColor: '#ECFDF5' },
  priceRowMid: { flex: 1 },
  priceStoreName: { fontSize: 14, fontWeight: '800', color: colors.ink },
  barBg: { height: 5, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  barFill: { height: 5, borderRadius: 3 },
  priceValue: { fontSize: 22, fontWeight: '900', color: colors.ink },
  priceOld: { fontSize: 12, color: colors.muted, textDecorationLine: 'line-through' },
  locationCount: { fontSize: 11, color: colors.primary, fontWeight: '700', marginTop: 2 },
  branchAddress: { fontSize: 11, color: colors.muted, marginTop: 2, lineHeight: 15 },
  locationsList: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6 },
  locationItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  locationItemAddress: { fontSize: 12, color: colors.ink, flex: 1 },
  locationItemDist: { fontSize: 12, fontWeight: '700', color: colors.primary, marginLeft: 8 },
  scanAgainBtn: { marginTop: 20, backgroundColor: colors.primary, borderRadius: 16, padding: 18, alignItems: 'center' },
  scanAgainText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
