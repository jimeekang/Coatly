import { describe, expect, it } from 'vitest';
import {
  formatStreetAddressWithUnit,
  parseGooglePlaceAddressComponents,
} from './google-places-address';

describe('parseGooglePlaceAddressComponents', () => {
  it('maps an Australian street address into Coatly address fields', () => {
    const result = parseGooglePlaceAddressComponents([
      { long_name: '128', short_name: '128', types: ['street_number'] },
      { long_name: 'Beach Street', short_name: 'Beach St', types: ['route'] },
      { long_name: 'Manly', short_name: 'Manly', types: ['locality'] },
      {
        long_name: 'New South Wales',
        short_name: 'NSW',
        types: ['administrative_area_level_1'],
      },
      { long_name: '2095', short_name: '2095', types: ['postal_code'] },
    ]);

    expect(result).toEqual({
      addressLine1: '128 Beach St',
      addressLine2: '',
      city: 'Manly',
      state: 'NSW',
      postcode: '2095',
    });
  });

  it('uses sublocality as suburb when locality is missing', () => {
    const result = parseGooglePlaceAddressComponents([
      { long_name: '8', short_name: '8', types: ['street_number'] },
      { long_name: 'High Street', short_name: 'High St', types: ['route'] },
      {
        long_name: 'Fitzroy North',
        short_name: 'Fitzroy North',
        types: ['sublocality_level_1'],
      },
      {
        long_name: 'Victoria',
        short_name: 'VIC',
        types: ['administrative_area_level_1'],
      },
      { long_name: '3068', short_name: '3068', types: ['postal_code'] },
    ]);

    expect(result.city).toBe('Fitzroy North');
  });

  it('maps Places API New address component field names', () => {
    const result = parseGooglePlaceAddressComponents([
      { longText: '42', shortText: '42', types: ['street_number'] },
      { longText: 'King Street', shortText: 'King St', types: ['route'] },
      { longText: 'Newtown', shortText: 'Newtown', types: ['locality'] },
      {
        longText: 'New South Wales',
        shortText: 'NSW',
        types: ['administrative_area_level_1'],
      },
      { longText: '2042', shortText: '2042', types: ['postal_code'] },
    ]);

    expect(result).toEqual({
      addressLine1: '42 King St',
      addressLine2: '',
      city: 'Newtown',
      state: 'NSW',
      postcode: '2042',
    });
  });

  it('extracts unit details into addressLine2 when subpremise is present', () => {
    const result = parseGooglePlaceAddressComponents([
      { longText: '7', shortText: '7', types: ['subpremise'] },
      { longText: '128', shortText: '128', types: ['street_number'] },
      { longText: 'Beach Street', shortText: 'Beach St', types: ['route'] },
      { longText: 'Manly', shortText: 'Manly', types: ['locality'] },
      {
        longText: 'New South Wales',
        shortText: 'NSW',
        types: ['administrative_area_level_1'],
      },
      { longText: '2095', shortText: '2095', types: ['postal_code'] },
    ]);

    expect(result).toEqual({
      addressLine1: '128 Beach St',
      addressLine2: 'Unit 7',
      city: 'Manly',
      state: 'NSW',
      postcode: '2095',
    });
    expect(formatStreetAddressWithUnit(result)).toBe('Unit 7, 128 Beach St');
  });
});
