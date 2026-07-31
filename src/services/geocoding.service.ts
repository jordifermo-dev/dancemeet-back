import { Injectable, InternalServerErrorException } from '@nestjs/common';

export interface CitySuggestion {
  placeId: string;
  description: string;
}

export interface GeocodeResult {
  city: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
}

interface AddressComponent {
  long_name: string;
  types: string[];
}

function pickCity(components: AddressComponent[], fallback: string): string {
  const match =
    components.find((c) => c.types.includes('locality')) ??
    components.find((c) => c.types.includes('postal_town')) ??
    components.find((c) => c.types.includes('administrative_area_level_2'));
  return match?.long_name ?? fallback;
}

@Injectable()
export class GeocodingService {
  // Two separate keys, each restricted to its own API in Google Cloud Console
  // (Geocoding API / Places API), rather than one key restricted to both.
  private get geocodingApiKey(): string {
    const key = process.env.GOOGLE_GEOCODING_API_KEY;
    if (!key) {
      throw new InternalServerErrorException('GOOGLE_GEOCODING_API_KEY is not configured');
    }
    return key;
  }

  private get placesApiKey(): string {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) {
      throw new InternalServerErrorException('GOOGLE_PLACES_API_KEY is not configured');
    }
    return key;
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<{ city: string; formattedAddress: string } | null> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${this.geocodingApiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status !== 'OK' || !data.results?.length) {
      return null;
    }
    const result = data.results[0];
    return {
      city: pickCity(result.address_components, result.formatted_address),
      formattedAddress: result.formatted_address,
    };
  }

  /** `restrictToCities` narrows results to city-level places (register's city
   * picker); pass false for a specific venue/street address (event location
   * editing), letting Google return addresses/establishments too. */
  async autocomplete(query: string, restrictToCities = true): Promise<CitySuggestion[]> {
    const typesParam = restrictToCities ? '&types=(cities)' : '';
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}${typesParam}&key=${this.placesApiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status !== 'OK') {
      return [];
    }
    return data.predictions.map((prediction: { place_id: string; description: string }) => ({
      placeId: prediction.place_id,
      description: prediction.description,
    }));
  }

  async placeDetails(placeId: string): Promise<GeocodeResult | null> {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=address_component,formatted_address,geometry&key=${this.placesApiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status !== 'OK' || !data.result) {
      return null;
    }
    const result = data.result;
    return {
      city: pickCity(result.address_components, result.formatted_address),
      formattedAddress: result.formatted_address,
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
    };
  }
}
