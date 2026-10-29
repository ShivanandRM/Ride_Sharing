import express, { Request, Response } from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ======================================================
// TYPES
// ======================================================

type Coordinates = {
  lat: number;
  lon: number;
};

type JourneyStatus = "ACTIVE" | "FULL" | "COMPLETED";

type RequestStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "PICKED_UP"
  | "COMPLETED";

type DriverJourney = {
  id: number;
  driverName: string;
  startLocation: string;
  destination: string;
  departureTime: string;
  vehicle: string;
  totalSeats: number;
  availableSeats: number;
  farePerKm: number;
  routeCoordinates: Coordinates[];
  status: JourneyStatus;
  createdAt: string;
};

type PassengerRequest = {
  id: number;
  journeyId: number;
  passengerName: string;
  pickup: string;
  destination: string;
  pickupCoordinates: Coordinates;
  destinationCoordinates: Coordinates;
  seatsRequested: number;
  estimatedDistanceKm: number;
  estimatedFare: number;
  paymentMethod: "CASH" | "UPI";
  status: RequestStatus;
  createdAt: string;
};

// ======================================================
// IN-MEMORY STORAGE
// ======================================================

const journeys: DriverJourney[] = [];
const passengerRequests: PassengerRequest[] = [];

let nextJourneyId = 1;
let nextRequestId = 1;

// ======================================================
// MATCHING CONFIGURATION
// ======================================================

const MAX_ROUTE_DEVIATION_KM = 2;
const MAX_TOTAL_DETOUR_KM = 5;
const MAX_DEPARTURE_DIFFERENCE_MINUTES = 60;

// ======================================================
// VALIDATION HELPERS
// ======================================================

function isObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isValidCoordinates(
  value: unknown
): value is Coordinates {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.lat === "number" &&
    Number.isFinite(value.lat) &&
    value.lat >= -90 &&
    value.lat <= 90 &&
    typeof value.lon === "number" &&
    Number.isFinite(value.lon) &&
    value.lon >= -180 &&
    value.lon <= 180
  );
}

function normalizeRouteCoordinates(
  value: unknown
): Coordinates[] | null {
  if (
    !Array.isArray(value) ||
    value.length < 2 ||
    value.length > 10000
  ) {
    return null;
  }

  const result: Coordinates[] = [];

  for (const item of value) {
    let point: unknown = item;

    // Accept either { lat, lon } or [latitude, longitude].
    if (Array.isArray(item)) {
      if (
        item.length !== 2 ||
        typeof item[0] !== "number" ||
        typeof item[1] !== "number"
      ) {
        return null;
      }

      point = {
        lat: item[0],
        lon: item[1],
      };
    }

    if (!isValidCoordinates(point)) {
      return null;
    }

    result.push({
      lat: point.lat,
      lon: point.lon,
    });
  }

  return result;
}

function isValidDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    Number.isFinite(Date.parse(value))
  );
}

function validId(value: string): number | null {
  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0
    ? id
    : null;
}

// ======================================================
// DISTANCE CALCULATIONS
// ======================================================

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineDistance(
  a: Coordinates,
  b: Coordinates
): number {
  const earthRadiusKm = 6371;

  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLon = toRadians(b.lon - a.lon);

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) ** 2;

  return (
    2 *
    earthRadiusKm *
    Math.atan2(
      Math.sqrt(Math.min(1, h)),
      Math.sqrt(Math.max(0, 1 - h))
    )
  );
}

function calculateRouteDistances(
  route: Coordinates[]
): number[] {
  const cumulative = [0];

  for (let i = 1; i < route.length; i++) {
    cumulative.push(
      cumulative[i - 1] +
        haversineDistance(route[i - 1], route[i])
    );
  }

  return cumulative;
}

