import 'server-only';

import { googleAI } from '@genkit-ai/google-genai';
import { genkit, z } from 'genkit';
import { APP_NAME } from '@/config/constants';
import type {
  WorkspaceAssistantMatch,
  WorkspaceAssistantResult,
  WorkspaceBusinessContext,
  WorkspaceCustomerContext,
  WorkspaceDraftResult,
  WorkspaceInvoiceContext,
  WorkspaceQuoteContext,
} from '@/lib/ai/draft-types';

const geminiApiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? null;

const ai = genkit({
  plugins: [geminiApiKey ? googleAI({ apiKey: geminiApiKey }) : googleAI()],
  model: googleAI.model('gemini-2.5-flash', {
    temperature: 0.2,
  }),
});

const businessContextSchema = z
  .object({
    name: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    address: z.string().nullable(),
  })
  .nullable();

const customerContextSchema = z.object({
  id: z.string(),
  name: z.string(),
  company_name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
});

const quoteContextSchema = z.object({
  id: z.string(),
  quote_number: z.string(),
  title: z.string().nullable(),
  customer_id: z.string(),
  customer_name: z.string().nullable(),
  status: z.string(),
  total_cents: z.number(),
  valid_until: z.string().nullable(),
});

const invoiceContextSchema = z.object({
  id: z.string(),
  invoice_number: z.string(),
  customer_id: z.string(),
  customer_name: z.string().nullable(),
  quote_id: z.string().nullable(),
  quote_number: z.string().nullable(),
  status: z.string(),
  invoice_type: z.string(),
  total_cents: z.number(),
  due_date: z.string().nullable(),
});

const draftInputSchema = z.object({
  entity: z.enum(['customer', 'quote', 'invoice']),
  prompt: z.string().trim().min(8),
  currentDate: z.string().trim().min(1),
  business: businessContextSchema,
  customers: z.array(customerContextSchema),
  quotes: z.array(quoteContextSchema),
});

const workspaceAssistantInputSchema = z.object({
  prompt: z.string().trim().min(3),
  currentDate: z.string().trim().min(1),
  business: businessContextSchema,
  customers: z.array(customerContextSchema),
  quotes: z.array(quoteContextSchema),
  invoices: z.array(invoiceContextSchema),
});

const customerDraftSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  company_name: z.string(),
  address_line1: z.string(),
  address_line2: z.string(),
  city: z.string(),
  state: z.string(),
  postcode: z.string(),
  notes: z.string(),
});

const quoteSurfaceDraftSchema = z.object({
  surface_type: z.enum(['walls', 'ceiling', 'trim', 'doors', 'windows']),
  coating_type: z.enum([
    'touch_up_1coat',
    'repaint_2coat',
    'new_plaster_3coat',
    'stain',
    'specialty',
  ]),
  area_m2: z.number(),
  rate_per_m2_cents: z.number(),
  notes: z.string().nullable(),
});

const quoteDraftSchema = z.object({
  customer_id: z.string().nullable(),
  title: z.string(),
  status: z.enum(['draft', 'sent']),
  valid_until: z.string(),
  complexity: z.enum(['standard', 'moderate', 'complex']),
  labour_margin_percent: z.number(),
  material_margin_percent: z.number(),
  notes: z.string(),
  internal_notes: z.string(),
  rooms: z.array(
    z.object({
      name: z.string(),
      room_type: z.enum(['interior', 'exterior']),
      length_m: z.number().nullable(),
      width_m: z.number().nullable(),
      height_m: z.number().nullable(),
      surfaces: z.array(quoteSurfaceDraftSchema),
    })
  ),
});

const invoiceDraftSchema = z.object({
  customer_id: z.string().nullable(),
  quote_id: z.string().nullable(),
  invoice_type: z.enum(['full', 'deposit', 'progress', 'final']),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']),
  due_date: z.string(),
  notes: z.string(),
  line_items: z.array(
    z.object({
      description: z.string(),
      quantity: z.number(),
      unit_price_cents: z.number(),
    })
  ),
});

