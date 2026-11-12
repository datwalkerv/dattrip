export interface HotelRate {
  offerId: string;
  roomName: string;
  boardCode: string;
  boardName: string;
  breakfastIncluded: boolean;
  refundable: boolean;
  freeCancellationUntil?: string;
  /** Total for the whole stay and all rooms, including taxes the provider marks as included. */
  total: number;
  /** Mandatory fees the provider marks as not included (paid at the property). */
  payAtProperty: number;
  currency: string;
}

export interface HotelOffer {
  id: string;
  provider: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  distanceKm: number;
  /** Guest rating out of 10. */
  rating: number;
  reviewCount: number;
  stars?: number;
  photo?: string;
  checkin: string;
  checkout: string;
  nights: number;
  cheapestRate: HotelRate;
  /** Cheapest rate that includes breakfast, when one was returned. */
  breakfastRate?: HotelRate;
  bookingUrl: string;
  fetchedAt: string;
}

/** A hotel with the rate dattrip picked for it and why. */
export interface RankedHotel extends HotelOffer {
  rate: HotelRate;
  reasons: string[];
}

export interface HotelDetails {
  id: string;
  description?: string;
  address?: string;
  images: string[];
}
