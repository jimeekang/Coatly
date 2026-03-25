import { Document, Image, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { APP_NAME } from '@/config/constants';
import { formatCustomerAddress } from '@/lib/invoices';
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
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  brandBlock: {
    maxWidth: '60%',
  },
  logo: {
    width: 132,
    height: 68,
    objectFit: 'contain',
    marginBottom: 12,
  },
  businessName: {
    fontSize: 19,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  metaLine: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 3,
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
  logoUrl: string | null;
  bankDetails?: string | null;
}

export function InvoiceTemplate({
  invoice,
  businessName,
  abn,
  phone,
  email,
  bankDetails,
  logoUrl,
}: InvoiceTemplateProps) {
  const isPaid = invoice.status === 'paid';
  const balanceCents = Math.max(invoice.total_cents - invoice.amount_paid_cents, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brandBlock}>
            {logoUrl && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={logoUrl} style={styles.logo} />
            )}
            <Text style={styles.businessName}>{businessName}</Text>
            {phone && <Text style={styles.metaLine}>Phone: {phone}</Text>}
            {email && <Text style={styles.metaLine}>Email: {email}</Text>}
            {abn && <Text style={styles.metaLine}>ABN: {formatABN(abn)}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.invoiceTitle}>TAX INVOICE</Text>
            <Text style={styles.metaLine}>Invoice No: {invoice.invoice_number}</Text>
            <Text style={styles.metaLine}>Issue Date: {formatDate(invoice.created_at)}</Text>
            <Text style={styles.metaLine}>Due Date: {formatDate(invoice.due_date)}</Text>
            {isPaid && invoice.paid_at && (
              <Text
                style={[styles.metaLine, { color: '#16a34a', fontFamily: 'Helvetica-Bold' }]}
              >
                PAID {formatDate(invoice.paid_at)}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <Text>{invoice.customer.name}</Text>
          {formatCustomerAddress(invoice.customer) && (
            <Text style={styles.metaLine}>{formatCustomerAddress(invoice.customer)}</Text>
          )}
          {invoice.customer.email && <Text style={styles.metaLine}>{invoice.customer.email}</Text>}
          {invoice.customer.phone && <Text style={styles.metaLine}>{invoice.customer.phone}</Text>}
        </View>

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
              <Text style={styles.colTotal}>{formatAUD(item.total_cents)}</Text>
            </View>
          ))}
        </View>

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
          {invoice.amount_paid_cents > 0 && invoice.amount_paid_cents < invoice.total_cents && (
            <>
              <View style={styles.totalRow}>
                <Text>Paid</Text>
                <Text>({formatAUD(invoice.amount_paid_cents)})</Text>
              </View>
              <View style={[styles.totalRow, styles.totalLine]}>
                <Text>Balance Due</Text>
                <Text>{formatAUD(balanceCents)}</Text>
              </View>
            </>
          )}
        </View>

        {bankDetails && (
          <View style={[styles.section, { marginTop: 24 }]}>
            <Text style={styles.sectionTitle}>Payment Details</Text>
            <Text style={{ color: '#374151', lineHeight: 1.6 }}>{bankDetails}</Text>
          </View>
        )}

        {invoice.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={{ color: '#6b7280' }}>{invoice.notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Generated by {APP_NAME} · Thank you for your business!
        </Text>
      </Page>
    </Document>
  );
}
