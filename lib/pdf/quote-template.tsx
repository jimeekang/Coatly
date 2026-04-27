import {
  Document,
  Image,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import { APP_NAME } from '@/config/constants';
import { groupQuoteLineItemsByCategory, type QuoteDetail } from '@/lib/quotes';
import { formatABN, formatAUD, formatDate } from '@/utils/format';

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
  value: {
    fontSize: 10,
  },
  quoteTitle: {
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
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
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
  categoryHeader: {
    paddingTop: 8,
    paddingBottom: 4,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  col1: { width: '40%' },
  col2: { width: '20%', textAlign: 'right' },
  col3: { width: '20%', textAlign: 'right' },
  col4: { width: '20%', textAlign: 'right' },
  totalsSection: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    width: 200,
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalLine: {
    borderTopWidth: 1,
    borderTopColor: '#111827',
    paddingTop: 4,
    fontFamily: 'Helvetica-Bold',
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

export function QuoteTemplate({
  quote,
  businessName,
  abn,
  phone,
  email,
  logoUrl,
}: {
  quote: QuoteDetail;
  businessName: string;
  abn: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
}) {
  const includedLineItems = quote.line_items.filter(
    (item) => !item.is_optional
  );
  const optionalLineItems = quote.line_items.filter((item) => item.is_optional);
  const includedLineItemGroups =
    groupQuoteLineItemsByCategory(includedLineItems);
  const optionalLineItemGroups =
    groupQuoteLineItemsByCategory(optionalLineItems);

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
            <Text style={styles.quoteTitle}>QUOTE</Text>
            <Text style={styles.metaLine}>Quote No: {quote.quote_number}</Text>
            <Text style={styles.metaLine}>
              Date: {formatDate(quote.created_at)}
            </Text>
            <Text style={styles.metaLine}>
              Valid Until: {formatDate(quote.valid_until)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prepared For</Text>
          <Text style={styles.value}>{quote.customer.name}</Text>
          {quote.customer.address && (
            <Text style={styles.value}>{quote.customer.address}</Text>
          )}
          {quote.customer.email && (
            <Text style={styles.value}>{quote.customer.email}</Text>
          )}
          {quote.customer.phone && (
            <Text style={styles.value}>{quote.customer.phone}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Description</Text>
          <Text style={styles.value}>{quote.title}</Text>
          {quote.notes && (
            <Text style={[styles.value, { marginTop: 6, color: '#6b7280' }]}>
              {quote.notes}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scope of Work</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Description</Text>
            <Text style={styles.col2}>Area (sqm)</Text>
            <Text style={styles.col3}>Rate/sqm</Text>
            <Text style={styles.col4}>Amount</Text>
          </View>
          {quote.rooms.map((room) => (
            <View key={room.id}>
              <View style={[styles.tableRow, { backgroundColor: '#f9fafb' }]}>
                <Text style={[styles.col1, { fontFamily: 'Helvetica-Bold' }]}>
                  {room.name}
                </Text>
                <Text style={styles.col2} />
                <Text style={styles.col3} />
                <Text style={[styles.col4, { fontFamily: 'Helvetica-Bold' }]}>
                  {formatAUD(room.total_cents)}
                </Text>
              </View>
              {room.surfaces.map((surface) => (
                <View key={surface.id} style={styles.tableRow}>
                  <Text
                    style={[styles.col1, { paddingLeft: 10, color: '#6b7280' }]}
                  >
                    {surface.surface_type}
                  </Text>
                  <Text style={[styles.col2, { color: '#6b7280' }]}>
                    {surface.area_m2.toFixed(2)}
                  </Text>
                  <Text style={[styles.col3, { color: '#6b7280' }]}>
                    {formatAUD(surface.rate_per_m2_cents)}/sqm
                  </Text>
                  <Text style={[styles.col4, { color: '#6b7280' }]}>
                    {formatAUD(surface.total_cents)}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {includedLineItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Materials &amp; Services</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Description</Text>
              <Text style={styles.col2}>Qty</Text>
              <Text style={styles.col3}>Rate</Text>
              <Text style={styles.col4}>Amount</Text>
            </View>
            {includedLineItemGroups.map((group) => (
              <View key={group.category}>
                <Text style={styles.categoryHeader}>{group.label}</Text>
                {group.items.map((item) => (
                  <View key={item.id} style={styles.tableRow}>
                    <Text style={styles.col1}>
                      {item.name}
                      {item.notes ? `\n${item.notes}` : ''}
                    </Text>
                    <Text style={styles.col2}>
                      {item.quantity} {item.unit}
                    </Text>
                    <Text style={styles.col3}>
                      {formatAUD(item.unit_price_cents)}
                    </Text>
                    <Text style={styles.col4}>
                      {formatAUD(item.total_cents)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {optionalLineItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Optional Add-ons</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Description</Text>
              <Text style={styles.col2}>Status</Text>
              <Text style={styles.col3}>Rate</Text>
              <Text style={styles.col4}>Amount</Text>
            </View>
            {optionalLineItemGroups.map((group) => (
              <View key={group.category}>
                <Text style={styles.categoryHeader}>{group.label}</Text>
                {group.items.map((item) => (
                  <View key={item.id} style={styles.tableRow}>
                    <Text style={styles.col1}>
                      {item.name}
                      {item.notes ? `\n${item.notes}` : ''}
                    </Text>
                    <Text style={styles.col2}>
                      {item.is_selected ? 'Selected' : 'Optional'}
                    </Text>
                    <Text style={styles.col3}>
                      {formatAUD(item.unit_price_cents)} / {item.unit}
                    </Text>
                    <Text style={styles.col4}>
                      {formatAUD(item.total_cents)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text>Subtotal (ex GST)</Text>
            <Text>{formatAUD(quote.subtotal_cents)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>GST (10%)</Text>
            <Text>{formatAUD(quote.gst_cents)}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalLine]}>
            <Text>Total (inc GST)</Text>
            <Text>{formatAUD(quote.total_cents)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Generated by {APP_NAME} · This quote is valid until{' '}
          {formatDate(quote.valid_until)}
        </Text>
      </Page>
    </Document>
  );
}
