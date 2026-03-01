import { AppColors, FontSizes, Radius, Spacing } from '@/constants/theme';
import { useSettings } from '@/contexts/SettingsContext';
import { bulkImportContacts, canDeleteCustomer, CustomerWithBalance, deleteCustomer, getCustomersWithBalance } from '@/services/database';
import { MaterialIcons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    container:   { flex: 1, backgroundColor: c.background },
    topBar: {
      backgroundColor: c.card,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      gap: Spacing.sm,
    },
    searchInput: {
      backgroundColor: c.inputBg,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: 8,
      fontSize: FontSizes.md,
      color: c.text,
    },
    listContent: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 100 },
    emptyOuter:  { flexGrow: 1 },
    card: {
      backgroundColor: c.card,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 2,
    },
    cardContent: { flex: 1 },
    nameRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    name:        { fontSize: FontSizes.md, fontWeight: '700', color: c.text },
    sub:         { fontSize: FontSizes.sm, color: c.textSecondary, marginTop: 2 },
    actions:     { flexDirection: 'row', gap: 2 },
    callBtn:     { padding: 8 },
    iconBtn:     { padding: 8 },
    emptyWrap:   { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    emptyText:   { fontSize: FontSizes.xl, fontWeight: '600', color: c.textSecondary, marginTop: Spacing.lg },
    emptySubText:{ fontSize: FontSizes.md, color: c.textMuted, marginTop: Spacing.sm, textAlign: 'center', paddingHorizontal: Spacing.xl },
    fab: {
      position: 'absolute', bottom: 24, right: 24,
      width: 60, height: 60, borderRadius: 30,
      backgroundColor: c.primary,
      justifyContent: 'center', alignItems: 'center',
      elevation: 6,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35, shadowRadius: 8,
    },
    importBtn: {
      position: 'absolute', bottom: 24, right: 96,
      width: 60, height: 60, borderRadius: 30,
      backgroundColor: c.success,
      justifyContent: 'center', alignItems: 'center',
      elevation: 6,
      shadowColor: c.success,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35, shadowRadius: 8,
    },
  });
}

export default function CustomersScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { colors, tr } = useSettings();
  const S = makeStyles(colors);

  const [customers, setCustomers] = useState<CustomerWithBalance[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [importingContacts, setImportingContacts] = useState(false);

  const load = useCallback(async () => {
    setCustomers(await getCustomersWithBalance(db));
  }, [db]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const displayed = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.trim().toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.place.toLowerCase().includes(q) ||
      c.phone_number.includes(q)
    );
  }, [customers, search]);

  const handleDelete = async (item: CustomerWithBalance) => {
    const canDel = await canDeleteCustomer(db, item.id);
    if (!canDel) {
      Alert.alert(tr.cannotDeleteCustomer, tr.cannotDeleteCustomerMsg(item.name));
      return;
    }
    Alert.alert(tr.removeCustomer, tr.removeCustomerMsg(item.name), [
      { text: tr.cancel, style: 'cancel' },
      {
        text: tr.delete, style: 'destructive', onPress: async () => {
          await deleteCustomer(db, item.id); load();
        },
      },
    ]);
  };

  const handleCall = (phone: string) => {
    Linking.openURL('tel:+' + phone.replace(/\D/g, ''));
  };

  const handleImportContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(tr.contactsPermission, tr.contactsPermissionMsg);
        return;
      }
      setImportingContacts(true);
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });
      // Extract contacts with phone numbers
      const contactList: { name: string; phone: string }[] = [];
      for (const c of data) {
        if (!c.phoneNumbers?.length) continue;
        const name = c.name || c.firstName || '';
        if (!name) continue;
        for (const ph of c.phoneNumbers) {
          if (ph.number) {
            contactList.push({ name, phone: ph.number });
          }
        }
      }
      const imported = await bulkImportContacts(db, contactList);
      setImportingContacts(false);
      if (imported > 0) {
        Alert.alert(tr.importSuccess, tr.importSuccessMsg(imported));
        load();
      } else {
        Alert.alert(tr.importSuccess, tr.importNone);
      }
    } catch {
      setImportingContacts(false);
      Alert.alert('Error', 'Could not import contacts.');
    }
  };

  const renderItem = ({ item }: { item: CustomerWithBalance }) => {
    return (
      <TouchableOpacity
        style={S.card}
        onPress={() => router.push({ pathname: '/customer-detail', params: { id: item.id } })}
        activeOpacity={0.7}
      >
        <View style={S.cardContent}>
          <View style={S.nameRow}>
            <Text style={S.name}>{item.name}</Text>
          </View>
          <Text style={S.sub} numberOfLines={1}>
            <MaterialIcons name="location-on" size={13} color={colors.textSecondary} /> {item.place}
            {'   '}
            <MaterialIcons name="phone" size={13} color={colors.textSecondary} /> {item.phone_number}
          </Text>
          {item.balance > 0 && (
            <Text style={{ fontSize: FontSizes.sm, color: colors.danger, fontWeight: '700', marginTop: 2 }}>
              ₹{item.balance.toFixed(2)} {tr.due}
            </Text>
          )}
          {item.balance <= 0 && (
            <Text style={{ fontSize: FontSizes.sm, color: colors.success, fontWeight: '600', marginTop: 2 }}>
              {tr.paidInFull}
            </Text>
          )}
        </View>
        <View style={S.actions}>
          <TouchableOpacity style={S.callBtn} onPress={() => handleCall(item.phone_number)}>
            <MaterialIcons name="call" size={22} color={colors.success} />
          </TouchableOpacity>
          <TouchableOpacity
            style={S.iconBtn}
            onPress={() => router.push({ pathname: '/edit-customer', params: { id: item.id, name: item.name, place: item.place, phone: item.phone_number } })}
            accessibilityLabel={tr.edit}
          >
            <MaterialIcons name="edit" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={S.iconBtn} onPress={() => handleDelete(item)} accessibilityLabel={tr.remove}>
            <MaterialIcons name="delete-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={S.container}>
      <View style={S.topBar}>
        <TextInput
          style={S.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={tr.searchCustomers}
          placeholderTextColor={colors.textMuted}
          clearButtonMode="while-editing"
        />
      </View>
      <FlatList
        data={displayed}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={displayed.length === 0 ? S.emptyOuter : S.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        ListEmptyComponent={
          <View style={S.emptyWrap}>
            <MaterialIcons name="people-outline" size={72} color={colors.textMuted} />
            <Text style={S.emptyText}>{tr.noCustomersYet}</Text>
            <Text style={S.emptySubText}>{tr.tapToAdd}</Text>
          </View>
        }
      />
      <TouchableOpacity
        style={S.importBtn}
        onPress={handleImportContacts}
        disabled={importingContacts}
        accessibilityLabel={tr.importContacts}
      >
        {importingContacts
          ? <ActivityIndicator color="#FFFFFF" />
          : <MaterialIcons name="contacts" size={28} color="#FFFFFF" />
        }
      </TouchableOpacity>
      <TouchableOpacity style={S.fab} onPress={() => router.push('/add-customer')} accessibilityLabel={tr.addCustomer}>
        <MaterialIcons name="person-add" size={30} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}
