import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const API = 'https://botapp-u7qa.onrender.com';

export default function SavedScreen() {
  const [tab, setTab] = useState('saved');
  const [saved, setSaved] = useState([]);
  const [history, setHistory] = useState([]);
  const [rescanning, setRescanning] = useState(null);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  async function loadData() {
    try {
      setSaved(JSON.parse(await AsyncStorage.getItem('saved_products') || '[]'));
      setHistory(JSON.parse(await AsyncStorage.getItem('scan_history') || '[]'));
    } catch (e) {}
  }

  async function rescan(barcode) {
    setRescanning(barcode);
    try {
      const u = await AsyncStorage.getItem('user');
      const phone = u ? JSON.parse(u).phone : null;
      const phoneParam = phone ? `?phone=${encodeURIComponent(phone)}` : '';
      const r = await fetch(`${API}/api/barcode/${barcode}${phoneParam}`);
      const json = await r.json();
      
      // Update saved products with fresh prices
      const existing = JSON.parse(await AsyncStorage.getItem('saved_products') || '[]');
      const updated = existing.map(e => e.barcode === barcode ? { ...e, prices: json.prices, rescanned_at: new Date().toISOString() } : e);
      await AsyncStorage.setItem('saved_products', JSON.stringify(updated));
      setSaved(updated);

      // Add to history
      const hist = JSON.parse(await AsyncStorage.getItem('scan_history') || '[]');
      const newHist = [{ barcode: json.barcode, name: json.name, brand: json.brand, prices: json.prices, scanned_at: new Date().toISOString() }, ...hist.filter(e => e.barcode !== barcode)].slice(0, 50);
      await AsyncStorage.setItem('scan_history', JSON.stringify(newHist));
      setHistory(newHist);
    } catch (e) {} finally {
      setRescanning(null);
    }
  }

  async function removeSaved(barcode) {
    const updated = saved.filter(e => e.barcode !== barcode);
    setSaved(updated);
    await AsyncStorage.setItem('saved_products', JSON.stringify(updated));
  }

  function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

  const renderProduct = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name || 'Nepoznat'}</Text>
          {item.brand ? <Text style={styles.brand}>{item.brand}</Text> : null}
          {item.rescanned_at && <Text style={styles.time}>Ažurirano {timeAgo(item.rescanned_at)} ago</Text>}
        </View>
        <View style={styles.actions}>
          {tab === 'saved' && (
            <>
              <TouchableOpacity onPress={() => rescan(item.barcode)} style={styles.rescanBtn}>
                {rescanning === item.barcode
                  ? <ActivityIndicator size="small" color="#E8572A" />
                  : <Text style={styles.rescanText}>🔄</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeSaved(item.barcode)} style={styles.removeBtn}>
                <Text style={{ fontSize: 18 }}>❤️</Text>
              </TouchableOpacity>
            </>
          )}
          {tab === 'history' && (
            <Text style={styles.time}>{timeAgo(item.scanned_at)}</Text>
          )}
        </View>
      </View>

      {item.prices && item.prices.length > 0 ? (
        <>
          <View style={[styles.priceRow, styles.cheapest]}>
            <Text style={styles.storeName}>{item.prices[0].store.toUpperCase()}</Text>
            <Text style={styles.price}>{item.prices[0].sale_price}€</Text>
          </View>
          {item.prices.slice(1, 3).map((p, i) => (
            <View key={i} style={styles.priceRow}>
              <Text style={styles.storeNameMuted}>{p.store.toUpperCase()}</Text>
              <Text style={styles.priceMuted}>{p.sale_price}€</Text>
            </View>
          ))}
          {item.prices.length > 3 && (
            <Text style={styles.moreStores}>+{item.prices.length - 3} više trgovina</Text>
          )}
        </>
      ) : (
        <Text style={styles.noPrice}>Nema cijena</Text>
      )}
    </View>
  );

  const data = tab === 'saved' ? saved : history;

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'saved' && styles.activeTab]} onPress={() => setTab('saved')}>
          <Text style={[styles.tabText, tab === 'saved' && styles.activeTabText]}>❤️ Spremljeno ({saved.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'history' && styles.activeTab]} onPress={() => setTab('history')}>
          <Text style={[styles.tabText, tab === 'history' && styles.activeTabText]}>🕐 Povijest ({history.length})</Text>
        </TouchableOpacity>
      </View>

      {data.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>{tab === 'saved' ? '🤍' : '🕐'}</Text>
          <Text style={styles.emptyTitle}>{tab === 'saved' ? 'Nema spremljenih' : 'Nema povijesti'}</Text>
          <Text style={styles.emptySub}>Skeniraj proizvode da ih vidiš ovdje</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.barcode + (item.scanned_at || '')}
          renderItem={renderProduct}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={loadData} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, padding: 14, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#E8572A' },
  tabText: { fontSize: 14, color: '#888', fontWeight: '500' },
  activeTabText: { color: '#E8572A', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  name: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  brand: { fontSize: 13, color: '#888', marginTop: 2 },
  time: { fontSize: 11, color: '#aaa', marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rescanBtn: { padding: 6 },
  rescanText: { fontSize: 20 },
  removeBtn: { padding: 6 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, marginBottom: 4 },
  cheapest: { backgroundColor: '#FFF3EF' },
  storeName: { fontSize: 14, color: '#E8572A', fontWeight: '700' },
  storeNameMuted: { fontSize: 13, color: '#555', fontWeight: '600' },
  price: { fontSize: 16, fontWeight: 'bold', color: '#E8572A' },
  priceMuted: { fontSize: 14, color: '#555' },
  moreStores: { fontSize: 12, color: '#aaa', marginTop: 4, textAlign: 'right' },
  noPrice: { fontSize: 13, color: '#aaa' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#888', textAlign: 'center' },
});
