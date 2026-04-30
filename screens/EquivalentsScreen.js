import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, storeColors } from '../theme';

const API = 'https://botapp-u7qa.onrender.com';

export default function EquivalentsScreen({ barcode }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/equivalents/${barcode}`);
      setData(await r.json());
    } catch {}
    finally { setLoading(false); }
  }

  if (!data && !loading) return (
    <TouchableOpacity style={styles.trigger} onPress={load}>
      <Text style={styles.triggerText}>🔍 Nađi slične proizvode i usporedi po litri</Text>
    </TouchableOpacity>
  );

  if (loading) return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.loadText}>Tražim ekvivalente...</Text>
    </View>
  );

  if (!data?.equivalents?.length) return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>Nema sličnih proizvoda u bazi</Text>
    </View>
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Usporedba po litri — {data.brand}</Text>
      {data.equivalents.map((item, i) => (
        <View key={item.barcode} style={[styles.row, item.is_scanned && styles.rowScanned, i === 0 && styles.rowBest]}>
          <View style={[styles.badge, { backgroundColor: storeColors[item.cheapest_store] || colors.primary }]}>
            <Text style={styles.badgeText}>{item.cheapest_store?.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.mid}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.store}>{item.cheapest_store?.toUpperCase()} · {item.quantity}L</Text>
            {item.is_scanned && <Text style={styles.scannedTag}>SKENIRANI</Text>}
            {i === 0 && !item.is_scanned && <Text style={styles.bestTag}>NAJJEFTINIJE/L</Text>}
          </View>
          <View style={styles.right}>
            <Text style={[styles.unitPrice, i === 0 && styles.unitPriceBest]}>
              {item.unit_price ? `${item.unit_price.toFixed(2)}€/L` : '—'}
            </Text>
            <Text style={styles.totalPrice}>{item.cheapest_price.toFixed(2)}€</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: { backgroundColor: colors.primaryLight, borderRadius: 10, padding: 12, marginTop: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.primary + '30' },
  triggerText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  loadText: { color: colors.muted, fontSize: 13 },
  empty: { padding: 12 },
  emptyText: { color: colors.muted, fontSize: 13 },
  wrap: { marginTop: 8 },
  title: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: colors.border },
  rowScanned: { borderColor: colors.primary + '60', backgroundColor: colors.primaryLight },
  rowBest: { borderColor: '#10B981', backgroundColor: '#F0FDF4' },
  badge: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  mid: { flex: 1 },
  name: { fontSize: 13, fontWeight: '600', color: colors.ink },
  store: { fontSize: 11, color: colors.muted, marginTop: 2 },
  scannedTag: { fontSize: 10, color: colors.primary, fontWeight: '700', marginTop: 2 },
  bestTag: { fontSize: 10, color: '#10B981', fontWeight: '700', marginTop: 2 },
  right: { alignItems: 'flex-end' },
  unitPrice: { fontSize: 15, fontWeight: '800', color: colors.ink },
  unitPriceBest: { color: '#10B981' },
  totalPrice: { fontSize: 11, color: colors.muted, marginTop: 2 },
});
