import { Transaction } from '@/services/database';
import { format } from 'date-fns';
import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface StatementBillProps {
  companyName?: string;
  companyPlace?: string;
  customerName: string;
  customerPlace: string;
  date: string;
  transactions: Transaction[];
  totalOrders: number;
  totalPaid: number;
  balance: number;
  lang?: 'en' | 'ta';
}

const LABELS = {
  en: {
    title: 'STATEMENT / BILL',
    company: 'MFC FOOD PRODUCT',
    place: 'ADIRAMPATTINAM',
    to: 'To',
    date: 'Date',
    slNo: 'S.No',
    dateCol: 'Date',
    particulars: 'Particulars',
    amount: 'Amount (₹)',
    totalOrders: 'Total Orders',
    totalPaid: 'Total Paid',
    balanceDue: 'Balance Due',
    thankYou: 'THANK YOU!',
    eoe: 'E. & O.E.',
    order: 'Order',
    payment: 'Payment',
  },
  ta: {
    title: 'அறிக்கை / பில்',
    company: 'MFC FOOD PRODUCT',
    place: 'ADIRAMPATTINAM',
    to: 'பெறுநர்',
    date: 'தேதி',
    slNo: 'வ.எண்',
    dateCol: 'தேதி',
    particulars: 'விவரம்',
    amount: 'தொகை (₹)',
    totalOrders: 'மொத்த ஆர்டர்கள்',
    totalPaid: 'மொத்தம் செலுத்தியது',
    balanceDue: 'நிலுவை தொகை',
    thankYou: 'நன்றி!',
    eoe: 'E. & O.E.',
    order: 'ஆர்டர்',
    payment: 'பணம்',
  },
};