function findNearestRoutePosition(
  point: Coordinates,
  route: Coordinates[],
  cumulative: number[]
): {
  distanceKm: number;
  alongRouteKm: number;
} {
  let bestDistance = Infinity;
  let bestAlongRoute = 0;

  const referenceLatitude = toRadians(point.lat);
  const kmPerDegreeLatitude = 111.32;
  const kmPerDegreeLongitude =
    111.32 * Math.cos(referenceLatitude);

  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];

    const ax =
      (a.lon - point.lon) * kmPerDegreeLongitude;
    const ay =
      (a.lat - point.lat) * kmPerDegreeLatitude;

    const bx =
      (b.lon - point.lon) * kmPerDegreeLongitude;
    const by =
      (b.lat - point.lat) * kmPerDegreeLatitude;

    const dx = bx - ax;
    const dy = by - ay;

    const denominator = dx * dx + dy * dy;

    const t =
      denominator > 0
        ? Math.max(
            0,
            Math.min(
              1,
              -(ax * dx + ay * dy) / denominator
            )
          )
        : 0;

    const closestX = ax + t * dx;
    const closestY = ay + t * dy;

    const distanceKm = Math.sqrt(
      closestX * closestX + closestY * closestY
    );

    if (distanceKm < bestDistance) {
      bestDistance = distanceKm;

      bestAlongRoute =
        cumulative[i] +
        t * (cumulative[i + 1] - cumulative[i]);
    }
  }

  return {
    distanceKm: bestDistance,
    alongRouteKm: bestAlongRoute,
  };
}

// ======================================================
// ROUTE MATCHING ENGINE
// ======================================================

type RouteMatch = {
  journey: DriverJourney;
  pickupDistanceFromRouteKm: number;
  dropoffDistanceFromRouteKm: number;
  passengerDistanceKm: number;
  estimatedDetourKm: number;
  estimatedFare: number;
  departureDifferenceMinutes: number;
  matchScore: number;
};

function matchJourney(
  journey: DriverJourney,
  pickupCoordinates: Coordinates,
  destinationCoordinates: Coordinates,
  requestedDepartureTime?: string
): RouteMatch | null {
  if (
    journey.status !== "ACTIVE" ||
    journey.availableSeats < 1 ||
    journey.routeCoordinates.length < 2
  ) {
    return null;
  }

  if (
    !Number.isFinite(journey.farePerKm) ||
    journey.farePerKm < 0
  ) {
    return null;
  }

  if (!isValidDate(journey.departureTime)) {
    return null;
  }

  const cumulative = calculateRouteDistances(
    journey.routeCoordinates
  );

  const totalRouteDistance =
    cumulative[cumulative.length - 1];

  if (totalRouteDistance <= 0) {
    return null;
  }

  const pickupPosition = findNearestRoutePosition(
    pickupCoordinates,
    journey.routeCoordinates,
    cumulative
  );

  const dropoffPosition = findNearestRoutePosition(
    destinationCoordinates,
    journey.routeCoordinates,
    cumulative
  );

  // Passenger pickup and drop-off must be near the driver's route.
  if (
    pickupPosition.distanceKm > MAX_ROUTE_DEVIATION_KM ||
    dropoffPosition.distanceKm > MAX_ROUTE_DEVIATION_KM
  ) {
    return null;
  }

  // The passenger must board before their drop-off point.
  if (
    dropoffPosition.alongRouteKm <=
    pickupPosition.alongRouteKm
  ) {
    return null;
  }

  const passengerDistanceKm =
    dropoffPosition.alongRouteKm -
    pickupPosition.alongRouteKm;

  // This is a straight-line deviation estimate, not a road detour.
  const estimatedDetourKm =
    pickupPosition.distanceKm +
    dropoffPosition.distanceKm;

  if (estimatedDetourKm > MAX_TOTAL_DETOUR_KM) {
    return null;
  }

  let departureDifferenceMinutes = 0;

  if (requestedDepartureTime !== undefined) {
    if (!isValidDate(requestedDepartureTime)) {
      return null;
    }

    departureDifferenceMinutes =
      Math.abs(
        Date.parse(journey.departureTime) -
          Date.parse(requestedDepartureTime)
      ) / 60000;

    if (
      departureDifferenceMinutes >
      MAX_DEPARTURE_DIFFERENCE_MINUTES
    ) {
      return null;
    }
  }

  const estimatedFare = Math.round(
    passengerDistanceKm * journey.farePerKm
  );

  const rawScore =
    100 -
    (pickupPosition.distanceKm +
      dropoffPosition.distanceKm) *
      10 -
    estimatedDetourKm * 5 -
    departureDifferenceMinutes / 10;

  const matchScore = Math.max(
    0,
    Math.min(100, rawScore)
  );

  return {
    journey,
    pickupDistanceFromRouteKm: Number(
      pickupPosition.distanceKm.toFixed(2)
    ),
    dropoffDistanceFromRouteKm: Number(
      dropoffPosition.distanceKm.toFixed(2)
    ),
    passengerDistanceKm: Number(
      passengerDistanceKm.toFixed(2)
    ),
    estimatedDetourKm: Number(
      estimatedDetourKm.toFixed(2)
    ),
    estimatedFare,
    departureDifferenceMinutes: Math.round(
      departureDifferenceMinutes
    ),
    matchScore: Number(matchScore.toFixed(2)),
  };
}

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "RideFlow route-sharing backend is running",
    endpoints: [
      "GET /api/health",
      "POST /api/journeys",
      "GET /api/journeys",
      "GET /api/journeys/match",
      "GET /api/journeys/:id",
      "PATCH /api/journeys/:id/status",
      "POST /api/requests",
      "GET /api/requests",
      "GET /api/requests/:id",
      "GET /api/driver/requests",
      "PATCH /api/requests/:id/cancel",
      "PATCH /api/requests/:id/respond",
      "PATCH /api/requests/:id/progress",
    ],
  });
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// ======================================================
// DRIVER: PUBLISH JOURNEY
// ======================================================

