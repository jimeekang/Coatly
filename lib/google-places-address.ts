export type GooglePlaceAddressComponent = {
  long_name?: string;
  short_name?: string;
  longText?: string;
  shortText?: string;
  types: string[];
};

export type ParsedGooglePlaceAddress = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postcode: string;
};

function findComponent(
  components: GooglePlaceAddressComponent[],
  type: string
): GooglePlaceAddressComponent | undefined {
  return components.find((component) => component.types.includes(type));
}

function longValue(component: GooglePlaceAddressComponent | undefined) {
  return component?.longText ?? component?.long_name ?? '';
}

function shortValue(component: GooglePlaceAddressComponent | undefined) {
  return component?.shortText ?? component?.short_name ?? longValue(component);
}

export function parseGooglePlaceAddressComponents(
  components: GooglePlaceAddressComponent[] | undefined
): ParsedGooglePlaceAddress {
  if (!components?.length) {
    return {
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postcode: '',
    };
  }

  const unitNumber = longValue(findComponent(components, 'subpremise'));
  const premise = longValue(findComponent(components, 'premise'));
  const streetNumber = longValue(findComponent(components, 'street_number'));
  const route = shortValue(findComponent(components, 'route'));
  const city =
    longValue(findComponent(components, 'locality')) ||
    longValue(findComponent(components, 'postal_town')) ||
    longValue(findComponent(components, 'sublocality_level_1')) ||
    longValue(findComponent(components, 'administrative_area_level_2')) ||
    '';
  const addressLine2 = premise || (unitNumber ? `Unit ${unitNumber}` : '');
  const streetAddress = [streetNumber, route].filter(Boolean).join(' ');

  return {
    addressLine1: streetAddress,
    addressLine2,
    city,
    state: shortValue(findComponent(components, 'administrative_area_level_1')),
    postcode: longValue(findComponent(components, 'postal_code')),
  };
}

export function formatStreetAddressWithUnit(address: ParsedGooglePlaceAddress) {
  return [address.addressLine2, address.addressLine1].filter(Boolean).join(', ');
}