const StatementBill = forwardRef<View, StatementBillProps>(
  (
    {
      companyName,
      companyPlace,
      customerName,
      customerPlace,
      date,
      transactions,
      totalOrders,
      totalPaid,
      balance,
      lang = 'en',
    },
    ref,
  ) => {
    const L = LABELS[lang];
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return (
      <View ref={ref} style={S.container} collapsable={false}>
        {/* ─── Header ────────────────────────────── */}
        <View style={S.headerBand}>
          <Text style={S.titleText}>{L.title}</Text>
        </View>

        <View style={S.companyBlock}>
          <Text style={S.companyName}>{companyName || L.company}</Text>
          <Text style={S.companyPlace}>{companyPlace || L.place}</Text>
        </View>

        {/* ─── Customer & Date ────────────────────── */}
        <View style={S.metaRow}>
          <View style={S.metaLeft}>
            <Text style={S.metaLabel}>
              {L.to}:{' '}
              <Text style={S.metaValue}>{customerName}</Text>
            </Text>
            {customerPlace ? (
              <Text style={S.metaLabelSmall}>{customerPlace}</Text>
            ) : null}
          </View>
          <View style={S.metaRight}>
            <Text style={S.metaLabel}>
              {L.date}:{' '}
              <Text style={S.metaValue}>{date}</Text>
            </Text>
          </View>
        </View>

        <View style={S.divider} />

        {/* ─── Table Header ──────────────────────── */}
        <View style={S.tableHeader}>
          <Text style={[S.thText, S.colSl]}>{L.slNo}</Text>
          <Text style={[S.thText, S.colDate]}>{L.dateCol}</Text>
          <Text style={[S.thText, S.colDesc]}>{L.particulars}</Text>
          <Text style={[S.thText, S.colAmt, { textAlign: 'right' }]}>{L.amount}</Text>
        </View>

        {/* ─── Table Rows ────────────────────────── */}
        {sorted.map((txn, idx) => {
          const isDebit = txn.type === 'debit';
          return (
            <View
              key={txn.id}
              style={[S.tableRow, idx % 2 === 0 ? S.rowEven : S.rowOdd]}
            >
              <Text style={[S.tdText, S.colSl]}>{idx + 1}</Text>
              <Text style={[S.tdText, S.colDate]}>
                {format(new Date(txn.date), 'dd/MM')}
              </Text>
              <Text style={[S.tdText, S.colDesc]} numberOfLines={1}>
                {isDebit ? `📦 ${txn.description}` : `💰 ${txn.description}`}
              </Text>
              <Text
                style={[
                  S.tdText,
                  S.colAmt,
                  { textAlign: 'right', color: isDebit ? '#B71C1C' : '#1B5E20' },
                ]}
              >
                {isDebit ? '-' : '+'}
                {txn.amount.toFixed(2)}
              </Text>
            </View>
          );
        })}

        {/* Empty filler if few rows */}
        {sorted.length < 3 && <View style={{ height: 20 }} />}

        <View style={S.dividerThick} />

        {/* ─── Summary ───────────────────────────── */}
        <View style={S.summaryBlock}>
          <View style={S.summaryRow}>
            <Text style={S.summaryLabel}>{L.totalOrders}</Text>
            <Text style={S.summaryValue}>₹{totalOrders.toFixed(2)}</Text>
          </View>
          <View style={S.summaryRow}>
            <Text style={S.summaryLabel}>{L.totalPaid}</Text>
            <Text style={[S.summaryValue, { color: '#1B5E20' }]}>
              ₹{totalPaid.toFixed(2)}
            </Text>
          </View>
          <View style={S.divider} />
          <View style={S.summaryRow}>
            <Text style={S.balanceLabel}>{L.balanceDue}</Text>
            <Text
              style={[
                S.balanceValue,
                { color: balance > 0 ? '#B71C1C' : '#1B5E20' },
              ]}
            >
              ₹{Math.abs(balance).toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={S.dividerThick} />

        {/* ─── Footer ────────────────────────────── */}
        <View style={S.footer}>
          <Text style={S.thankYou}>{L.thankYou}</Text>
          <Text style={S.eoe}>{L.eoe}</Text>
        </View>
      </View>
    );
  },
);

StatementBill.displayName = 'StatementBill';
export default StatementBill;

// ─── Styles ─────────────────────────────────────────────────────────

const PINK = '#F8E8EC';
const PINK_DARK = '#D4687A';
const RED_BORDER = '#C62828';

const S = StyleSheet.create({
  container: {
    width: 380,
    backgroundColor: PINK,
    borderWidth: 2,
    borderColor: RED_BORDER,
    borderRadius: 6,
    padding: 14,
    overflow: 'hidden',
  },
  // Header
  headerBand: {
    backgroundColor: RED_BORDER,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
    marginBottom: 8,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1,
  },
  companyBlock: {
    alignItems: 'center',
    marginBottom: 10,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1A237E',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  companyPlace: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A237E',
    textAlign: 'center',
  },
  // Meta
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaLeft: { flex: 1 },
  metaRight: { alignItems: 'flex-end' },
  metaLabel: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 13,
    color: '#000',
    fontWeight: '800',
  },
  metaLabelSmall: {
    fontSize: 11,
    color: '#555',
    marginTop: 1,
  },
  // Dividers
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: PINK_DARK,
    marginVertical: 6,
  },
  dividerThick: {
    borderBottomWidth: 2,
    borderBottomColor: RED_BORDER,
    marginVertical: 6,
  },
  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: RED_BORDER,
    borderRadius: 3,
    paddingVertical: 5,
    paddingHorizontal: 6,
    marginBottom: 2,
  },
  thText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PINK_DARK,
  },
  rowEven: { backgroundColor: 'rgba(255,255,255,0.35)' },
  rowOdd: { backgroundColor: 'transparent' },
  tdText: {
    fontSize: 11,
    color: '#222',
    fontWeight: '500',
  },
  colSl: { width: 32 },
  colDate: { width: 48 },
  colDesc: { flex: 1, paddingHorizontal: 4 },
  colAmt: { width: 72 },
  // Summary
  summaryBlock: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 12,
    color: '#000',
    fontWeight: '700',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#000',
    fontWeight: '900',
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 2,
  },
  thankYou: {
    fontSize: 14,
    fontWeight: '900',
    color: RED_BORDER,
    letterSpacing: 1,
  },
  eoe: {
    fontSize: 9,
    color: '#777',
    marginTop: 2,
  },
});