app.post(
  "/api/journeys",
  (req: Request, res: Response) => {
    const {
      driverName,
      startLocation,
      destination,
      departureTime,
      vehicle,
      totalSeats,
      farePerKm,
      routeCoordinates,
    } = req.body;

    const normalizedRoute =
      normalizeRouteCoordinates(routeCoordinates);

    const errors: string[] = [];

    if (
      typeof driverName !== "string" ||
      !driverName.trim()
    ) {
      errors.push("Invalid driverName");
    }

    if (
      typeof startLocation !== "string" ||
      !startLocation.trim()
    ) {
      errors.push("Invalid startLocation");
    }

    if (
      typeof destination !== "string" ||
      !destination.trim()
    ) {
      errors.push("Invalid destination");
    }

    if (!isValidDate(departureTime)) {
      errors.push("Invalid departureTime");
    } else if (Date.parse(departureTime) <= Date.now()) {
      errors.push("departureTime must be in the future");
    }

    if (
      typeof vehicle !== "string" ||
      !vehicle.trim()
    ) {
      errors.push("Invalid vehicle");
    }

    if (
      !Number.isInteger(totalSeats) ||
      totalSeats < 1 ||
      totalSeats > 20
    ) {
      errors.push("Invalid totalSeats");
    }

    if (
      typeof farePerKm !== "number" ||
      !Number.isFinite(farePerKm) ||
      farePerKm < 0
    ) {
      errors.push("Invalid farePerKm");
    }

    if (normalizedRoute === null) {
      errors.push("Invalid routeCoordinates");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        message: "Journey validation failed.",
        errors,
      });
    }

    const route = normalizedRoute as Coordinates[];

    const journey: DriverJourney = {
      id: nextJourneyId++,
      driverName: driverName.trim(),
      startLocation: startLocation.trim(),
      destination: destination.trim(),
      departureTime,
      vehicle: vehicle.trim(),
      totalSeats,
      availableSeats: totalSeats,
      farePerKm,
      routeCoordinates: route,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    };

    journeys.push(journey);

    return res.status(201).json({
      message: "Journey published successfully.",
      journey,
    });
  }
);

// ======================================================
// LIST JOURNEYS
// ======================================================

app.get("/api/journeys", (_req: Request, res: Response) => {
  return res.json(journeys);
});

