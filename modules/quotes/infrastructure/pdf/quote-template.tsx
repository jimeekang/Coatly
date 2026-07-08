import {
  Document,
  Image,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import { APP_NAME } from '@/config/constants';
import {
  QUOTE_COATING_LABELS,
  QUOTE_SURFACE_LABELS,
  calculateDepositCents,
  groupQuoteLineItemsByCategory,
  type QuoteDetail,
} from '@/modules/quotes/domain/quotes';
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
  metaStrong: {
    fontSize: 9,
    color: '#111827',
    marginBottom: 3,
    fontFamily: 'Helvetica-Bold',
  },
  value: {
    fontSize: 10,
  },
  mutedValue: {
    fontSize: 9,
    color: '#6b7280',
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
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  detailCell: {
    width: '50%',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 8,
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 9,
    color: '#111827',
  },
  scopeCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  scopeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  scopeTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  pill: {
    fontSize: 8,
    color: '#0f766e',
    backgroundColor: '#ecfdf5',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    textTransform: 'uppercase',
  },
  stepRow: {
    marginTop: 5,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#e5e7eb',
  },
  stepLabel: {
    fontSize: 8,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  summaryBand: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  clauseCard: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    marginTop: 8,
  },
  clauseTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 3,
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

function formatLabel(value: string | null | undefined) {
  if (!value) return null;
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatPricingStatus(value: string) {
  const label = formatLabel(value);
  return label ?? 'Included';
}

export function QuoteTemplate({
  quote,
  businessName,
  abn,
  phone,
  email,
  businessAddress,
  logoUrl,
}: {
  quote: QuoteDetail;
  businessName: string;
  abn: string | null;
  phone: string | null;
  email: string | null;
  businessAddress: string | null;
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
  const scopeSections = quote.scope_sections.filter(
    (section) => !section.is_optional || section.is_selected
  );
  const reportSections = scopeSections.filter(
    (section) => section.report_context
  );
  const hasPricingRows =
    quote.rooms.length > 0 || quote.estimate_items.length > 0;
  const depositCents = calculateDepositCents(
    quote.total_cents,
    quote.deposit_percent
  );
  const customerCompany = quote.customer.company_name;
  const showContactName =
    customerCompany && quote.customer.name
      ? quote.customer.name !== customerCompany
      : false;

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
            {businessAddress && (
              <Text style={styles.metaLine}>Address: {businessAddress}</Text>
            )}
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
            <Text style={styles.metaLine}>
              Status: {formatLabel(quote.status) ?? 'Draft'}
            </Text>
            {quote.working_days && (
              <Text style={styles.metaLine}>
                Booking Duration: {quote.working_days} working day
                {quote.working_days === 1 ? '' : 's'}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prepared For</Text>
          <Text style={styles.value}>
            {customerCompany || quote.customer.name}
          </Text>
          {showContactName && (
            <Text style={styles.value}>Contact: {quote.customer.name}</Text>
          )}
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
          <View style={styles.detailGrid}>
            <View style={styles.detailCell}>
              <Text style={styles.detailLabel}>Job Type</Text>
              <Text style={styles.detailValue}>
                {formatLabel(quote.job_type) ?? 'Interior'}
              </Text>
            </View>
            {quote.estimate_category && (
              <View style={styles.detailCell}>
                <Text style={styles.detailLabel}>Estimate Type</Text>
                <Text style={styles.detailValue}>
                  {formatLabel(quote.estimate_category)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {scopeSections.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scope of Work</Text>
            {reportSections.length > 0 && (
              <View style={styles.summaryBand}>
                <Text style={styles.metaStrong}>Maintenance Summary</Text>
                {reportSections.map((section) => (
                  <Text key={section.id} style={styles.mutedValue}>
                    {section.area_label ? `${section.area_label}: ` : ''}
                    {section.title}
                    {section.visible_defects.length > 0
                      ? ` (${section.visible_defects.join(', ')})`
                      : ''}
                  </Text>
                ))}
              </View>
            )}
            {scopeSections.map((section) => (
              <View key={section.id} style={styles.scopeCard}>
                <View style={styles.scopeHeader}>
                  <View style={{ width: '72%' }}>
                    <Text style={styles.scopeTitle}>{section.title}</Text>
                    {section.area_label && (
                      <Text style={styles.mutedValue}>
                        Area: {section.area_label}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.pill}>
                    {formatPricingStatus(section.pricing_status)}
                  </Text>
                </View>
                {section.description && (
                  <Text style={styles.value}>{section.description}</Text>
                )}
                <View style={styles.detailGrid}>
                  <View style={styles.detailCell}>
                    <Text style={styles.detailLabel}>Measurement</Text>
                    <Text style={styles.detailValue}>
                      {formatLabel(section.measurement_status) ?? 'To Confirm'}
                    </Text>
                  </View>
                  {section.surface_category && (
                    <View style={styles.detailCell}>
                      <Text style={styles.detailLabel}>Surface</Text>
                      <Text style={styles.detailValue}>
                        {formatLabel(section.surface_category)}
                      </Text>
                    </View>
                  )}
                </View>
                {section.visible_defects.length > 0 && (
                  <Text style={styles.mutedValue}>
                    Visible defects: {section.visible_defects.join(', ')}
                  </Text>
                )}
                {section.steps.map((step) => (
                  <View key={step.id} style={styles.stepRow}>
                    <Text style={styles.stepLabel}>
                      {step.label || formatLabel(step.step_type)}
                    </Text>
                    <Text style={styles.value}>{step.description}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {hasPricingRows && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing Summary</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Description</Text>
              <Text style={styles.col2}>Qty / Area</Text>
              <Text style={styles.col3}>Rate</Text>
              <Text style={styles.col4}>Amount</Text>
            </View>
            {quote.estimate_items.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={styles.col1}>
                  {item.label}
                  {'\n'}
                  <Text style={styles.mutedValue}>
                    {formatLabel(item.category)}
                  </Text>
                </Text>
                <Text style={styles.col2}>
                  {item.quantity} {item.unit}
                </Text>
                <Text style={styles.col3}>
                  {formatAUD(item.unit_price_cents)}
                </Text>
                <Text style={styles.col4}>{formatAUD(item.total_cents)}</Text>
              </View>
            ))}
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
                      style={[
                        styles.col1,
                        { paddingLeft: 10, color: '#6b7280' },
                      ]}
                    >
                      {QUOTE_SURFACE_LABELS[surface.surface_type]}
                      {'\n'}
                      <Text style={styles.mutedValue}>
                        {QUOTE_COATING_LABELS[surface.coating_type]}
                      </Text>
                    </Text>
                    <Text style={[styles.col2, { color: '#6b7280' }]}>
                      {surface.area_m2.toFixed(2)} sqm
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
        )}

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
          {quote.discount_cents > 0 && (
            <View style={styles.totalRow}>
              <Text>Discount</Text>
              <Text>-{formatAUD(quote.discount_cents)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text>GST (10%)</Text>
            <Text>{formatAUD(quote.gst_cents)}</Text>
          </View>
          {quote.manual_adjustment_cents !== 0 && (
            <View style={styles.totalRow}>
              <Text>Adjustment</Text>
              <Text>
                {quote.manual_adjustment_cents > 0 ? '+' : '-'}
                {formatAUD(Math.abs(quote.manual_adjustment_cents))}
              </Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.totalLine]}>
            <Text>Total (inc GST)</Text>
            <Text>{formatAUD(quote.total_cents)}</Text>
          </View>
          {depositCents > 0 && (
            <>
              <View style={styles.totalRow}>
                <Text>Deposit ({quote.deposit_percent}%)</Text>
                <Text>{formatAUD(depositCents)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text>Balance after deposit</Text>
                <Text>
                  {formatAUD(Math.max(0, quote.total_cents - depositCents))}
                </Text>
              </View>
            </>
          )}
        </View>

        {quote.clause_items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Clauses &amp; Terms</Text>
            {quote.clause_items.map((clause) => (
              <View key={clause.id} style={styles.clauseCard}>
                <Text style={styles.clauseTitle}>{clause.title}</Text>
                <Text style={styles.value}>{clause.body}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer}>
          Generated by {APP_NAME} · This quote is valid until{' '}
          {formatDate(quote.valid_until)}
        </Text>
      </Page>
    </Document>
  );
}
