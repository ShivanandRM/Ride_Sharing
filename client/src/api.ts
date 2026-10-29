const API_BASE_URL = "http://localhost:5000/api";

/* =========================
   TYPES
========================= */

export interface Coordinates {
  lat: number;
  lon: number;
}

export type VehicleType = "BIKE" | "AUTO" | "CAR";

export type PaymentMethod = "UPI" | "CASH";

export type JourneyStatus = "ACTIVE" | "FULL" | "COMPLETED";

export type RequestStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "PICKED_UP"
  | "COMPLETED";

export interface Journey {
  id: number;
  journeyId?: number;

  driverName: string;

  startLocation: string;
  destination: string;
  departureTime: string;

  vehicle: string;

  totalSeats: number;
  availableSeats: number;

  farePerKm: number;

  // Optional because the backend does not store these separately.
  startLat?: number;
  startLon?: number;
  destinationLat?: number;
  destinationLon?: number;

  routeCoordinates: Coordinates[];

  status?: JourneyStatus | string;
  createdAt?: string;
}

export interface JourneyMatch {
  journeyId: number;

  driverName: string;

  startLocation: string;
  journeyDestination: string;

  departureTime: string;
  vehicle: string;

  availableSeats: number;

  pickup: string;
  destination: string;

  passengerDistanceKm: number;
  estimatedDetourKm: number;
  estimatedFare: number;

  matchScore: number;

  // Additional route-matching details returned by the backend.
  pickupDistanceFromRouteKm?: number;
  dropoffDistanceFromRouteKm?: number;
  departureDifferenceMinutes?: number;
}

export interface RideRequest {
  id: number;
  journeyId: number;

  passengerName: string;

  pickup: string;
  destination: string;

  seatsRequested: number;

  paymentMethod: PaymentMethod;

  status: RequestStatus | string;

  createdAt?: string;
}

/* =========================
   API ERROR
========================= */

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(
    message: string,
    status: number,
    details?: unknown
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.details = details;

    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/* =========================
   COMMON API REQUEST
========================= */

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,

      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "Cannot connect to the RideFlow backend. " +
        "Make sure the server is running at http://localhost:5000."
    );
  }

  const text = await response.text();

  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    if (typeof data === "object" && data !== null) {
      const errorData = data as {
        message?: string;
        error?: string;
      };

      message =
        errorData.message ||
        errorData.error ||
        message;
    } else if (typeof data === "string" && data.length > 0) {
      message = data;
    }

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

/* =========================
   RESPONSE HELPERS
========================= */

function normalizeJourneys(
  response: { journeys?: Journey[] } | Journey[] | null
): Journey[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (
    response &&
    Array.isArray(response.journeys)
  ) {
    return response.journeys;
  }

  return [];
}

function normalizeRequests(
  response: { requests?: RideRequest[] } | RideRequest[] | null
): RideRequest[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (
    response &&
    Array.isArray(response.requests)
  ) {
    return response.requests;
  }

  return [];
}

/* =========================
   RIDEFLOW API
========================= */

export const rideFlowApi = {
  /* -------------------------
     Backend health
  ------------------------- */

  health: () =>
    apiRequest<{
      status?: string;
      message?: string;
    }>("/health"),

  /* -------------------------
     Driver: publish journey
  ------------------------- */

  publishJourney: (
    journey: Omit<
      Journey,
      | "id"
      | "journeyId"
      | "availableSeats"
      | "status"
      | "createdAt"
    >
  ) =>
    apiRequest<{
      message: string;
      journey: Journey;
    }>("/journeys", {
      method: "POST",
      body: JSON.stringify(journey),
    }),

  /* -------------------------
     Get all published journeys
  ------------------------- */

  getJourneys: async (): Promise<Journey[]> => {
    const response = await apiRequest<
      { journeys?: Journey[] } | Journey[]
    >("/journeys");

    return normalizeJourneys(response);
  },

  /* -------------------------
     Get one journey
  ------------------------- */

  getJourney: (journeyId: number) =>
    apiRequest<Journey>(`/journeys/${journeyId}`),

  /* -------------------------
     Passenger: search matching routes
  ------------------------- */

  findMatches: (params: {
    pickup: string;
    destination: string;

    pickupLat: number;
    pickupLon: number;

    destinationLat: number;
    destinationLon: number;

    departureTime?: string;
  }) => {
    const query = new URLSearchParams({
      pickup: params.pickup,
      destination: params.destination,

      pickupLat: String(params.pickupLat),
      pickupLon: String(params.pickupLon),

      destinationLat: String(params.destinationLat),
      destinationLon: String(params.destinationLon),
    });

    if (params.departureTime) {
      query.set("departureTime", params.departureTime);
    }

    return apiRequest<{
      count: number;
      matches: JourneyMatch[];
    }>(`/journeys/match?${query.toString()}`);
  },

  /* -------------------------
     Passenger: request seats
  ------------------------- */

  createRequest: (request: {
    journeyId: number;

    passengerName: string;

    pickup: string;
    destination: string;

    pickupCoordinates: Coordinates;
    destinationCoordinates: Coordinates;

    seatsRequested: number;

    paymentMethod: PaymentMethod;

    departureTime?: string;
  }) =>
    apiRequest<{
      message: string;
      request: RideRequest;
    }>("/requests", {
      method: "POST",
      body: JSON.stringify(request),
    }),

  /* -------------------------
     Driver: retrieve requests
  ------------------------- */

  getDriverRequests: async (
    journeyId?: number
  ): Promise<RideRequest[]> => {
    const query =
      journeyId !== undefined
        ? `?journeyId=${encodeURIComponent(String(journeyId))}`
        : "";

    const response = await apiRequest<
      { requests?: RideRequest[] } | RideRequest[]
    >(`/driver/requests${query}`);

    return normalizeRequests(response);
  },

  /* -------------------------
     Driver: accept or reject
  ------------------------- */

  respondToRequest: (
    requestId: number,
    action: "ACCEPTED" | "REJECTED"
  ) =>
    apiRequest<{
      message: string;
      request: RideRequest;
    }>(`/requests/${requestId}/respond`, {
      method: "PATCH",
      body: JSON.stringify({ action }),
    }),

  /* -------------------------
     Passenger: cancel request
  ------------------------- */

  cancelRequest: (requestId: number) =>
    apiRequest<{
      message: string;
    }>(`/requests/${requestId}/cancel`, {
      method: "PATCH",
    }),

  /* -------------------------
     Retrieve one request
  ------------------------- */

  getRequest: (requestId: number) =>
    apiRequest<RideRequest>(`/requests/${requestId}`),

  /* -------------------------
     Update journey status
     Backend accepts ACTIVE or COMPLETED.
     The backend manages FULL automatically.
  ------------------------- */

  updateJourneyStatus: (
    journeyId: number,
    status: "ACTIVE" | "COMPLETED"
  ) =>
    apiRequest<{
      message: string;
    }>(`/journeys/${journeyId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  /* -------------------------
     Update passenger journey progress
  ------------------------- */

  updateRequestProgress: (
    requestId: number,
    status: "PICKED_UP" | "COMPLETED"
  ) =>
    apiRequest<{
      message: string;
    }>(`/requests/${requestId}/progress`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};