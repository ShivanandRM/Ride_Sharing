import express, { Request, Response } from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// -------------------- TYPES --------------------

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

const journeys: DriverJourney[] = [];
const passengerRequests: PassengerRequest[] = [];

let nextJourneyId = 1;
let nextRequestId = 1;

// -------------------- CONFIGURATION --------------------

const MAX_ROUTE_DEVIATION_KM = 2;
const MAX_TOTAL_DETOUR_KM = 5;
const MAX_DEPARTURE_DIFFERENCE_MINUTES = 60;

// -------------------- VALIDATION --------------------

function isValidCoordinates(value: unknown): value is Coordinates {
  if (!value || typeof value !== "object") {
    return false;
  }

  const point = value as Record<string, unknown>;

  return (
    typeof point.lat === "number" &&
    Number.isFinite(point.lat) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    typeof point.lon === "number" &&
    Number.isFinite(point.lon) &&
    point.lon >= -180 &&
    point.lon <= 180
  );
}

function isValidRoute(value: unknown): value is Coordinates[] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.length <= 10000 &&
    value.every(isValidCoordinates)
  );
}

function isValidDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    Number.isFinite(Date.parse(value))
  );
}

// -------------------- GEOGRAPHIC UTILITIES --------------------

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineDistance(
  pointA: Coordinates,
  pointB: Coordinates
): number {
  const earthRadiusKm = 6371;

  const lat1 = toRadians(pointA.lat);
  const lat2 = toRadians(pointB.lat);

  const deltaLat = toRadians(pointB.lat - pointA.lat);
  const deltaLon = toRadians(pointB.lon - pointA.lon);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) ** 2;

  return (
    2 *
    earthRadiusKm *
    Math.atan2(
      Math.sqrt(Math.min(1, a)),
      Math.sqrt(Math.max(0, 1 - a))
    )
  );
}

function calculateRouteDistances(
  coordinates: Coordinates[]
): number[] {
  const cumulative = [0];

  for (let i = 1; i < coordinates.length; i++) {
    cumulative.push(
      cumulative[i - 1] +
        haversineDistance(coordinates[i - 1], coordinates[i])
    );
  }

  return cumulative;
}

/*
 * Find the nearest point on every route segment.
 *
 * Returns:
 * - distance from the requested point to the route
 * - distance travelled along the route to the nearest point
 *
 * Local projection is used for each short segment. The result is
 * suitable for baseline matching, not precise navigation.
 */
function findNearestRoutePosition(
  point: Coordinates,
  route: Coordinates[],
  cumulative: number[]
): { distanceKm: number; alongRouteKm: number } {
  let bestDistance = Infinity;
  let bestAlongRoute = 0;

  const referenceLatitude = toRadians(point.lat);
  const kmPerDegreeLatitude = 111.32;
  const kmPerDegreeLongitude =
    111.32 * Math.cos(referenceLatitude);

  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];

    const ax = (a.lon - point.lon) * kmPerDegreeLongitude;
    const ay = (a.lat - point.lat) * kmPerDegreeLatitude;

    const bx = (b.lon - point.lon) * kmPerDegreeLongitude;
    const by = (b.lat - point.lat) * kmPerDegreeLatitude;

    const dx = bx - ax;
    const dy = by - ay;

    const denominator = dx * dx + dy * dy;

    let t = 0;

    if (denominator > 0) {
      t = Math.max(
        0,
        Math.min(1, -(ax * dx + ay * dy) / denominator)
      );
    }

    const closestX = ax + t * dx;
    const closestY = ay + t * dy;

    const distanceKm = Math.sqrt(
      closestX * closestX + closestY * closestY
    );

    const segmentDistance =
      cumulative[i + 1] - cumulative[i];

    if (distanceKm < bestDistance) {
      bestDistance = distanceKm;

      bestAlongRoute =
        cumulative[i] + t * segmentDistance;
    }
  }

  return {
    distanceKm: bestDistance,
    alongRouteKm: bestAlongRoute,
  };
}

// -------------------- ROUTE MATCHING --------------------

