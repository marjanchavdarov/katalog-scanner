import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, storeColors } from '../theme';

const API = 'https://botapp-u7qa.onrender.com';

function StoreBadge({ store, size = 36 }) {
  const bg = storeColors[store] || colors.primary;
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size/2, backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { fontSize: size * 0.38 }]}>
        {store?.charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  );
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function search(q) {
    if (!q || q.length < 2) { setResults([]); return; }
    setLoading(true);
    setSearched(true);
    try {
      const r = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}`);
      const data = await r.json();
      setResults(data.products || []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }

  async function saveProduct(product) {
    try {
      const existing = JSON.parse(await AsyncStorage.getItem('saved_products') || '[]');
      if (existing.some(e => e.barcode === product.ean)) return;
      const entry = {
        barcode: product.ean,
        name: product.name,
        brand: product.brand,
        prices: [{ store: product.cheapest_store, sale_price: product.cheapest_price }],
        saved_at: new Date().toISOString()
      };
      await AsyncStorage.setItem('saved_products', JSON.stringify([entry, ...existing]));
    } catch {}
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pretraži proizvode</Text>
        <Text style={styles.headerSub}>Usporedi cijene bez skeniranja</Text>
      </View>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.input}
          placeholder="npr. coca cola, mlijeko, kruh..."
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => search(query)}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.searchBtn} onPress={() => search(query)}>
        <Text style={styles.searchBtnText}>Pretraži</Text>
      </TouchableOpacity>

      {loading && (
        <View style={styles.loadWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadText}>Tražim cijene...</Text>
        </View>
      )}

      {!loading && searched && results.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🤷</Text>
          <Text style={styles.emptyTitle}>Nema rezultata</Text>
          <Text style={styles.emptySub}>Pokušaj s drugim pojmom</Text>
        </View>
      )}

      {!loading && !searched && (
        <View style={styles.hints}>
          <Text style={styles.hintsTitle}>Popularni pojmovi</Text>
          {['Coca Cola 2L', 'Mlijeko', 'Kruh', 'Jaja', 'Maslac'].map(hint => (
            <TouchableOpacity key={hint} style={styles.hint} onPress={() => { setQuery(hint); search(hint); }}>
              <Text style={styles.hintText}>🔍 {hint}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={item => item.ean}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
                {item.brand && <Text style={styles.cardBrand}>{item.brand}</Text>}
                {item.quantity && <Text style={styles.cardQty}>{item.quantity} {item.unit}</Text>}
              </View>
              <TouchableOpacity onPress={() => saveProduct(item)} style={styles.saveBtn}>
                <Text style={{ fontSize: 22 }}>🤍</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cardBottom}>
              <StoreBadge store={item.cheapest_store} size={32} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.cheapStore}>{item.cheapest_store?.toUpperCase()}</Text>
                <Text style={styles.storeCount}>{item.store_count} trgovina</Text>
              </View>
              <Text style={styles.cheapPrice}>{parseFloat(item.cheapest_price).toFixed(2)}€</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { padding: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.ink },
  headerSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, margin: 16, marginBottom: 8,
    paddingHorizontal: 12, borderWidth: 1.5, borderColor: colors.border,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.ink },
  clearBtn: { fontSize: 14, color: colors.muted, padding: 4 },
  searchBtn: {
    backgroundColor: colors.primary, marginHorizontal: 16,
    borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 8,
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadText: { color: colors.muted },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.ink },
  emptySub: { fontSize: 14, color: colors.muted, marginTop: 4 },
  hints: { padding: 16 },
  hintsTitle: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  hint: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  hintText: { fontSize: 15, color: colors.ink },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  cardTop: { flexDirection: 'row', marginBottom: 12 },
  cardName: { fontSize: 15, fontWeight: '700', color: colors.ink, lineHeight: 20 },
  cardBrand: { fontSize: 12, color: colors.muted, marginTop: 2 },
  cardQty: { fontSize: 12, color: colors.muted },
  saveBtn: { padding: 4 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  badge: { justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontWeight: '800' },
  cheapStore: { fontSize: 13, fontWeight: '700', color: colors.ink },
  storeCount: { fontSize: 11, color: colors.muted },
  cheapPrice: { fontSize: 20, fontWeight: '800', color: colors.primary },
});