// ======================================================
// PASSENGER: SEARCH MATCHING JOURNEYS
// ======================================================

// Declare this before /api/journeys/:id.
app.get(
  "/api/journeys/match",
  (req: Request, res: Response) => {
    const pickup = String(req.query.pickup ?? "").trim();

    const destination = String(
      req.query.destination ?? ""
    ).trim();

    const pickupCoordinates: Coordinates = {
      lat: Number(req.query.pickupLat),
      lon: Number(req.query.pickupLon),
    };

    const destinationCoordinates: Coordinates = {
      lat: Number(req.query.destinationLat),
      lon: Number(req.query.destinationLon),
    };

    const departureTime =
      req.query.departureTime === undefined
        ? undefined
        : String(req.query.departureTime);

    if (
      !pickup ||
      !destination ||
      !isValidCoordinates(pickupCoordinates) ||
      !isValidCoordinates(destinationCoordinates)
    ) {
      return res.status(400).json({
        message:
          "Provide pickup, destination, pickupLat, pickupLon, destinationLat, and destinationLon.",
      });
    }

    if (
      departureTime !== undefined &&
      !isValidDate(departureTime)
    ) {
      return res.status(400).json({
        message: "Invalid departure time.",
      });
    }

    const matches = journeys
      .map((journey) =>
        matchJourney(
          journey,
          pickupCoordinates,
          destinationCoordinates,
          departureTime
        )
      )
      .filter(
        (match): match is RouteMatch => match !== null
      )
      .sort((a, b) => b.matchScore - a.matchScore)
      .map((match) => ({
        journeyId: match.journey.id,
        driverName: match.journey.driverName,
        startLocation: match.journey.startLocation,
        journeyDestination: match.journey.destination,
        departureTime: match.journey.departureTime,
        vehicle: match.journey.vehicle,
        availableSeats: match.journey.availableSeats,
        pickup,
        destination,
        pickupDistanceFromRouteKm:
          match.pickupDistanceFromRouteKm,
        dropoffDistanceFromRouteKm:
          match.dropoffDistanceFromRouteKm,
        passengerDistanceKm: match.passengerDistanceKm,
        estimatedDetourKm: match.estimatedDetourKm,
        estimatedFare: match.estimatedFare,
        departureDifferenceMinutes:
          match.departureDifferenceMinutes,
        matchScore: match.matchScore,
      }));

    return res.json({
      count: matches.length,
      matches,
    });
  }
);

// ======================================================
// JOURNEY DETAILS
// ======================================================

app.get(
  "/api/journeys/:id",
  (req: Request, res: Response) => {
    const id = validId(String(req.params.id));

    if (id === null) {
      return res.status(400).json({
        message: "Invalid journey ID.",
      });
    }

    const journey = journeys.find(
      (item) => item.id === id
    );

    if (!journey) {
      return res.status(404).json({
        message: "Journey not found.",
      });
    }

    return res.json(journey);
  }
);

// ======================================================
// PASSENGER: REQUEST A SEAT
// ======================================================