type RouteMatch = {
  journey: DriverJourney;
  pickupDistanceFromRouteKm: number;
  dropoffDistanceFromRouteKm: number;
  passengerDistanceKm: number;
  detourKm: number;
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
  if (journey.status !== "ACTIVE" || journey.availableSeats < 1) {
    return null;
  }

  const cumulative = calculateRouteDistances(
    journey.routeCoordinates
  );

  const totalRouteDistance = cumulative[cumulative.length - 1];

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

  // Both passenger locations must be close to the driver's route.
  if (
    pickupPosition.distanceKm > MAX_ROUTE_DEVIATION_KM ||
    dropoffPosition.distanceKm > MAX_ROUTE_DEVIATION_KM
  ) {
    return null;
  }

  // The passenger must travel in the same direction as the driver.
  if (
    dropoffPosition.alongRouteKm <= pickupPosition.alongRouteKm
  ) {
    return null;
  }

  const passengerDistanceKm =
    dropoffPosition.alongRouteKm -
    pickupPosition.alongRouteKm;

  if (passengerDistanceKm <= 0) {
    return null;
  }

  /*
   * Approximate extra distance required to leave the planned route
   * and serve the passenger's pickup and drop-off points.
   */
  const detourKm =
    pickupPosition.distanceKm + dropoffPosition.distanceKm;

  if (detourKm > MAX_TOTAL_DETOUR_KM) {
    return null;
  }

  let departureDifferenceMinutes = 0;

  if (requestedDepartureTime) {
    if (!isValidDate(requestedDepartureTime)) {
      return null;
    }

    departureDifferenceMinutes = Math.abs(
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

  const estimatedFare = Math.max(
    1,
    Math.round(passengerDistanceKm * journey.farePerKm)
  );

  /*
   * Higher score means a closer route, smaller detour,
   * and closer departure time.
   */
  const matchScore =
    100 -
    (pickupPosition.distanceKm + dropoffPosition.distanceKm) * 10 -
    detourKm * 5 -
    departureDifferenceMinutes / 10;

  return {
    journey,
    pickupDistanceFromRouteKm: Number(
      pickupPosition.distanceKm.toFixed(2)
    ),
    dropoffDistanceFromRouteKm: Number(
      dropoffPosition.distanceKm.toFixed(2)
    ),
    passengerDistanceKm: Number(passengerDistanceKm.toFixed(2)),
    detourKm: Number(detourKm.toFixed(2)),
    estimatedFare,
    departureDifferenceMinutes: Number(
      departureDifferenceMinutes.toFixed(0)
    ),
    matchScore: Number(matchScore.toFixed(2)),
  };
}

// -------------------- HEALTH CHECK --------------------

app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "RideFlow route-sharing backend is running",
    features: [
      "Driver journey publishing",
      "Geographic route matching",
      "Intermediate pickup and drop-off",
      "Passenger requests",
      "Driver acceptance and rejection",
      "Seat availability management",
    ],
  });
});

// -------------------- DRIVER: PUBLISH JOURNEY --------------------

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

    if (
      typeof driverName !== "string" ||
      !driverName.trim() ||
      typeof startLocation !== "string" ||
      !startLocation.trim() ||
      typeof destination !== "string" ||
      !destination.trim() ||
      !isValidDate(departureTime) ||
      typeof vehicle !== "string" ||
      !vehicle.trim() ||
      !Number.isInteger(totalSeats) ||
      totalSeats < 1 ||
      totalSeats > 20 ||
      typeof farePerKm !== "number" ||
      !Number.isFinite(farePerKm) ||
      farePerKm < 0 ||
      !isValidRoute(routeCoordinates)
    ) {
      return res.status(400).json({
        message:
          "Invalid journey. Provide driverName, startLocation, destination, departureTime, vehicle, totalSeats, farePerKm, and at least two route coordinates.",
      });
    }

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
      routeCoordinates,
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

// -------------------- DRIVER: VIEW JOURNEYS --------------------

app.get("/api/journeys", (_req: Request, res: Response) => {
  res.json(journeys);
});

app.get(
  "/api/journeys/:id",
  (req: Request, res: Response) => {
    const journey = journeys.find(
      (item) => item.id === Number(req.params.id)
    );

    if (!journey) {
      return res.status(404).json({
        message: "Journey not found.",
      });
    }

    return res.json(journey);
  }
);

// -------------------- PASSENGER: SEARCH MATCHING ROUTES --------------------

