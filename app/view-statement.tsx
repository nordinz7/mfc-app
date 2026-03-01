import StatementBill from '@/components/StatementBill';
import { AppColors, FontSizes, Radius, Spacing } from '@/constants/theme';
import { useSettings } from '@/contexts/SettingsContext';
import {
  getCustomerBalance,
  getCustomerById,
  getTransactionsByCustomer,
  insertStatement,
  TransactionWithQuantity,
} from '@/services/database';
import { shareStatementImage } from '@/utils/whatsapp';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ViewShot from 'react-native-view-shot';

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    scrollContent: {
      alignItems: 'center',
      paddingVertical: Spacing.xl,
      paddingHorizontal: Spacing.md,
      paddingBottom: 100,
    },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    billWrapper: {
      borderRadius: Radius.lg,
      overflow: 'hidden',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    shareBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      backgroundColor: c.whatsapp,
      paddingVertical: Spacing.md,
      borderRadius: Radius.md,
    },
    shareBtnText: {
      color: '#FFFFFF',
      fontSize: FontSizes.md,
      fontWeight: '700',
    },
    emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
    emptyText: { fontSize: FontSizes.lg, color: c.textSecondary, marginTop: Spacing.md, textAlign: 'center' },
  });
}

export default function ViewStatementScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, tr, lang, companyName, companyPlace } = useSettings();
  const S = makeStyles(colors);

  const billRef = useRef<ViewShot>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [customer, setCustomer] = useState<{ name: string; place: string; phone_number: string } | null>(null);
  const [transactions, setTransactions] = useState<TransactionWithQuantity[]>([]);
  const [balance, setBalance] = useState({ totalDebit: 0, totalCredit: 0, balance: 0 });

  const customerId = Number(id);

  useEffect(() => {
    (async () => {
      const [c, txns, bal] = await Promise.all([
        getCustomerById(db, customerId),
        getTransactionsByCustomer(db, customerId),
        getCustomerBalance(db, customerId),
      ]);
      setCustomer(c);
      setTransactions(txns);
      setBalance(bal);
      setLoading(false);
    })();
  }, [db, customerId]);

  const handleShare = async () => {
    if (!customer || sharing) return;
    setSharing(true);
    try {
      // Save statement record
      const earliestDate = [...transactions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      )[0]?.date ?? new Date().toISOString();

      await insertStatement(
        db,
        customerId,
        transactions.map((t) => t.id),
        balance.totalDebit,
        balance.totalCredit,
        balance.balance,
        earliestDate,
      );

      // Capture and share
      if (billRef.current?.capture) {
        const uri = await billRef.current.capture();
        await shareStatementImage(uri, customer.name, lang);
      }
    } catch (error) {
      console.error('Statement share error:', error);
      // sharing might not open — that's OK
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <View style={S.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!customer || transactions.length === 0) {
    return (
      <View style={S.emptyWrap}>
        <MaterialIcons name="receipt-long" size={56} color={colors.textMuted} />
        <Text style={S.emptyText}>{tr.noBalanceDue}</Text>
      </View>
    );
  }

  return (
    <View style={S.container}>
      <ScrollView contentContainerStyle={S.scrollContent}>
        <View style={S.billWrapper}>
          <ViewShot ref={billRef} options={{ format: 'png', quality: 1, result: 'tmpfile' }}>
            <StatementBill
              companyName={companyName}
              companyPlace={companyPlace}
              customerName={customer.name}
              customerPlace={customer.place}
              date={format(new Date(), 'dd/MM/yyyy')}
              transactions={transactions}
              totalOrders={balance.totalDebit}
              totalPaid={balance.totalCredit}
              balance={balance.balance}
              lang={lang}
            />
          </ViewShot>
        </View>
      </ScrollView>

      <View style={S.bottomBar}>
        <TouchableOpacity style={S.shareBtn} onPress={handleShare} disabled={sharing}>
          {sharing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcons name="share" size={20} color="#FFFFFF" />
              <Text style={S.shareBtnText}>{tr.shareStatement}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
