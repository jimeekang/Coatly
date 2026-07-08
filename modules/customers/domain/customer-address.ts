/**
 * Structural input for composing a customer's full site address.
 *
 * Defined independently in the customers domain (structurally isomorphic to the
 * quotes-domain address builder) so that customer-owned code never depends on
 * the quotes module. Callers may pass either a raw customer row (with the
 * discrete address columns) or a record that already carries a composed
 * `address` string.
 */
export interface CustomerAddressParts {
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  address?: string | null;
}

/**
 * Compose a customer's full site address from discrete address columns.
 *
 * Prefers an already-composed `address` value when present; otherwise joins the
 * discrete address parts with commas, trimming and dropping empty segments.
 * Returns `null` when no address information is available.
 */
export function buildCustomerAddress(
  customer: CustomerAddressParts | null
): string | null {
  if (!customer) return null;
  if ('address' in customer && customer.address) return customer.address;

  const address = [
    customer.address_line1,
    customer.address_line2,
    customer.city,
    customer.state,
    customer.postcode,
  ]
    .map((value) => value?.trim() ?? '')
    .filter(Boolean)
    .join(', ');

  return address || null;
}