const draftOutputSchema = z.object({
  entity: z.enum(['customer', 'quote', 'invoice']),
  summary: z.string(),
  warnings: z.array(z.string()),
  customer: customerDraftSchema.nullable(),
  quote: quoteDraftSchema.nullable(),
  invoice: invoiceDraftSchema.nullable(),
});

const workspaceAssistantOutputSchema = z.object({
  intent: z.enum([
    'create_customer',
    'create_quote',
    'create_invoice',
    'search',
    'answer',
  ]),
  summary: z.string(),
  answer: z.string().nullable(),
  warnings: z.array(z.string()),
  matches: z
    .array(
      z.object({
        type: z.enum(['customer', 'quote', 'invoice']),
        id: z.string(),
        reason: z.string(),
      })
    )
    .max(6),
  customer: customerDraftSchema.nullable(),
  quote: quoteDraftSchema.nullable(),
  invoice: invoiceDraftSchema.nullable(),
});

function buildDraftPrompt(input: z.infer<typeof draftInputSchema>) {
  return [
    `Today's date in Australia/Sydney is ${input.currentDate}.`,
    `Entity to draft: ${input.entity}.`,
    `You are preparing a review-only draft for ${APP_NAME}. Never assume a database write happens here.`,
    'Rules:',
    '- Return only structured data that matches the output schema.',
    '- If you cannot confidently match an existing customer or quote, leave the ID null and explain it in warnings.',
    '- Never invent IDs. Use only the IDs shown in the provided lists.',
    '- Use YYYY-MM-DD for dates.',
    '- Use integer AUD cents for money.',
    '- For customers, fill unknown fields with empty strings rather than placeholders.',
    '- For quotes, default to status "draft", at least one room, and at least one surface per room.',
    '- For invoices, provide line items only. Totals and GST are recalculated by the app.',
    '',
    `Business context: ${JSON.stringify(input.business ?? {}, null, 2)}`,
    `Known customers: ${JSON.stringify(input.customers, null, 2)}`,
    `Known quotes: ${JSON.stringify(input.quotes, null, 2)}`,
    '',
    `User request: ${input.prompt}`,
  ].join('\n');
}

function buildWorkspaceAssistantPrompt(
  input: z.infer<typeof workspaceAssistantInputSchema>
) {
  return [
    `Today's date in Australia/Sydney is ${input.currentDate}.`,
    `You are the unified dashboard assistant for ${APP_NAME}.`,
    'Choose the best intent for the user request.',
    'Intent rules:',
    '- Use create_customer, create_quote, or create_invoice only when the user wants a new draft prepared.',
    '- Use search when the user wants to find, show, open, or review existing records.',
    '- Use answer when the user asks a direct question that can be answered from known records.',
    '- search and answer must not return create drafts.',
    '- create intents must return only one populated draft object that matches the chosen create intent.',
    '',
    'Data rules:',
    '- Never invent IDs. Use only IDs from the known records lists.',
    '- If a match is uncertain, include a warning and prefer search with likely matches.',
    '- Use YYYY-MM-DD for dates.',
    '- Use integer AUD cents for money.',
    '- Keep summary short and operational.',
    '- If answering a question, answer concretely with exact dates, numbers, or statuses from the provided records.',
    '- If the answer depends on one or more records, include those records in matches.',
    '- For create_quote, leave customer_id null if you cannot confidently match a customer.',
    '- For create_invoice, leave quote_id null if you cannot confidently match a quote.',
    '- Totals and GST are recalculated by the app. Never treat AI values as final accounting.',
    '',
    `Business context: ${JSON.stringify(input.business ?? {}, null, 2)}`,
    `Known customers: ${JSON.stringify(input.customers, null, 2)}`,
    `Known quotes: ${JSON.stringify(input.quotes, null, 2)}`,
    `Known invoices: ${JSON.stringify(input.invoices, null, 2)}`,
    '',
    `User request: ${input.prompt}`,
  ].join('\n');
}

