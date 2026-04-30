import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleAddressAutocomplete } from '@/components/forms/GoogleAddressAutocomplete';

function ControlledAutocomplete() {
  const [value, setValue] = useState('');
  const [city, setCity] = useState('');
  const [unit, setUnit] = useState('');

  return (
    <>
      <GoogleAddressAutocomplete
        placeholder="Street address"
        value={value}
        onChange={setValue}
        onAddressSelected={(address) => {
          setCity(address.city);
          setUnit(address.addressLine2);
        }}
        className="field"
      />
      <output aria-label="Selected city">{city}</output>
      <output aria-label="Selected unit">{unit}</output>
    </>
  );
}

describe('GoogleAddressAutocomplete', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-key';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.head.innerHTML = '';
  });

  it('fills the input and parsed address fields when a suggestion is selected', async () => {
    const user = userEvent.setup();
    const fetchFields = vi.fn().mockResolvedValue(undefined);
    const place = {
      addressComponents: [
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
      ],
      fetchFields,
    };
    const prediction = {
      text: { toString: () => '128 Beach Street, Manly NSW, Australia' },
      toPlace: () => place,
    };
    const fetchAutocompleteSuggestions = vi.fn().mockResolvedValue({
      suggestions: [{ placePrediction: prediction }],
    });

    vi.stubGlobal('google', {
      maps: {
        importLibrary: vi.fn().mockResolvedValue({
          AutocompleteSessionToken: class AutocompleteSessionToken {},
          AutocompleteSuggestion: { fetchAutocompleteSuggestions },
        }),
      },
    });

    render(<ControlledAutocomplete />);

    const input = screen.getByPlaceholderText('Street address');
    await user.type(input, '128 beach');

    const option = await screen.findByRole('option', {
      name: '128 Beach Street, Manly NSW, Australia',
    });
    fireEvent.pointerDown(option);

    await waitFor(() => expect(fetchFields).toHaveBeenCalledTimes(1));
    expect(input).toHaveValue('128 Beach St');
    expect(screen.getByLabelText('Selected city')).toHaveTextContent('Manly');
    expect(screen.getByLabelText('Selected unit')).toHaveTextContent('Unit 7');
  });
});