app.post(
  "/api/requests",
  (req: Request, res: Response) => {
    const {
      journeyId,
      passengerName,
      pickup,
      destination,
      pickupCoordinates,
      destinationCoordinates,
      seatsRequested,
      paymentMethod,
      departureTime,
    } = req.body;

    if (
      !Number.isSafeInteger(journeyId) ||
      journeyId < 1 ||
      typeof passengerName !== "string" ||
      !passengerName.trim() ||
      typeof pickup !== "string" ||
      !pickup.trim() ||
      typeof destination !== "string" ||
      !destination.trim() ||
      !isValidCoordinates(pickupCoordinates) ||
      !isValidCoordinates(destinationCoordinates) ||
      !Number.isInteger(seatsRequested) ||
      seatsRequested < 1 ||
      !["CASH", "UPI"].includes(paymentMethod)
    ) {
      return res.status(400).json({
        message: "Invalid passenger request details.",
      });
    }

    if (
      departureTime !== undefined &&
      !isValidDate(departureTime)
    ) {
      return res.status(400).json({
        message: "Invalid departure time.",
      });
    }

    const journey = journeys.find(
      (item) => item.id === journeyId
    );

    if (!journey || journey.status !== "ACTIVE") {
      return res.status(404).json({
        message: "Active driver journey not found.",
      });
    }

    if (seatsRequested > journey.availableSeats) {
      return res.status(409).json({
        message: "Not enough seats are available.",
      });
    }

    const match = matchJourney(
      journey,
      pickupCoordinates,
      destinationCoordinates,
      departureTime
    );

    if (!match) {
      return res.status(400).json({
        message:
          "The passenger's route does not match this journey.",
      });
    }

    const request: PassengerRequest = {
      id: nextRequestId++,
      journeyId,
      passengerName: passengerName.trim(),
      pickup: pickup.trim(),
      destination: destination.trim(),
      pickupCoordinates,
      destinationCoordinates,
      seatsRequested,
      estimatedDistanceKm: match.passengerDistanceKm,
      estimatedFare:
        match.estimatedFare * seatsRequested,
      paymentMethod,
      status: "REQUESTED",
      createdAt: new Date().toISOString(),
    };

    passengerRequests.push(request);

    return res.status(201).json({
      message: "Seat request sent to the driver.",
      request,
    });
  }
);

// ======================================================
// DRIVER: VIEW PENDING REQUESTS
// ======================================================

app.get(
  "/api/driver/requests",
  (req: Request, res: Response) => {
    const rawJourneyId = req.query.journeyId;

    const journeyId =
      rawJourneyId === undefined
        ? undefined
        : Number(rawJourneyId);

    if (
      journeyId !== undefined &&
      (!Number.isSafeInteger(journeyId) || journeyId < 1)
    ) {
      return res.status(400).json({
        message: "Invalid journey ID.",
      });
    }

    const results = passengerRequests.filter(
      (request) =>
        (journeyId === undefined ||
          request.journeyId === journeyId) &&
        request.status === "REQUESTED"
    );

    return res.json(results);
  }
);

// ======================================================
// LIST ALL REQUESTS
// ======================================================

app.get(
  "/api/requests",
  (_req: Request, res: Response) => {
    return res.json(passengerRequests);
  }
);

// ======================================================
// REQUEST DETAILS
// ======================================================

app.get(
  "/api/requests/:id",
  (req: Request, res: Response) => {
    const id = validId(String(req.params.id));

    if (id === null) {
      return res.status(400).json({
        message: "Invalid request ID.",
      });
    }

    const request = passengerRequests.find(
      (item) => item.id === id
    );

    if (!request) {
      return res.status(404).json({
        message: "Passenger request not found.",
      });
    }

    return res.json(request);
  }
);

// ======================================================
// PASSENGER: CANCEL REQUEST
// ======================================================

app.patch(
  "/api/requests/:id/cancel",
  (req: Request, res: Response) => {
    const id = validId(String(req.params.id));

    if (id === null) {
      return res.status(400).json({
        message: "Invalid request ID.",
      });
    }

    const request = passengerRequests.find(
      (item) => item.id === id
    );

    if (!request || request.status !== "REQUESTED") {
      return res.status(409).json({
        message: "Only pending requests can be cancelled.",
      });
    }

    request.status = "CANCELLED";

    return res.json({
      message: "Request cancelled.",
      request,
    });
  }
);

// ======================================================
// DRIVER: ACCEPT OR REJECT REQUEST
// ======================================================