function formatLabel(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function buildCustomerMatch(
  customer: WorkspaceCustomerContext,
  reason: string
): WorkspaceAssistantMatch {
  return {
    type: 'customer',
    id: customer.id,
    title: customer.company_name || customer.name,
    subtitle: customer.company_name ? customer.name : customer.email || customer.phone || 'Customer',
    description: customer.address,
    href: `/customers/${customer.id}`,
    badge: 'Customer',
    amount_cents: null,
    date_label: null,
    reason,
  };
}

function buildQuoteMatch(
  quote: WorkspaceQuoteContext,
  reason: string
): WorkspaceAssistantMatch {
  return {
    type: 'quote',
    id: quote.id,
    title: quote.quote_number,
    subtitle: quote.customer_name || 'Quote',
    description: quote.title,
    href: `/quotes/${quote.id}`,
    badge: formatLabel(quote.status),
    amount_cents: quote.total_cents,
    date_label: quote.valid_until ? `Valid until ${quote.valid_until}` : null,
    reason,
  };
}

function buildInvoiceMatch(
  invoice: WorkspaceInvoiceContext,
  reason: string
): WorkspaceAssistantMatch {
  return {
    type: 'invoice',
    id: invoice.id,
    title: invoice.invoice_number,
    subtitle: invoice.customer_name || 'Invoice',
    description: `${formatLabel(invoice.invoice_type)} invoice`,
    href: `/invoices/${invoice.id}`,
    badge: formatLabel(invoice.status),
    amount_cents: invoice.total_cents,
    date_label: invoice.due_date ? `Due ${invoice.due_date}` : null,
    reason,
  };
}

function resolveWorkspaceAssistantMatches(
  input: z.infer<typeof workspaceAssistantInputSchema>,
  rawMatches: Array<{ type: 'customer' | 'quote' | 'invoice'; id: string; reason: string }>
) {
  const customerMap = new Map(input.customers.map((customer) => [customer.id, customer]));
  const quoteMap = new Map(input.quotes.map((quote) => [quote.id, quote]));
  const invoiceMap = new Map(input.invoices.map((invoice) => [invoice.id, invoice]));
  const seen = new Set<string>();

  return rawMatches.flatMap((match) => {
    const key = `${match.type}:${match.id}`;
    if (seen.has(key)) {
      return [];
    }

    seen.add(key);

    if (match.type === 'customer') {
      const customer = customerMap.get(match.id);
      return customer ? [buildCustomerMatch(customer, match.reason)] : [];
    }

    if (match.type === 'quote') {
      const quote = quoteMap.get(match.id);
      return quote ? [buildQuoteMatch(quote, match.reason)] : [];
    }

    const invoice = invoiceMap.get(match.id);
    return invoice ? [buildInvoiceMatch(invoice, match.reason)] : [];
  });
}

export function isAIDraftConfigured() {
  return Boolean(geminiApiKey);
}

export async function generateWorkspaceDraft(
  input: z.infer<typeof draftInputSchema>
): Promise<WorkspaceDraftResult> {
  const parsedInput = draftInputSchema.parse(input);

  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const { output } = await ai.generate({
    prompt: buildDraftPrompt(parsedInput),
    output: { schema: draftOutputSchema },
  });

  if (!output) {
    throw new Error('AI draft could not be generated.');
  }

  return output as WorkspaceDraftResult;
}

export async function generateWorkspaceAssistantResult(input: {
  prompt: string;
  currentDate: string;
  business: WorkspaceBusinessContext | null;
  customers: WorkspaceCustomerContext[];
  quotes: WorkspaceQuoteContext[];
  invoices: WorkspaceInvoiceContext[];
}): Promise<WorkspaceAssistantResult> {
  const parsedInput = workspaceAssistantInputSchema.parse(input);

  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const { output } = await ai.generate({
    prompt: buildWorkspaceAssistantPrompt(parsedInput),
    output: { schema: workspaceAssistantOutputSchema },
  });

  if (!output) {
    throw new Error('Workspace assistant could not prepare a response.');
  }

  return {
    intent: output.intent,
    summary: output.summary,
    answer: output.answer,
    warnings: output.warnings,
    matches: resolveWorkspaceAssistantMatches(parsedInput, output.matches),
    customer: output.customer,
    quote: output.quote,
    invoice: output.invoice,
  };
}
