import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { InvoiceWithCustomer } from '@/types/invoice';
import { formatAUD, formatDate, formatABN } from '@/utils/format';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    color: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  businessName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#1e40af',
  },
  label: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 2,
  },
  invoiceTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 6,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  colDesc: { width: '50%' },
  colQty: { width: '15%', textAlign: 'right' },
  colUnit: { width: '17.5%', textAlign: 'right' },
  colTotal: { width: '17.5%', textAlign: 'right' },
  totalsSection: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    width: 220,
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalLine: {
    borderTopWidth: 1,
    borderTopColor: '#111827',
    paddingTop: 4,
    fontFamily: 'Helvetica-Bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

interface InvoiceTemplateProps {
  invoice: InvoiceWithCustomer;
  businessName: string;
  abn: string | null;
  phone: string | null;
  email: string | null;
  bankDetails?: string | null;
}

export function InvoiceTemplate({
  invoice,
  businessName,
  abn,
  phone,
  email,
  bankDetails,
}: InvoiceTemplateProps) {
  const isPaid = invoice.status === 'paid';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.businessName}>{businessName}</Text>
            {abn && <Text style={styles.label}>ABN: {formatABN(abn)}</Text>}
            {phone && <Text style={styles.label}>{phone}</Text>}
            {email && <Text style={styles.label}>{email}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.invoiceTitle}>TAX INVOICE</Text>
            <Text style={styles.label}>Invoice No: {invoice.invoice_number}</Text>
            <Text style={styles.label}>Issue Date: {formatDate(invoice.issue_date)}</Text>
            <Text style={styles.label}>Due Date: {formatDate(invoice.due_date)}</Text>
            {isPaid && invoice.paid_at && (
              <Text style={[styles.label, { color: '#16a34a', fontFamily: 'Helvetica-Bold' }]}>
                PAID {formatDate(invoice.paid_at)}
              </Text>
            )}
          </View>
        </View>

        {/* Customer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <Text>{invoice.customer.name}</Text>
          {invoice.customer.address && <Text style={styles.label}>{invoice.customer.address}</Text>}
          {invoice.customer.email && <Text style={styles.label}>{invoice.customer.email}</Text>}
          {invoice.customer.phone && <Text style={styles.label}>{invoice.customer.phone}</Text>}
        </View>

        {/* Line Items */}
        <View style={styles.section}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colUnit}>Unit Price</Text>
            <Text style={styles.colTotal}>Amount</Text>
          </View>
          {invoice.line_items.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colUnit}>{formatAUD(item.unit_price_cents)}</Text>
              <Text style={styles.colTotal}>{formatAUD(item.line_total_cents)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text>Subtotal (ex GST)</Text>
            <Text>{formatAUD(invoice.subtotal_cents)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>GST (10%)</Text>
            <Text>{formatAUD(invoice.gst_cents)}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalLine]}>
            <Text>Total (inc GST)</Text>
            <Text>{formatAUD(invoice.total_cents)}</Text>
          </View>
          {invoice.paid_cents > 0 && invoice.paid_cents < invoice.total_cents && (
            <>
              <View style={styles.totalRow}>
                <Text>Paid</Text>
                <Text>({formatAUD(invoice.paid_cents)})</Text>
              </View>
              <View style={[styles.totalRow, styles.totalLine]}>
                <Text>Balance Due</Text>
                <Text>{formatAUD(invoice.balance_cents)}</Text>
              </View>
            </>
          )}
        </View>

        {/* Payment Details */}
        {(bankDetails ?? invoice.payment_instructions) && (
          <View style={[styles.section, { marginTop: 24 }]}>
            <Text style={styles.sectionTitle}>Payment Details</Text>
            <Text style={{ color: '#374151', lineHeight: 1.6 }}>
              {bankDetails ?? invoice.payment_instructions}
            </Text>
          </View>
        )}

        {invoice.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={{ color: '#6b7280' }}>{invoice.notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Generated by PaintMate · paintmate.com.au · Thank you for your business!
        </Text>
      </Page>
    </Document>
  );
}
