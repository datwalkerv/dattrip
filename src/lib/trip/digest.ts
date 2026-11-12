import { z } from "zod";
import type { Trip } from "@/types/trip";

/** The facts about a trip the AI is allowed to talk about. Built from real search results only. */
export const TripDigest = z.object({
  destination: z.string().max(80),
  dates: z.string().max(40),
  nights: z.number(),
  currency: z.string().max(3),
  total: z.number(),
  perPerson: z.number(),
  flightPrice: z.number(),
  hotelPrice: z.number(),
  extraCosts: z.number(),
  airline: z.string().max(60),
  outboundStops: z.number(),
  returnStops: z.number().optional(),
  outboundMinutes: z.number().optional(),
  returnMinutes: z.number().optional(),
  hotel: z.string().max(120),
  hotelRating: z.number(),
  hotelReviews: z.number(),
  hotelKmFromCentre: z.number(),
  room: z.string().max(160),
  breakfastIncluded: z.boolean(),
  freeCancellation: z.boolean(),
});
export type TripDigest = z.infer<typeof TripDigest>;

export const tripDigest = (t: Trip): TripDigest => ({
  destination: `${t.destination.city}, ${t.destination.country}`.slice(0, 80),
  dates: `${t.hotel.checkin} to ${t.hotel.checkout}`,
  nights: t.nights,
  currency: t.currency,
  total: t.total,
  perPerson: t.perPerson,
  flightPrice: t.flightPrice,
  hotelPrice: t.hotelPrice,
  extraCosts: t.extraCosts,
  airline: (t.flight.airlineName ?? t.flight.airline).slice(0, 60),
  outboundStops: t.flight.outbound.stops,
  returnStops: t.flight.inbound?.stops,
  outboundMinutes: t.flight.outbound.durationMin,
  returnMinutes: t.flight.inbound?.durationMin,
  hotel: t.hotel.name.slice(0, 120),
  hotelRating: t.hotel.rating,
  hotelReviews: t.hotel.reviewCount,
  hotelKmFromCentre: t.hotel.distanceKm,
  room: t.hotel.rate.roomName.slice(0, 160),
  breakfastIncluded: t.hotel.rate.breakfastIncluded,
  freeCancellation: t.hotel.rate.refundable,
});
