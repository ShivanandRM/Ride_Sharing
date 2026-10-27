import {
  Car,
  CreditCard,
  History,
  MapPin,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode, type FormEvent } from "react";
import { getRideHistory } from "../rideStore";

const API = "http://localhost:5000";

type Coordinates = {
  lat: number;
  lon: number;
};

type Journey = {
  id: string;
  driverName: string;
  startLocation: string;
  destination: string;
  departureTime: string;
  vehicle: string;
  totalSeats: number;
  availableSeats: number;
  farePerKm: number;
  status: string;
  estimatedFare?: number;
  fare?: number;
};

type RideRequest = {
  id: string;
  journeyId: string;
  passengerName: string;
  pickup: string;
  destination: string;
  seatsRequested: number;
  paymentMethod: string;
  status: string;
};

async function geocodeLocation(query: string) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
  );

  if (!response.ok) {
    throw new Error("Unable to search for this location. Try again.");
  }

  const results = await response.json();

  if (!results?.length) {
    throw new Error(`Location not found: ${query}`);
  }

  return {
    name: results[0].display_name || query,
    coordinates: {
      lat: Number(results[0].lat),
      lon: Number(results[0].lon),
    } as Coordinates,
  };
}

function formatDate(value?: string) {
  if (!value) return "Time not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export default function PassengerDashboard() {
  const rideHistory = getRideHistory();

  const completedRides = rideHistory.length;

  const totalSpent = rideHistory.reduce(
    (total, ride) => total + ride.fare,
    0
  );

  const [passengerName, setPassengerName] = useState(
    () => localStorage.getItem("rideflow_passenger_name") || ""
  );

  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [seatsRequested, setSeatsRequested] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("UPI");

  const [matches, setMatches] = useState<Journey[]>([]);
  const [myRequests, setMyRequests] = useState<RideRequest[]>([]);

  const [pickupCoordinates, setPickupCoordinates] =
    useState<Coordinates | null>(null);

  const [destinationCoordinates, setDestinationCoordinates] =
    useState<Coordinates | null>(null);

  const [loadingMatches, setLoadingMatches] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeRide, setActiveRide] = useState("None");

  useEffect(() => {
    localStorage.setItem("rideflow_passenger_name", passengerName);

    const checkActiveRide = () => {
      try {
        const savedRide = localStorage.getItem("rideflow_current_ride");

        if (!savedRide) {
          setActiveRide("None");
          return;
        }

        const ride = JSON.parse(savedRide);

        if (ride.status === "COMPLETED") {
          setActiveRide("None");
        } else if (ride.status === "REQUESTED") {
          setActiveRide("Requested");
        } else if (ride.status === "ACCEPTED") {
          setActiveRide("Accepted");
        } else if (ride.status === "STARTED") {
          setActiveRide("In Progress");
        } else {
          setActiveRide("None");
        }
      } catch {
        setActiveRide("None");
      }
    };

    checkActiveRide();

    const interval = window.setInterval(checkActiveRide, 2000);

    return () => window.clearInterval(interval);
  }, [passengerName]);

  const loadMyRequests = useCallback(async () => {
    if (!passengerName.trim()) {
      setMyRequests([]);
      return;
    }

    setLoadingRequests(true);

    try {
      const response = await fetch(`${API}/api/requests`);

      if (!response.ok) {
        throw new Error("Unable to load requests.");
      }

      const data = await response.json();

      const requests: RideRequest[] = Array.isArray(data)
        ? data
        : Array.isArray(data.requests)
          ? data.requests
          : [];

      setMyRequests(
        requests.filter(
          (request) =>
            request.passengerName?.trim().toLowerCase() ===
            passengerName.trim().toLowerCase()
        )
      );
    } catch {
      // The dashboard remains usable if the server is temporarily unavailable.
    } finally {
      setLoadingRequests(false);
    }
  }, [passengerName]);

  useEffect(() => {
    void loadMyRequests();

    const interval = window.setInterval(() => {
      void loadMyRequests();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadMyRequests]);

  const searchJourneys = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setMatches([]);

    if (!passengerName.trim() || !pickup.trim() || !destination.trim()) {
      setError("Enter your name, pickup location, and destination.");
      return;
    }

    if (pickup.trim().toLowerCase() === destination.trim().toLowerCase()) {
      setError("Pickup and destination must be different.");
      return;
    }

    setLoadingMatches(true);

    try {
      const [pickupLocation, destinationLocation] = await Promise.all([
        geocodeLocation(pickup.trim()),
        geocodeLocation(destination.trim()),
      ]);

      setPickupCoordinates(pickupLocation.coordinates);
      setDestinationCoordinates(destinationLocation.coordinates);

      const params = new URLSearchParams({
        pickup: pickupLocation.name,
        destination: destinationLocation.name,
        pickupLat: String(pickupLocation.coordinates.lat),
        pickupLon: String(pickupLocation.coordinates.lon),
        destinationLat: String(destinationLocation.coordinates.lat),
        destinationLon: String(destinationLocation.coordinates.lon),
      });

      if (departureTime) {
        params.set("departureTime", new Date(departureTime).toISOString());
      }

      const response = await fetch(
        `${API}/api/journeys/match?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Journey search failed."
        );
      }

      const journeys: Journey[] = Array.isArray(data)
        ? data
        : Array.isArray(data.matches)
          ? data.matches
          : Array.isArray(data.journeys)
            ? data.journeys
            : [];

      const availableJourneys = journeys.filter(
        (journey) =>
          journey.status === "ACTIVE" &&
          (journey.availableSeats ?? journey.totalSeats ?? 0) >=
            seatsRequested
      );

      setMatches(availableJourneys);

      if (availableJourneys.length === 0) {
        setSuccess(
          "No matching journeys found. Try another location or departure time."
        );
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingMatches(false);
    }
  };

  const requestSeat = async (journey: Journey) => {
    setError("");
    setSuccess("");

    if (!passengerName.trim()) {
      setError("Enter your name before requesting a seat.");
      return;
    }

    if (!pickupCoordinates || !destinationCoordinates) {
      setError("Search for journeys again to verify your locations.");
      return;
    }

    setSendingRequest(true);

    try {
      const response = await fetch(`${API}/api/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          journeyId: journey.id,
          passengerName: passengerName.trim(),
          pickup: pickup.trim(),
          destination: destination.trim(),
          pickupCoordinates,
          destinationCoordinates,
          seatsRequested,
          paymentMethod,
          ...(departureTime
            ? { departureTime: new Date(departureTime).toISOString() }
            : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Unable to request this seat."
        );
      }

      const request: RideRequest = data.request || data;

      setSuccess(
        "Seat request sent! Wait for the driver to respond."
      );

      setMatches((previous) =>
        previous.filter((item) => item.id !== journey.id)
      );

      localStorage.setItem(
        "rideflow_current_ride",
        JSON.stringify({
          ...request,
          status: request.status || "REQUESTED",
        })
      );

      await loadMyRequests();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSendingRequest(false);
    }
  };

  const cancelRequest = async (requestId: string) => {
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API}/api/requests/${requestId}/cancel`,
        { method: "PATCH" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Unable to cancel.");
      }

      setSuccess("Your request has been cancelled.");
      await loadMyRequests();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const statusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
      case "REQUESTED":
        return "Waiting for driver";
      case "ACCEPTED":
        return "Accepted";
      case "REJECTED":
        return "Rejected";
      case "CANCELLED":
        return "Cancelled";
      case "COMPLETED":
        return "Completed";
      default:
        return status || "Unknown";
    }
  };

  const statusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACCEPTED":
      case "COMPLETED":
        return "bg-green-100 text-green-700";
      case "REJECTED":
      case "CANCELLED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-amber-100 text-amber-700";
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-2xl font-bold text-indigo-600">RideFlow</h1>
            <p className="text-xs text-slate-500">Route-based ride sharing</p>
          </div>

          <div className="text-right">
            <p className="text-sm font-semibold">
              {passengerName || "Passenger"}
            </p>
            <p className="text-xs text-slate-500">Passenger Dashboard</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h2 className="text-3xl font-bold text-slate-900">
          Find a ride along your route
        </h2>

        <p className="mt-2 text-slate-500">
          Join drivers already traveling in your direction. Request a seat
          between your pickup and destination.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active Request"
            value={activeRide}
            icon={<Car size={22} />}
          />
          <StatCard
            title="Completed Rides"
            value={String(completedRides)}
            icon={<History size={22} />}
          />
          <StatCard
            title="Total Spent"
            value={`₹${Math.round(totalSpent)}`}
            icon={<Wallet size={22} />}
          />
          <StatCard
            title="Your Requests"
            value={String(myRequests.length)}
            icon={<Users size={22} />}
          />
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <MapPin size={22} />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Find matching journeys</h3>
                <p className="text-sm text-slate-500">
                  Find drivers whose routes pass near your pickup and
                  destination.
                </p>
              </div>
            </div>

            <form onSubmit={searchJourneys} className="mt-6 space-y-4">
              <InputField label="Your name">
                <input
                  value={passengerName}
                  onChange={(event) => setPassengerName(event.target.value)}
                  placeholder="Enter your name"
                  className="input-field"
                  required
                />
              </InputField>

              <InputField label="Pickup location">
                <input
                  value={pickup}
                  onChange={(event) => setPickup(event.target.value)}
                  placeholder="e.g. RRCE, Kumbalagodu"
                  className="input-field"
                  required
                />
              </InputField>

              <InputField label="Destination">
                <input
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  placeholder="e.g. Majestic Bus Station"
                  className="input-field"
                  required
                />
              </InputField>

              <div className="grid gap-4 sm:grid-cols-2">
                <InputField label="Preferred departure (optional)">
                  <input
                    type="datetime-local"
                    value={departureTime}
                    onChange={(event) => setDepartureTime(event.target.value)}
                    className="input-field"
                  />
                </InputField>

                <InputField label="Seats required">
                  <select
                    value={seatsRequested}
                    onChange={(event) =>
                      setSeatsRequested(Number(event.target.value))
                    }
                    className="input-field"
                  >
                    {[1, 2, 3, 4, 5, 6].map((seats) => (
                      <option key={seats} value={seats}>
                        {seats} {seats === 1 ? "seat" : "seats"}
                      </option>
                    ))}
                  </select>
                </InputField>
              </div>

              <InputField label="Payment method">
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  className="input-field"
                >
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                </select>
              </InputField>

              <button
                type="submit"
                disabled={loadingMatches}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {loadingMatches ? (
                  <Loader2 className="animate-spin" size={19} />
                ) : (
                  <Search size={19} />
                )}
                {loadingMatches ? "Finding journeys..." : "Find matching rides"}
              </button>
            </form>
          </section>

          <aside className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <ShieldCheck size={22} />
            </div>

            <h3 className="mt-4 text-xl font-semibold">How RideFlow works</h3>

            <div className="mt-5 space-y-4 text-sm text-slate-600">
              <Step number="1" text="Enter your pickup and destination." />
              <Step
                number="2"
                text="Find drivers already traveling in your direction."
              />
              <Step
                number="3"
                text="Request a seat and wait for the driver to respond."
              />
              <Step
                number="4"
                text="Share the journey and pay using your selected method."
              />
            </div>
          </aside>
        </div>

        <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold">Matching journeys</h3>
              <p className="mt-1 text-sm text-slate-500">
                Drivers whose journeys may suit your route.
              </p>
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-600">
              {matches.length} found
            </span>
          </div>

          {matches.length === 0 ? (
            <div className="py-12 text-center">
              <Car className="mx-auto text-slate-300" size={40} />
              <p className="mt-3 font-medium text-slate-700">
                No journeys to display
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Search for a route to see available drivers.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {matches.map((journey) => (
                <article
                  key={journey.id}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {journey.driverName || "Driver"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {journey.vehicle || "Vehicle not specified"}
                      </p>
                    </div>
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      Route match
                    </span>
                  </div>

                  <div className="my-4 space-y-3">
                    <LocationRow
                      label="Driver starts"
                      value={journey.startLocation}
                    />
                    <LocationRow
                      label="Driver's destination"
                      value={journey.destination}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                    <div>
                      <p className="text-xs text-slate-500">Departure</p>
                      <p className="mt-1 text-sm font-medium">
                        {formatDate(journey.departureTime)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Available seats</p>
                      <p className="mt-1 flex items-center gap-1 text-sm font-medium">
                        <Users size={15} />
                        {journey.availableSeats ?? journey.totalSeats}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Fare per km</p>
                      <p className="mt-1 text-sm font-medium">
                        ₹{journey.farePerKm ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Estimated fare</p>
                      <p className="mt-1 text-sm font-semibold text-indigo-600">
                        {journey.estimatedFare != null
                          ? `₹${Math.round(journey.estimatedFare)}`
                          : journey.fare != null
                            ? `₹${Math.round(journey.fare)}`
                            : "Shown when confirmed"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void requestSeat(journey)}
                    disabled={
                      sendingRequest ||
                      (journey.availableSeats ?? journey.totalSeats ?? 0) <
                        seatsRequested
                    }
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <CheckCircle2 size={18} />
                    {sendingRequest ? "Sending request..." : "Request a seat"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold">My ride requests</h3>
              <p className="mt-1 text-sm text-slate-500">
                Check whether drivers have responded.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadMyRequests()}
              disabled={loadingRequests}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={loadingRequests ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

          {myRequests.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No requests found for this passenger name yet.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {myRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{request.pickup}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      To: {request.destination}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {request.seatsRequested} seat(s) · {request.paymentMethod}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor(
                        request.status
                      )}`}
                    >
                      {statusLabel(request.status)}
                    </span>

                    {request.status?.toUpperCase() === "REQUESTED" && (
                      <button
                        type="button"
                        onClick={() => void cancelRequest(request.id)}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <CreditCard className="text-indigo-600" size={23} />
            <div>
              <h3 className="text-xl font-semibold">Payment options</h3>
              <p className="text-sm text-slate-500">
                Choose UPI or cash when requesting a seat.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{title}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          {icon}
        </div>
      </div>
      <p className="mt-4 break-words text-2xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function InputField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function LocationRow({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="flex gap-3">
      <MapPin className="mt-0.5 shrink-0 text-indigo-500" size={17} />
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="break-words text-sm font-medium text-slate-800">
          {value || "Not specified"}
        </p>
      </div>
    </div>
  );
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-600">
        {number}
      </span>
      <p>{text}</p>
    </div>
  );
}