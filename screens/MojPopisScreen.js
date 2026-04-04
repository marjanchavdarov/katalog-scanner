import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, SafeAreaView, StatusBar,
  Modal, ScrollView, Vibration, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { colors, storeColors } from '../theme';

const API = 'https://botapp-u7qa.onrender.com';

const ALL_STORES = ['lidl','konzum','kaufland','spar','studenac','tommy','plodine','eurospin','dm','ktc','metro','ntl','ribola','roto','trgocentar','brodokomerc','lorenco','boso','vrutak','zabac','jadranka_trgovina','trgovina_krk'];

function StoreBadge({ store, size = 32 }) {
  const bg = storeColors[store] || colors.primary;
  return (
    <View style={[{ width: size, height: size, borderRadius: size/2, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ color: '#1A1A1A', fontWeight: '800', fontSize: size * 0.38 }}>
        {store?.charAt(0).toUpperCase()}
      </Text>
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

  useFocusEffect(useCallback(() => { loadData(); }, []));

  async function loadData() {
    const l = JSON.parse(await AsyncStorage.getItem('shopping_lists') || '[]');
    const s = JSON.parse(await AsyncStorage.getItem('enabled_stores') || JSON.stringify(ALL_STORES));
    setLists(l);
    setEnabledStores(s);
    if (l.length > 0 && !activeList) setActiveList(l[0]);
    else if (activeList) {
      const updated = l.find(x => x.id === activeList.id);
      if (updated) setActiveList(updated);
    }
  }

  async function saveStores(stores) {
    setEnabledStores(stores);
    await AsyncStorage.setItem('enabled_stores', JSON.stringify(stores));
  }

  async function createList(name) {
    if (!name.trim()) return;
    const newList = { id: Date.now().toString(), name: name.trim(), items: [], created: new Date().toISOString() };
    const updated = [newList, ...lists];
    setLists(updated);
    setActiveList(newList);
    await AsyncStorage.setItem('shopping_lists', JSON.stringify(updated));
    setNewListName('');
    setShowNewList(false);
  }

  async function deleteList(id) {
    const updated = lists.filter(l => l.id !== id);
    setLists(updated);
    setActiveList(updated[0] || null);
    await AsyncStorage.setItem('shopping_lists', JSON.stringify(updated));
  }

  async function addItem(ean, name, brand, quantity, unit) {
    if (!activeList) {
      Alert.alert('Kreiraj popis', 'Najprije kreiraj popis pa dodaj proizvode.', [
        { text: 'Kreiraj', onPress: () => setShowNewList(true) }
      ]);
      return;
    }
    const item = { ean, name, brand, quantity: 1, size: `${quantity || ''} ${unit || ''}`.trim(), added: new Date().toISOString() };
    const updatedItems = [...(activeList.items || []).filter(i => i.ean !== ean), item];
    const updatedList = { ...activeList, items: updatedItems };
    const updatedLists = lists.map(l => l.id === activeList.id ? updatedList : l);
    setActiveList(updatedList);
    setLists(updatedLists);
    await AsyncStorage.setItem('shopping_lists', JSON.stringify(updatedLists));
    Vibration.vibrate(50);
    setShowSearch(false);
    setSearchResults([]);
    setSearchQuery('');
  }

  async function updateQty(ean, delta) {
    const updatedItems = (activeList.items || []).map(i =>
      i.ean === ean ? { ...i, quantity: Math.max(1, (i.quantity || 1) + delta) } : i
    );
    const updatedList = { ...activeList, items: updatedItems };
    const updatedLists = lists.map(l => l.id === activeList.id ? updatedList : l);
    setActiveList(updatedList);
    setLists(updatedLists);
    await AsyncStorage.setItem('shopping_lists', JSON.stringify(updatedLists));
  }

  async function removeItem(ean) {
    const updatedItems = (activeList.items || []).filter(i => i.ean !== ean);
    const updatedList = { ...activeList, items: updatedItems };
    const updatedLists = lists.map(l => l.id === activeList.id ? updatedList : l);
    setActiveList(updatedList);
    setLists(updatedLists);
    await AsyncStorage.setItem('shopping_lists', JSON.stringify(updatedLists));
  }

  async function searchProducts(q) {
    if (!q || q.length < 2) return;
    setSearching(true);
    try {
      const r = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}&ai=0`);
      const data = await r.json();
      setSearchResults(data.products || []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  }

  async function calculate() {
    if (!activeList?.items?.length) return;
    setCalculating(true);
    setBasketResult(null);
    try {
      // Fetch prices for each barcode from cijene.dev
      const itemPrices = {};
      for (const item of activeList.items) {
        const r = await fetch(`${API}/api/barcode/${item.ean}`);
        const data = await r.json();
        itemPrices[item.ean] = {
          name: item.name,
          qty: item.quantity || 1,
          prices: (data.prices || []).filter(p => enabledStores.includes(p.store))
        };
      }

      // Calculate per store totals
      const storeTotals = {};
      const storeItems = {};
      
      for (const [ean, data] of Object.entries(itemPrices)) {
        for (const price of data.prices) {
          if (!storeTotals[price.store]) { storeTotals[price.store] = 0; storeItems[price.store] = []; }
          storeTotals[price.store] += parseFloat(price.sale_price) * data.qty;
          storeItems[price.store].push({ name: data.name, qty: data.qty, price: parseFloat(price.sale_price) });
        }
      }

      // Only stores with ALL items
      const totalItems = activeList.items.length;
      const completeStores = Object.entries(storeTotals)
        .filter(([store]) => storeItems[store].length === totalItems)
        .sort((a, b) => a[1] - b[1]);

      // Best single store
      const bestSingle = completeStores[0];

      // Absolute cheapest (best price per item from any store)
      let absoluteTotal = 0;
      const absoluteStores = {};
      for (const [ean, data] of Object.entries(itemPrices)) {
        if (!data.prices.length) continue;
        const cheapest = data.prices.sort((a,b) => parseFloat(a.sale_price) - parseFloat(b.sale_price))[0];
        absoluteTotal += parseFloat(cheapest.sale_price) * data.qty;
        if (!absoluteStores[cheapest.store]) absoluteStores[cheapest.store] = { total: 0, items: [] };
        absoluteStores[cheapest.store].total += parseFloat(cheapest.sale_price) * data.qty;
        absoluteStores[cheapest.store].items.push({ name: data.name, qty: data.qty, price: parseFloat(cheapest.sale_price) });
      }

      setBasketResult({
        bestSingle: bestSingle ? { store: bestSingle[0], total: bestSingle[1], items: storeItems[bestSingle[0]] } : null,
        absolute: { total: absoluteTotal, stores: absoluteStores },
        allStores: completeStores.slice(0, 5),
        savings: bestSingle ? (completeStores[completeStores.length-1]?.[1] - bestSingle[1]).toFixed(2) : null
      });
    } catch (e) { console.error(e); }
    finally { setCalculating(false); }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Moj Popis</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowStores(true)}>
            <Text style={styles.headerBtnText}>🏪 Trgovine</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowNewList(true)}>
            <Text style={styles.headerBtnText}>+ Novi</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List tabs */}
      {lists.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.listTabs} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {lists.map(list => (
            <TouchableOpacity key={list.id}
              style={[styles.listTab, activeList?.id === list.id && styles.listTabActive]}
              onPress={() => { setActiveList(list); setBasketResult(null); }}>
              <Text style={[styles.listTabText, activeList?.id === list.id && styles.listTabTextActive]}>
                {list.name} ({list.items?.length || 0})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Empty state */}
      {lists.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Nema popisa još</Text>
          <Text style={styles.emptySub}>Kreiraj popis i dodaj proizvode skeniranjem</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowNewList(true)}>
            <Text style={styles.createBtnText}>Kreiraj prvi popis</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Active list items */}
      {activeList && (
        <FlatList
          data={activeList.items || []}
          keyExtractor={item => item.ean}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          ListHeaderComponent={() => (
            <View style={styles.listHeader}>
              <Text style={styles.listName}>{activeList.name}</Text>
              <TouchableOpacity onPress={() => Alert.alert('Obriši popis', `Obriši "${activeList.name}"?`, [
                { text: 'Odustani' },
                { text: 'Obriši', style: 'destructive', onPress: () => deleteList(activeList.id) }
              ])}>
                <Text style={{ color: '#EF4444', fontSize: 13 }}>Obriši</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyList}>
              <Text style={styles.emptyListText}>Popis je prazan — dodaj proizvode</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                {item.brand && <Text style={styles.itemBrand}>{item.brand}</Text>}
                <Text style={styles.itemSize}>{item.size} · #{item.ean}</Text>
              </View>
              <View style={styles.qtyRow}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.ean, -1)}>
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qty}>{item.quantity || 1}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.ean, 1)}>
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeItem(item.ean)} style={{ marginLeft: 8 }}>
                  <Text style={{ color: '#EF4444', fontSize: 18 }}>×</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListFooterComponent={() => activeList?.items?.length > 0 && (
            <View>
              <TouchableOpacity style={styles.calcBtn} onPress={calculate} disabled={calculating}>
                {calculating
                  ? <ActivityIndicator color="#1A1A1A" />
                  : <Text style={styles.calcBtnText}>💰 Izračunaj najjeftinije</Text>
                }
              </TouchableOpacity>

              {basketResult && (
                <View style={styles.resultWrap}>
                  <Text style={styles.resultTitle}>Rezultati</Text>

                  {/* Best single store */}
                  {basketResult.bestSingle && (
                    <View style={styles.resultCard}>
                      <View style={styles.resultCardHeader}>
                        <Text style={styles.resultCardLabel}>🥇 Jedna trgovina</Text>
                        <Text style={styles.resultCardTotal}>{basketResult.bestSingle.total.toFixed(2)}€</Text>
                      </View>
                      <View style={styles.resultStoreRow}>
                        <StoreBadge store={basketResult.bestSingle.store} />
                        <Text style={styles.resultStoreName}>{basketResult.bestSingle.store.toUpperCase()}</Text>
                      </View>
                    </View>
                  )}

                  {/* All complete stores */}
                  {basketResult.allStores.length > 1 && (
                    <View style={styles.resultCard}>
                      <Text style={styles.resultCardLabel}>Usporedba trgovina</Text>
                      {basketResult.allStores.map(([store, total], i) => (
                        <View key={store} style={styles.storeCompRow}>
                          <StoreBadge store={store} size={28} />
                          <Text style={styles.storeCompName}>{store.toUpperCase()}</Text>
                          <Text style={[styles.storeCompPrice, i === 0 && { color: colors.primary, fontWeight: '800' }]}>
                            {total.toFixed(2)}€
                          </Text>
                          {i === 0 && <Text style={styles.cheapestTag}>NAJJEFTINIJE</Text>}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Absolute cheapest */}
                  <View style={[styles.resultCard, { borderColor: colors.primary, borderWidth: 2 }]}>
                    <View style={styles.resultCardHeader}>
                      <Text style={styles.resultCardLabel}>💰 Maksimalna ušteda</Text>
                      <Text style={[styles.resultCardTotal, { color: colors.primary }]}>{basketResult.absolute.total.toFixed(2)}€</Text>
                    </View>
                    <Text style={styles.resultSub}>Kupuješ u {Object.keys(basketResult.absolute.stores).length} trgovin{Object.keys(basketResult.absolute.stores).length === 1 ? 'i' : 'a'}</Text>
                    {Object.entries(basketResult.absolute.stores).map(([store, data]) => (
                      <View key={store} style={styles.storeCompRow}>
                        <StoreBadge store={store} size={28} />
                        <Text style={styles.storeCompName}>{store.toUpperCase()}</Text>
                        <Text style={styles.storeCompPrice}>{data.total.toFixed(2)}€</Text>
                      </View>
                    ))}
                  </View>

                  {basketResult.savings && parseFloat(basketResult.savings) > 0 && (
                    <View style={styles.savingsBanner}>
                      <Text style={styles.savingsText}>
                        Uštediš <Text style={styles.savingsAmount}>{basketResult.savings}€</Text> ako ideš u najjeftiniju umjesto najskuplje
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        />
      )}

      {/* Add product button */}
      {activeList && (
        <View style={styles.addBar}>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowSearch(true)}>
            <Text style={styles.addBtnText}>+ Dodaj proizvod</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Modal */}
      <Modal visible={showSearch} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalWrap}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Dodaj u popis</Text>
            <TouchableOpacity onPress={() => { setShowSearch(false); setSearchResults([]); setSearchQuery(''); }}>
              <Text style={styles.modalClose}>Zatvori</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="Pretraži po imenu..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => searchProducts(searchQuery)}
              returnKeyType="search"
              autoFocus
            />
            <TouchableOpacity style={styles.searchGoBtn} onPress={() => searchProducts(searchQuery)}>
              <Text style={styles.searchGoBtnText}>Traži</Text>
            </TouchableOpacity>
          </View>

          {searching && <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />}

          <FlatList
            data={searchResults}
            keyExtractor={item => item.ean}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.searchResultCard} onPress={() => addItem(item.ean, item.name, item.brand, item.quantity, item.unit)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchResultName} numberOfLines={2}>{item.name}</Text>
                  {item.brand && <Text style={styles.searchResultBrand}>{item.brand}</Text>}
                  <Text style={styles.searchResultQty}>{item.quantity} {item.unit} · {item.store_count} trgovina</Text>
                </View>
                <View style={styles.searchResultRight}>
                  <Text style={styles.searchResultPrice}>{parseFloat(item.cheapest_price).toFixed(2)}€</Text>
                  <Text style={styles.searchResultAdd}>+ Dodaj</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Store filter Modal */}
      <Modal visible={showStores} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalWrap}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Dostupne trgovine</Text>
            <TouchableOpacity onPress={() => setShowStores(false)}>
              <Text style={styles.modalClose}>Gotovo</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.storeFilterSub}>Odaberi samo trgovine koje imaš u svom gradu</Text>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <TouchableOpacity style={styles.storeSelectAll} onPress={() => saveStores(ALL_STORES)}>
              <Text style={styles.storeSelectAllText}>Odaberi sve</Text>
            </TouchableOpacity>
            {ALL_STORES.map(store => {
              const enabled = enabledStores.includes(store);
              return (
                <TouchableOpacity key={store} style={styles.storeRow} onPress={() => {
                  const updated = enabled
                    ? enabledStores.filter(s => s !== store)
                    : [...enabledStores, store];
                  saveStores(updated);
                }}>
                  <StoreBadge store={store} size={36} />
                  <Text style={styles.storeRowName}>{store.toUpperCase()}</Text>
                  <View style={[styles.storeCheck, enabled && styles.storeCheckActive]}>
                    {enabled && <Text style={styles.storeCheckMark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* New list Modal */}
      <Modal visible={showNewList} animationType="fade" transparent>
        <View style={styles.newListOverlay}>
          <View style={styles.newListBox}>
            <Text style={styles.newListTitle}>Novi popis</Text>
            <TextInput
              style={styles.newListInput}
              placeholder="npr. Game Night, Tjedna nabava..."
              value={newListName}
              onChangeText={setNewListName}
              autoFocus
              onSubmitEditing={() => createList(newListName)}
            />
            <View style={styles.newListBtns}>
              <TouchableOpacity style={styles.newListCancel} onPress={() => { setShowNewList(false); setNewListName(''); }}>
                <Text style={styles.newListCancelText}>Odustani</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.newListCreate} onPress={() => createList(newListName)}>
                <Text style={styles.newListCreateText}>Kreiraj</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: colors.ink },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.border },
  headerBtnText: { fontSize: 13, fontWeight: '600', color: colors.ink },
  listTabs: { maxHeight: 48, paddingVertical: 4 },
  listTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  listTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  listTabText: { fontSize: 13, fontWeight: '600', color: colors.ink },
  listTabTextActive: { color: '#1A1A1A' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  emptySub: { fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: 24 },
  createBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  createBtnText: { color: '#1A1A1A', fontWeight: '700', fontSize: 16 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  listName: { fontSize: 18, fontWeight: '700', color: colors.ink },
  emptyList: { padding: 24, alignItems: 'center' },
  emptyListText: { color: colors.muted, fontSize: 14 },
  itemCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  itemName: { fontSize: 15, fontWeight: '600', color: colors.ink, marginBottom: 2 },
  itemBrand: { fontSize: 12, color: colors.muted },
  itemSize: { fontSize: 11, color: '#CBD5E1', marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { fontSize: 18, fontWeight: '700', color: colors.primary },
  qty: { fontSize: 16, fontWeight: '700', color: colors.ink, minWidth: 20, textAlign: 'center' },
  calcBtn: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 16 },
  calcBtnText: { color: '#1A1A1A', fontWeight: '800', fontSize: 16 },
  addBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
  addBtn: { backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 2, borderColor: colors.primary },
  addBtnText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  resultWrap: { marginTop: 8 },
  resultTitle: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  resultCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  resultCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  resultCardLabel: { fontSize: 14, fontWeight: '700', color: colors.ink },
  resultCardTotal: { fontSize: 22, fontWeight: '800', color: colors.ink },
  resultStoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultStoreName: { fontSize: 16, fontWeight: '700', color: colors.ink },
  resultSub: { fontSize: 12, color: colors.muted, marginBottom: 10 },
  storeCompRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border },
  storeCompName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink },
  storeCompPrice: { fontSize: 16, fontWeight: '700', color: colors.ink },
  cheapestTag: { fontSize: 10, color: colors.primary, fontWeight: '800' },
  savingsBanner: { backgroundColor: colors.primaryLight, borderRadius: 10, padding: 12, marginTop: 4, borderWidth: 1, borderColor: colors.primary + '40' },
  savingsText: { fontSize: 13, color: colors.ink, fontWeight: '500' },
  savingsAmount: { fontWeight: '800', color: colors.primary },
  modalWrap: { flex: 1, backgroundColor: colors.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.ink },
  modalClose: { fontSize: 16, color: colors.primary, fontWeight: '600' },
  searchBox: { flexDirection: 'row', margin: 16, gap: 8 },
  searchInput: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: colors.border },
  searchGoBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  searchGoBtnText: { color: '#1A1A1A', fontWeight: '700', fontSize: 14 },
  searchResultCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  searchResultName: { fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: 2 },
  searchResultBrand: { fontSize: 12, color: colors.muted },
  searchResultQty: { fontSize: 11, color: '#CBD5E1', marginTop: 2 },
  searchResultRight: { alignItems: 'flex-end', marginLeft: 12 },
  searchResultPrice: { fontSize: 16, fontWeight: '800', color: colors.primary },
  searchResultAdd: { fontSize: 12, color: colors.primary, fontWeight: '600', marginTop: 4 },
  storeFilterSub: { fontSize: 13, color: colors.muted, paddingHorizontal: 16, paddingBottom: 8 },
  storeSelectAll: { backgroundColor: colors.primaryLight, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 12 },
  storeSelectAllText: { color: colors.primary, fontWeight: '700' },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  storeRowName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink },
  storeCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  storeCheckActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  storeCheckMark: { color: '#1A1A1A', fontWeight: '800', fontSize: 14 },
  newListOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  newListBox: { backgroundColor: '#fff', borderRadius: 16, padding: 24 },
  newListTitle: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 16 },
  newListInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, padding: 14, fontSize: 15, marginBottom: 16 },
  newListBtns: { flexDirection: 'row', gap: 10 },
  newListCancel: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  newListCancelText: { color: colors.muted, fontWeight: '600' },
  newListCreate: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' },
  newListCreateText: { color: '#1A1A1A', fontWeight: '700' },
});