app.patch(
  "/api/requests/:id/respond",
  (req: Request, res: Response) => {
    const id = validId(String(req.params.id));
    const action = req.body.action;

    if (id === null) {
      return res.status(400).json({
        message: "Invalid request ID.",
      });
    }

    if (!["ACCEPTED", "REJECTED"].includes(action)) {
      return res.status(400).json({
        message: "Action must be ACCEPTED or REJECTED.",
      });
    }

    const request = passengerRequests.find(
      (item) => item.id === id
    );

    if (!request || request.status !== "REQUESTED") {
      return res.status(409).json({
        message: "Pending passenger request not found.",
      });
    }

    const journey = journeys.find(
      (item) => item.id === request.journeyId
    );

    if (!journey || journey.status !== "ACTIVE") {
      return res.status(409).json({
        message:
          "This journey is no longer accepting requests.",
      });
    }

    if (
      action === "ACCEPTED" &&
      journey.availableSeats < request.seatsRequested
    ) {
      return res.status(409).json({
        message: "Not enough seats remain.",
      });
    }

    if (action === "ACCEPTED") {
      journey.availableSeats -= request.seatsRequested;

      if (journey.availableSeats === 0) {
        journey.status = "FULL";
      }
    }

    request.status = action as "ACCEPTED" | "REJECTED";

    return res.json({
      message:
        action === "ACCEPTED"
          ? "Passenger request accepted."
          : "Passenger request rejected.",
      request,
      journey,
    });
  }
);

// ======================================================
// DRIVER: UPDATE PASSENGER PROGRESS
// ======================================================

app.patch(
  "/api/requests/:id/progress",
  (req: Request, res: Response) => {
    const id = validId(String(req.params.id));
    const { status } = req.body;

    if (id === null) {
      return res.status(400).json({
        message: "Invalid request ID.",
      });
    }

    if (!["PICKED_UP", "COMPLETED"].includes(status)) {
      return res.status(400).json({
        message: "Status must be PICKED_UP or COMPLETED.",
      });
    }

    const request = passengerRequests.find(
      (item) => item.id === id
    );

    if (!request) {
      return res.status(404).json({
        message: "Passenger request not found.",
      });
    }

    if (
      status === "PICKED_UP" &&
      request.status !== "ACCEPTED"
    ) {
      return res.status(409).json({
        message: "Only accepted passengers can be picked up.",
      });
    }

    if (
      status === "COMPLETED" &&
      request.status !== "PICKED_UP"
    ) {
      return res.status(409).json({
        message:
          "Pick up the passenger before completing the trip.",
      });
    }

    request.status = status as "PICKED_UP" | "COMPLETED";

    return res.json({
      message: `Passenger status updated to ${status}.`,
      request,
    });
  }
);

// ======================================================
// DRIVER: UPDATE JOURNEY STATUS
// ======================================================

app.patch(
  "/api/journeys/:id/status",
  (req: Request, res: Response) => {
    const id = validId(String(req.params.id));

    if (id === null) {
      return res.status(400).json({
        message: "Invalid journey ID.",
      });
    }

    const journey = journeys.find(
      (item) => item.id === id
    );

    if (!journey) {
      return res.status(404).json({
        message: "Journey not found.",
      });
    }

    const { status } = req.body;

    if (status !== "ACTIVE" && status !== "COMPLETED") {
      return res.status(400).json({
        message: "Status must be ACTIVE or COMPLETED.",
      });
    }

    if (journey.status === "COMPLETED") {
      return res.status(409).json({
        message: "Journey is already completed.",
      });
    }

    if (
      status === "ACTIVE" &&
      journey.availableSeats === 0
    ) {
      return res.status(409).json({
        message:
          "Cannot activate a journey with no available seats.",
      });
    }

    if (
      status === "COMPLETED" &&
      passengerRequests.some(
        (request) =>
          request.journeyId === journey.id &&
          request.status === "PICKED_UP"
      )
    ) {
      return res.status(409).json({
        message:
          "A passenger is still marked as onboard. Complete their request first.",
      });
    }

    journey.status = status;

    if (status === "COMPLETED") {
      for (const request of passengerRequests) {
        if (
          request.journeyId === journey.id &&
          request.status === "ACCEPTED"
        ) {
          request.status = "COMPLETED";
        }
      }
    }

    return res.json({
      message: `Journey marked ${status.toLowerCase()}.`,
      journey,
    });
  }
);

// ======================================================
// START SERVER
// ======================================================

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(
    `RideFlow route-sharing backend running at http://localhost:${PORT}`
  );
});