app.get(
  "/api/journeys/match",
  (req: Request, res: Response) => {
    const pickup = String(req.query.pickup ?? "").trim();
    const destination = String(
      req.query.destination ?? ""
    ).trim();

    const pickupLat = Number(req.query.pickupLat);
    const pickupLon = Number(req.query.pickupLon);
    const destinationLat = Number(req.query.destinationLat);
    const destinationLon = Number(req.query.destinationLon);

    const requestedDepartureTime =
      req.query.departureTime === undefined
        ? undefined
        : String(req.query.departureTime);

    const pickupCoordinates = {
      lat: pickupLat,
      lon: pickupLon,
    };

    const destinationCoordinates = {
      lat: destinationLat,
      lon: destinationLon,
    };

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
      requestedDepartureTime !== undefined &&
      !isValidDate(requestedDepartureTime)
    ) {
      return res.status(400).json({
        message: "Invalid departureTime.",
      });
    }

    const matches = journeys
      .map((journey) =>
        matchJourney(
          journey,
          pickupCoordinates,
          destinationCoordinates,
          requestedDepartureTime
        )
      )
      .filter((match): match is RouteMatch => match !== null)
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
        estimatedDetourKm: match.detourKm,
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

// -------------------- PASSENGER: REQUEST A SEAT --------------------

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
      !Number.isInteger(journeyId) ||
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
        message:
          "Invalid request. Provide journeyId, passengerName, pickup, destination, both coordinate objects, seatsRequested, and paymentMethod.",
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
          "This passenger journey does not match the driver's route, direction, detour, or departure time.",
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
      estimatedFare: match.estimatedFare * seatsRequested,
      paymentMethod,
      status: "REQUESTED",
      createdAt: new Date().toISOString(),
    };

    passengerRequests.push(request);

    return res.status(201).json({
      message: "Request sent to the driver for confirmation.",
      request,
    });
  }
);

// -------------------- DRIVER: VIEW REQUESTS --------------------

app.get(
  "/api/driver/requests",
  (req: Request, res: Response) => {
    const journeyId =
      req.query.journeyId === undefined
        ? undefined
        : Number(req.query.journeyId);

    const results = passengerRequests.filter((request) => {
      const journeyMatches =
        journeyId === undefined ||
        request.journeyId === journeyId;

      return journeyMatches && request.status === "REQUESTED";
    });

    return res.json(results);
  }
);

// -------------------- PASSENGER: VIEW REQUESTS --------------------

app.get(
  "/api/requests",
  (_req: Request, res: Response) => {
    res.json(passengerRequests);
  }
);

app.get(
  "/api/requests/:id",
  (req: Request, res: Response) => {
    const request = passengerRequests.find(
      (item) => item.id === Number(req.params.id)
    );

    if (!request) {
      return res.status(404).json({
        message: "Passenger request not found.",
      });
    }

    return res.json(request);
  }
);

// -------------------- PASSENGER: CANCEL REQUEST --------------------

app.patch(
  "/api/requests/:id/cancel",
  (req: Request, res: Response) => {
    const request = passengerRequests.find(
      (item) => item.id === Number(req.params.id)
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

// -------------------- DRIVER: ACCEPT OR REJECT --------------------

app.patch(
  "/api/requests/:id/respond",
  (req: Request, res: Response) => {
    const requestId = Number(req.params.id);
    const action = req.body.action;

    if (!["ACCEPTED", "REJECTED"].includes(action)) {
      return res.status(400).json({
        message: "Action must be ACCEPTED or REJECTED.",
      });
    }

    const request = passengerRequests.find(
      (item) => item.id === requestId
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
        message: "This journey is no longer accepting requests.",
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

    request.status = action;

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

// -------------------- DRIVER: JOURNEY STATUS --------------------

app.patch(
  "/api/journeys/:id/status",
  (req: Request, res: Response) => {
    const journey = journeys.find(
      (item) => item.id === Number(req.params.id)
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
        message: "This journey is already completed.",
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
    } else if (journey.availableSeats === 0) {
      return res.status(409).json({
        message: "Cannot reactivate a journey with no available seats.",
      });
    }

    return res.json({
      message: `Journey marked ${status.toLowerCase()}.`,
      journey,
    });
  }
);

// -------------------- SERVER --------------------

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(
    `RideFlow route-sharing backend running at http://localhost:${PORT}`
  );
});