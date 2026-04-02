import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Vibration } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getPhone() {
  const u = await AsyncStorage.getItem('user');
  return u ? JSON.parse(u).phone : null;
}

const API = 'https://botapp-u7qa.onrender.com';

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
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/buttons/beep-07a.mp3' }
      );
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
      
      // Check if already saved
      const existing = JSON.parse(await AsyncStorage.getItem('saved_products') || '[]');
      setSaved(existing.some(e => e.barcode === json.barcode));
    } catch (e) {
      setResult({ barcode: data, name: 'Greška', prices: [] });
    } finally {
      setLoading(false);
    }
  }

  if (!permission) return <View />;
  if (!permission.granted) return (
    <View style={styles.center}>
      <Text style={styles.text}>Potreban pristup kameri</Text>
      <TouchableOpacity style={styles.btn} onPress={requestPermission}>
        <Text style={styles.btnText}>Dozvoli kameru</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {!scanned ? (
        <CameraView style={styles.camera} onBarcodeScanned={handleScan}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}>
          <View style={styles.overlay}>
            <View style={styles.scanBox} />
            <Text style={styles.hint}>Usmjeri kameru prema barkodu</Text>
          </View>
        </CameraView>
      ) : (
        <View style={styles.results}>
          {loading && <ActivityIndicator size="large" color="#E8572A" style={{ marginTop: 40 }} />}
          
          {result && (
            <>
              <View style={styles.productHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{result.name || 'Nepoznat proizvod'}</Text>
                  {result.brand ? <Text style={styles.brand}>{result.brand}</Text> : null}
                  <Text style={styles.barcode}>Barkod: {result.barcode}</Text>
                </View>
                <TouchableOpacity onPress={toggleSave} style={styles.saveBtn}>
                  <Text style={{ fontSize: 28 }}>{saved ? '❤️' : '🤍'}</Text>
                </TouchableOpacity>
              </View>

              {result.prices.length === 0 ? (
                <Text style={styles.noResults}>Nema cijena u bazi</Text>
              ) : (
                <FlatList
                  data={result.prices}
                  keyExtractor={(_, i) => i.toString()}
                  renderItem={({ item, index }) => (
                    <View style={[styles.priceRow, index === 0 && styles.cheapest]}>
                      <Text style={styles.storeName}>{item.store.toUpperCase()}</Text>
                      <View>
                        <Text style={styles.price}>{item.sale_price}€</Text>
                        {item.original_price && item.original_price !== item.sale_price && (
                          <Text style={styles.originalPrice}>{item.original_price}€</Text>
                        )}
                      </View>
                    </View>
                  )}
                />
              )}
            </>
          )}

          <TouchableOpacity style={styles.btn} onPress={() => { setScanned(false); setResult(null); }}>
            <Text style={styles.btnText}>📷 Skeniraj opet</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanBox: { width: 260, height: 160, borderWidth: 2, borderColor: '#E8572A', borderRadius: 12 },
  hint: { color: '#fff', marginTop: 20, fontSize: 15, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 8 },
  results: { flex: 1, padding: 16 },
  productHeader: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 16, marginBottom: 12 },
  productName: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 2 },
  brand: { fontSize: 14, color: '#888', marginBottom: 2 },
  barcode: { fontSize: 12, color: '#aaa' },
  saveBtn: { padding: 8 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
  cheapest: { borderColor: '#E8572A', borderWidth: 2 },
  storeName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  price: { fontSize: 20, fontWeight: 'bold', color: '#E8572A', textAlign: 'right' },
  originalPrice: { fontSize: 13, color: '#888', textDecorationLine: 'line-through', textAlign: 'right' },
  noResults: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 16 },
  btn: { backgroundColor: '#E8572A', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  text: { fontSize: 16, marginBottom: 20, textAlign: 'center' },
});
