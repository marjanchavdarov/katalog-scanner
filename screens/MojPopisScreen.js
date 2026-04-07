import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, SafeAreaView, StatusBar,
  Modal, ScrollView, Vibration, Alert, Image, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { colors, storeColors } from '../theme';

const API = 'https://botapp-u7qa.onrender.com';
const ALL_STORES = ['lidl','konzum','kaufland','spar','studenac','tommy','plodine','eurospin','dm','ktc','metro','ntl','ribola','roto','trgocentar','brodokomerc','lorenco','boso','vrutak','zabac','jadranka_trgovina','trgovina_krk'];
const STORE_DISPLAY = { lidl:'Lidl', konzum:'Konzum', kaufland:'Kaufland', spar:'Spar', studenac:'Studenac', tommy:'Tommy', plodine:'Plodine', eurospin:'Eurospin', dm:'dm', ktc:'KTC', metro:'Metro', ntl:'NTL', ribola:'Ribola', roto:'Roto', trgocentar:'Trgocentar', brodokomerc:'Brodokomerc', lorenco:'Lorenco', boso:'Boso', vrutak:'Vrutak', zabac:'Žabac', jadranka_trgovina:'Jadranka', trgovina_krk:'Trg. Krk' };
const MEDALS = ['🥇','🥈','🥉'];

async function fetchProductImage(ean) {
  try {
    const r = await fetch(`${API}/api/image/${ean}`);
    const data = await r.json();
    return data.url || null;
  } catch { return null; }
}

function StoreBadge({ store, size = 40 }) {
  const key = (store || '').toLowerCase().replace(/[\s_]+/g, '');
  const bg = storeColors[key] || '#64748B';
  return (
    <View style={{ width: size, height: size, borderRadius: 10, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: size * 0.3, letterSpacing: 0.5 }}>
        {(store || '').slice(0, 3).toUpperCase()}
      </Text>
    </View>
  );
}

function ProductImage({ ean, size = 56 }) {
  const [url, setUrl] = useState(null);
  useEffect(() => { fetchProductImage(ean).then(u => { if (u) setUrl(u); }); }, [ean]);
  return (
    <View style={{ width: size, height: size, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {url
        ? <Image source={{ uri: url }} style={{ width: size, height: size }} resizeMode="contain" />
        : <Text style={{ fontSize: size * 0.5 }}>🛒</Text>
      }
    </View>
  );
}

export default function MojPopisScreen({ navigation }) {
  const [lists, setLists] = useState([]);
  const [activeList, setActiveList] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showStores, setShowStores] = useState(false);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [basketResult, setBasketResult] = useState(null);
  const [enabledStores, setEnabledStores] = useState(ALL_STORES);
  const [expandedCard, setExpandedCard] = useState(null);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  async function loadData() {
    const l = JSON.parse(await AsyncStorage.getItem('shopping_lists') || '[]');
    const s = JSON.parse(await AsyncStorage.getItem('enabled_stores') || JSON.stringify(ALL_STORES));
    setLists(l); setEnabledStores(s);
    if (l.length > 0 && !activeList) setActiveList(l[0]);
    else if (activeList) { const u = l.find(x => x.id === activeList.id); if (u) setActiveList(u); }
  }

  async function saveStores(stores) { setEnabledStores(stores); await AsyncStorage.setItem('enabled_stores', JSON.stringify(stores)); }

  async function createList(name) {
    if (!name.trim()) return;
    const newList = { id: Date.now().toString(), name: name.trim(), items: [], created: new Date().toISOString() };
    const updated = [newList, ...lists];
    setLists(updated); setActiveList(newList);
    await AsyncStorage.setItem('shopping_lists', JSON.stringify(updated));
    setNewListName(''); setShowNewList(false);
  }

  async function deleteList(id) {
    const updated = lists.filter(l => l.id !== id);
    setLists(updated); setActiveList(updated[0] || null);
    await AsyncStorage.setItem('shopping_lists', JSON.stringify(updated));
  }

  async function addItem(ean, name, brand, quantity, unit) {
    if (!activeList) { Alert.alert('Kreiraj popis', 'Najprije kreiraj popis.', [{ text: 'Kreiraj', onPress: () => setShowNewList(true) }]); return; }
    const item = { ean, name, brand, quantity: 1, size: `${quantity || ''} ${unit || ''}`.trim(), added: new Date().toISOString() };
    const updatedItems = [...(activeList.items || []).filter(i => i.ean !== ean), item];
    const updatedList = { ...activeList, items: updatedItems };
    const updatedLists = lists.map(l => l.id === activeList.id ? updatedList : l);
    setActiveList(updatedList); setLists(updatedLists);
    await AsyncStorage.setItem('shopping_lists', JSON.stringify(updatedLists));
    Vibration.vibrate(50); setShowSearch(false); setSearchResults([]); setSearchQuery('');
  }

  async function updateQty(ean, delta) {
    const updatedItems = (activeList.items || []).map(i => i.ean === ean ? { ...i, quantity: Math.max(1, (i.quantity || 1) + delta) } : i);
    const updatedList = { ...activeList, items: updatedItems };
    const updatedLists = lists.map(l => l.id === activeList.id ? updatedList : l);
    setActiveList(updatedList); setLists(updatedLists);
    await AsyncStorage.setItem('shopping_lists', JSON.stringify(updatedLists));
  }

  async function removeItem(ean) {
    const updatedItems = (activeList.items || []).filter(i => i.ean !== ean);
    const updatedList = { ...activeList, items: updatedItems };
    const updatedLists = lists.map(l => l.id === activeList.id ? updatedList : l);
    setActiveList(updatedList); setLists(updatedLists);
    await AsyncStorage.setItem('shopping_lists', JSON.stringify(updatedLists));
  }

  async function searchProducts(q) {
    if (!q || q.length < 2) return;
    setSearching(true);
    try { const r = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}&ai=0`); const data = await r.json(); setSearchResults(data.products || []); }
    catch { setSearchResults([]); } finally { setSearching(false); }
  }

  async function calculate() {
    if (!activeList?.items?.length) return;
    setCalculating(true); setBasketResult(null); setExpandedCard(null);
    try {
      const totalItems = activeList.items.length;
      const itemPrices = {};
      for (const item of activeList.items) {
        try {
          const r = await fetch(`${API}/api/barcode/${item.ean}`);
          const data = await r.json();
          itemPrices[item.ean] = { name: item.name, qty: item.quantity || 1, prices: (data.prices || []).filter(p => enabledStores.includes(p.store)) };
        } catch {}
      }
      const storeMap = {};
      for (const [ean, data] of Object.entries(itemPrices)) {
        for (const p of data.prices) {
          const store = p.store; const price = parseFloat(p.sale_price || 0);
          if (!storeMap[store]) storeMap[store] = { total: 0, items: [], found: 0 };
          if (!storeMap[store].items.find(i => i.ean === ean)) {
            storeMap[store].total += price * data.qty;
            storeMap[store].found += 1;
            storeMap[store].items.push({ ean, name: data.name, qty: data.qty, price });
          }
        }
      }
      const singleStore = Object.entries(storeMap).map(([store, data]) => ({
        store, found: data.found, total: totalItems, subtotal: data.total,
        items: activeList.items.map(item => {
          const match = data.items.find(i => i.ean === item.ean);
          return match ? { name: item.name, price: match.price, qty: match.qty, matched: true } : { name: item.name, price: null, matched: false };
        }),
      })).sort((a, b) => b.found - a.found || a.subtotal - b.subtotal);

      const assignment = {};
      for (const [ean, data] of Object.entries(itemPrices)) {
        if (!data.prices.length) continue;
        const cheapest = data.prices[0];
        assignment[ean] = { store: cheapest.store, price: parseFloat(cheapest.sale_price), name: data.name, qty: data.qty };
      }
      const multiStores = {};
      let multiTotal = 0;
      for (const [ean, info] of Object.entries(assignment)) {
        if (!multiStores[info.store]) multiStores[info.store] = { subtotal: 0, items: [] };
        multiStores[info.store].subtotal += info.price * info.qty;
        multiStores[info.store].items.push({ name: info.name, price: info.price, qty: info.qty });
        multiTotal += info.price * info.qty;
      }
      setBasketResult({
        single_store: singleStore,
        multi_store: { total: multiTotal, found: Object.keys(assignment).length, total_requested: totalItems, store_count: Object.keys(multiStores).length, stores: Object.entries(multiStores).map(([store, data]) => ({ store, subtotal: data.subtotal, items: data.items })).sort((a, b) => b.subtotal - a.subtotal) },
        not_found: activeList.items.filter(item => !itemPrices[item.ean]?.prices?.length).map(item => item.name),
        total_requested: totalItems,
      });
    } catch (e) { Alert.alert('Greška', 'Nije moguće dohvatiti cijene.'); }
    finally { setCalculating(false); }
  }

  function SingleStoreCard({ store, rank }) {
    const isExpanded = expandedCard === `single-${rank}`;
    const storeKey = (store.store || '').toLowerCase().replace(/[\s_]+/g, '');
    const storeColor = storeColors[storeKey] || '#64748B';
    const isFirst = rank === 0;
    const label = STORE_DISPLAY[storeKey] || store.store;
    return (
      <View style={[styles.resultCard, { borderColor: isFirst ? storeColor : colors.border, borderWidth: isFirst ? 2 : 1 }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => setExpandedCard(isExpanded ? null : `single-${rank}`)}>
          <View style={[styles.cardHeader, isFirst && { backgroundColor: storeColor, margin: -1, padding: 14, borderRadius: 13 }]}>
            <Text style={{ fontSize: 22 }}>{MEDALS[rank] || '🏪'}</Text>
            <StoreBadge store={storeKey} size={38} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardStoreName, isFirst && { color: '#fff' }]}>{label}</Text>
              <Text style={[styles.cardSub, isFirst && { color: 'rgba(255,255,255,0.75)' }]}>{store.found}/{store.total} proizvoda</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.cardTotal, isFirst && { color: '#fff' }]}>{store.subtotal.toFixed(2)}€</Text>
              <Text style={{ color: isFirst ? 'rgba(255,255,255,0.6)' : colors.muted, fontSize: 11 }}>{isExpanded ? '▲' : '▼'}</Text>
            </View>
          </View>
        </TouchableOpacity>
        {isExpanded && store.items.map((it, idx) => (
          <View key={idx} style={styles.itemLine}>
            <Text style={[styles.itemLineName, !it.matched && { color: colors.muted }]} numberOfLines={1}>{it.qty > 1 ? `${it.qty}× ` : ''}{it.name}</Text>
            {it.matched ? <Text style={styles.itemLinePrice}>{(it.price * it.qty).toFixed(2)}€</Text> : <Text style={styles.itemLineNA}>—</Text>}
          </View>
        ))}
      </View>
    );
  }

  function MultiStoreCard({ combo }) {
    const isExpanded = expandedCard === 'multi';
    const bestSingle = basketResult?.single_store?.[0];
    const savings = bestSingle ? (bestSingle.subtotal - combo.total).toFixed(2) : null;
    return (
      <View style={[styles.resultCard, { borderColor: colors.primary, borderWidth: 2 }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => setExpandedCard(isExpanded ? null : 'multi')}>
          <View style={[styles.cardHeader, { backgroundColor: colors.primary, margin: -1, padding: 14, borderRadius: 13 }]}>
            <Image source={require('../assets/stedko-happy.png')} style={{ width: 36, height: 36 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardStoreName, { color: '#fff' }]}>Maksimalna ušteda · {combo.store_count} {combo.store_count === 2 ? 'trgovine' : 'trgovina'}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>{combo.found}/{combo.total_requested} pronađeno</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.cardTotal, { color: '#fff' }]}>{combo.total.toFixed(2)}€</Text>
              {savings && parseFloat(savings) > 0 && <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700' }}>ušteda {savings}€</Text>}
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{isExpanded ? '▲' : '▼'}</Text>
            </View>
          </View>
        </TouchableOpacity>
        {isExpanded && combo.stores.map((st, si) => {
          const stkey = (st.store || '').toLowerCase().replace(/[\s_]+/g, '');
          const stcolor = storeColors[stkey] || '#64748B';
          return (
            <View key={si} style={[styles.storeSection, { borderLeftColor: stcolor }]}>
              <View style={styles.storeSectionHeader}>
                <StoreBadge store={stkey} size={28} />
                <Text style={styles.storeSectionName}>{STORE_DISPLAY[stkey] || st.store}</Text>
                <Text style={[styles.storeSectionTotal, { color: stcolor }]}>{st.subtotal.toFixed(2)}€</Text>
              </View>
              {st.items.map((it, idx) => (
                <View key={idx} style={styles.itemLine}>
                  <Text style={styles.itemLineName} numberOfLines={1}>{it.qty > 1 ? `${it.qty}× ` : ''}{it.name}</Text>
                  <Text style={styles.itemLinePrice}>{(it.price * it.qty).toFixed(2)}€</Text>
                </View>
              ))}
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Moj Popis</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowStores(true)}><Text style={styles.headerBtnText}>🏪 Trgovine</Text></TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowNewList(true)}><Text style={styles.headerBtnText}>+ Novi</Text></TouchableOpacity>
        </View>
      </View>

      {lists.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.listTabs} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {lists.map(list => (
            <TouchableOpacity key={list.id} style={[styles.listTab, activeList?.id === list.id && styles.listTabActive]}
              onPress={() => { setActiveList(list); setBasketResult(null); setExpandedCard(null); }}>
              <Text style={[styles.listTabText, activeList?.id === list.id && styles.listTabTextActive]}>{list.name} ({list.items?.length || 0})</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {lists.length === 0 && (
        <View style={styles.empty}>
          <Image source={require('../assets/stedko-sad.png')} style={styles.emptyMascot} />
          <Text style={styles.emptyTitle}>Tvoja lista je prazna</Text>
          <Text style={styles.emptySub}>Skeniraj proizvod ili ga ručno dodaj</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowNewList(true)}>
            <Text style={styles.createBtnText}>Kreiraj prvi popis</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeList && (
        <FlatList
          data={activeList.items || []}
          keyExtractor={item => item.ean}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          ListHeaderComponent={() => (
            <View style={styles.listHeader}>
              <Text style={styles.listName}>{activeList.name}</Text>
              <TouchableOpacity onPress={() => Alert.alert('Obriši popis', `Obriši "${activeList.name}"?`, [{ text: 'Odustani' }, { text: 'Obriši', style: 'destructive', onPress: () => deleteList(activeList.id) }])}>
                <Text style={{ color: '#EF4444', fontSize: 13 }}>Obriši</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: colors.muted, fontSize: 14 }}>Popis je prazan — dodaj proizvode</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <ProductImage ean={item.ean} size={56} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                {item.brand && <Text style={styles.itemBrand}>{item.brand}</Text>}
                <Text style={styles.itemSize}>{item.size}</Text>
              </View>
              <View style={styles.qtyRow}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.ean, -1)}><Text style={styles.qtyBtnText}>−</Text></TouchableOpacity>
                <Text style={styles.qty}>{item.quantity || 1}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.ean, 1)}><Text style={styles.qtyBtnText}>+</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => removeItem(item.ean)} style={{ marginLeft: 6 }}><Text style={{ color: '#EF4444', fontSize: 20 }}>×</Text></TouchableOpacity>
              </View>
            </View>
          )}
          ListFooterComponent={() => activeList?.items?.length > 0 && (
            <View>
              <TouchableOpacity style={styles.calcBtn} onPress={calculate} disabled={calculating}>
                {calculating ? <ActivityIndicator color="#fff" /> : <Text style={styles.calcBtnText}>💰 Izračunaj najjeftinije</Text>}
              </TouchableOpacity>
              {calculating && <Text style={styles.calcHint}>Dohvaćam cijene za {activeList.items.length} proizvoda...</Text>}
              {basketResult && (
                <View style={styles.resultWrap}>
                  {basketResult.single_store?.length > 0 && (
                    <View>
                      <Text style={styles.sectionLabel}>JEDNA TRGOVINA</Text>
                      {basketResult.single_store.slice(0, 3).map((s, i) => <SingleStoreCard key={s.store} store={s} rank={i} />)}
                    </View>
                  )}
                  {basketResult.multi_store?.store_count > 1 && (
                    <View style={{ marginTop: 16 }}>
                      <Text style={styles.sectionLabel}>VIŠE TRGOVINA</Text>
                      <MultiStoreCard combo={basketResult.multi_store} />
                    </View>
                  )}
                  {basketResult.not_found?.length > 0 && (
                    <Text style={styles.notFoundText}>Nije pronađeno: {basketResult.not_found.join(', ')}</Text>
                  )}
                </View>
              )}
            </View>
          )}
        />
      )}

      {activeList && (
        <View style={styles.addBar}>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowSearch(true)}>
            <Text style={styles.addBtnText}>+ Dodaj proizvod</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={showSearch} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalWrap}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Dodaj u popis</Text>
            <TouchableOpacity onPress={() => { setShowSearch(false); setSearchResults([]); setSearchQuery(''); }}><Text style={styles.modalClose}>Zatvori</Text></TouchableOpacity>
          </View>
          <View style={styles.searchBox}>
            <TextInput style={styles.searchInput} placeholder="Pretraži po imenu..." value={searchQuery} onChangeText={setSearchQuery} onSubmitEditing={() => searchProducts(searchQuery)} returnKeyType="search" autoFocus />
            <TouchableOpacity style={styles.searchGoBtn} onPress={() => searchProducts(searchQuery)}><Text style={styles.searchGoBtnText}>Traži</Text></TouchableOpacity>
          </View>
          {searching && <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />}
          <FlatList data={searchResults} keyExtractor={item => item.ean} contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.searchResultCard} onPress={() => addItem(item.ean, item.name, item.brand, item.quantity, item.unit)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchResultName} numberOfLines={2}>{item.name}</Text>
                  {item.brand && <Text style={styles.searchResultBrand}>{item.brand}</Text>}
                  <Text style={styles.searchResultQty}>{item.quantity} {item.unit} · {item.store_count} trgovina</Text>
                </View>
                <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                  <Text style={styles.searchResultPrice}>{parseFloat(item.cheapest_price).toFixed(2)}€</Text>
                  <Text style={styles.searchResultAdd}>+ Dodaj</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      <Modal visible={showStores} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalWrap}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Dostupne trgovine</Text>
            <TouchableOpacity onPress={() => setShowStores(false)}><Text style={styles.modalClose}>Gotovo</Text></TouchableOpacity>
          </View>
          <Text style={{ fontSize: 13, color: colors.muted, paddingHorizontal: 16, paddingBottom: 8 }}>Odaberi samo trgovine koje imaš u svom gradu</Text>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <TouchableOpacity style={styles.storeSelectAll} onPress={() => saveStores(ALL_STORES)}><Text style={styles.storeSelectAllText}>Odaberi sve</Text></TouchableOpacity>
            {ALL_STORES.map(store => {
              const enabled = enabledStores.includes(store);
              return (
                <TouchableOpacity key={store} style={styles.storeRow} onPress={() => saveStores(enabled ? enabledStores.filter(s => s !== store) : [...enabledStores, store])}>
                  <StoreBadge store={store} size={36} />
                  <Text style={styles.storeRowName}>{STORE_DISPLAY[store] || store.toUpperCase()}</Text>
                  <View style={[styles.storeCheck, enabled && styles.storeCheckActive]}>{enabled && <Text style={styles.storeCheckMark}>✓</Text>}</View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showNewList} animationType="fade" transparent>
        <View style={styles.newListOverlay}>
          <View style={styles.newListBox}>
            <Text style={styles.newListTitle}>Novi popis</Text>
            <TextInput style={styles.newListInput} placeholder="npr. Tjedna nabava..." value={newListName} onChangeText={setNewListName} autoFocus onSubmitEditing={() => createList(newListName)} />
            <View style={styles.newListBtns}>
              <TouchableOpacity style={styles.newListCancel} onPress={() => { setShowNewList(false); setNewListName(''); }}><Text style={{ color: colors.muted, fontWeight: '600' }}>Odustani</Text></TouchableOpacity>
              <TouchableOpacity style={styles.newListCreate} onPress={() => createList(newListName)}><Text style={{ color: '#fff', fontWeight: '700' }}>Kreiraj</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.ink },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.border },
  headerBtnText: { fontSize: 13, fontWeight: '600', color: colors.ink },
  listTabs: { maxHeight: 48, paddingVertical: 4 },
  listTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  listTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  listTabText: { fontSize: 13, fontWeight: '600', color: colors.ink },
  listTabTextActive: { color: '#fff' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyMascot: { width: 180, height: 180, marginBottom: 16 },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  emptySub: { fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: 28 },
  createBtn: { backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 16, borderRadius: 16 },
  createBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  listName: { fontSize: 18, fontWeight: '700', color: colors.ink },
  itemCard: { backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: 2 },
  itemBrand: { fontSize: 12, color: colors.muted },
  itemSize: { fontSize: 11, color: '#CBD5E1', marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { fontSize: 18, fontWeight: '700', color: colors.primary },
  qty: { fontSize: 16, fontWeight: '700', color: colors.ink, minWidth: 22, textAlign: 'center' },
  calcBtn: { backgroundColor: colors.primary, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 8, marginBottom: 8 },
  calcBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  calcHint: { fontSize: 12, color: colors.muted, textAlign: 'center', marginBottom: 12 },
  addBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
  addBtn: { backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: colors.primary },
  addBtnText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  resultWrap: { marginTop: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  resultCard: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  cardStoreName: { fontSize: 15, fontWeight: '700', color: colors.ink },
  cardSub: { fontSize: 11, color: colors.muted, marginTop: 1 },
  cardTotal: { fontSize: 20, fontWeight: '800', color: colors.ink },
  itemLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  itemLineName: { fontSize: 13, color: colors.ink, flex: 1, paddingRight: 8 },
  itemLinePrice: { fontSize: 13, fontWeight: '700', color: colors.ink },
  itemLineNA: { fontSize: 12, color: colors.muted },
  storeSection: { borderLeftWidth: 3, marginHorizontal: 12, marginBottom: 8, borderRadius: 4 },
  storeSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8 },
  storeSectionName: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.ink },
  storeSectionTotal: { fontSize: 14, fontWeight: '800' },
  notFoundText: { fontSize: 12, color: colors.muted, padding: 8, textAlign: 'center' },
  modalWrap: { flex: 1, backgroundColor: colors.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.ink },
  modalClose: { fontSize: 16, color: colors.primary, fontWeight: '600' },
  searchBox: { flexDirection: 'row', margin: 16, gap: 8 },
  searchInput: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: colors.border },
  searchGoBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  searchGoBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  searchResultCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  searchResultName: { fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: 2 },
  searchResultBrand: { fontSize: 12, color: colors.muted },
  searchResultQty: { fontSize: 11, color: '#CBD5E1', marginTop: 2 },
  searchResultPrice: { fontSize: 16, fontWeight: '800', color: colors.primary },
  searchResultAdd: { fontSize: 12, color: colors.primary, fontWeight: '600', marginTop: 4 },
  storeSelectAll: { backgroundColor: colors.primaryLight, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 12 },
  storeSelectAllText: { color: colors.primary, fontWeight: '700' },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  storeRowName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink },
  storeCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  storeCheckActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  storeCheckMark: { color: '#fff', fontWeight: '800', fontSize: 14 },
  newListOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  newListBox: { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  newListTitle: { fontSize: 20, fontWeight: '700', color: colors.ink, marginBottom: 16 },
  newListInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 16 },
  newListBtns: { flexDirection: 'row', gap: 10 },
  newListCancel: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  newListCreate: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
});
