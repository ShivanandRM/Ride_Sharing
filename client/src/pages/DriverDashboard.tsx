import {
  Car,
  CheckCircle,
  Clock,
  IndianRupee,
  MapPin,
  Power,
  Users,
  Route,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const API = "http://localhost:5000";

type Coordinates = {
  lat: number;
  lon: number;
};

type Journey = {
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
  status: "ACTIVE" | "FULL" | "COMPLETED";
};

type PassengerRequest = {
  id: number;
  journeyId: number;
  passengerName: string;
  pickup: string;
  destination: string;
  seatsRequested: number;
  estimatedDistanceKm: number;
  estimatedFare: number;
  paymentMethod: "CASH" | "UPI";
  status: string;
};

export default function DriverDashboard() {
  const [driverName, setDriverName] = useState("Rajesh Kumar");
  const [startLocation, setStartLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [vehicle, setVehicle] = useState("Car");
  const [totalSeats, setTotalSeats] = useState(3);
  const [farePerKm, setFarePerKm] = useState(8);

  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [requests, setRequests] = useState<PassengerRequest[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [journeyResponse, requestResponse] = await Promise.all([
        fetch(`${API}/api/journeys`),
        fetch(`${API}/api/driver/requests`),
      ]);

      if (!journeyResponse.ok || !requestResponse.ok) {
        throw new Error("Could not load driver information.");
      }

      const journeyData: Journey[] = await journeyResponse.json();
      const requestData: PassengerRequest[] =
        await requestResponse.json();

      setJourneys(journeyData);
      setRequests(requestData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the backend."
      );
    }
  }, []);

  useEffect(() => {
    void fetchData();

    const interval = window.setInterval(() => {
      void fetchData();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [fetchData]);

  async function findCoordinates(
    place: string
  ): Promise<Coordinates> {
    const query = encodeURIComponent(`${place}, Karnataka, India`);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in&q=${query}`,
      {
        headers: {
          "Accept-Language": "en",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Location search failed for ${place}.`);
    }

    const results: { lat: string; lon: string }[] =
      await response.json();

    if (!results.length) {
      throw new Error(`Location not found: ${place}.`);
    }

    const result = results[0];

    return {
      lat: Number(result.lat),
      lon: Number(result.lon),
    };
  }

  async function publishJourney(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (startLocation.trim().toLowerCase() ===
          destination.trim().toLowerCase()) {
        throw new Error("Start and destination must be different.");
      }

      const departure = new Date(departureTime);

      if (
        !departureTime ||
        !Number.isFinite(departure.getTime()) ||
        departure.getTime() < Date.now()
      ) {
        throw new Error("Choose a valid future departure time.");
      }

      // Resolve both journey endpoints.
      const [start, end] = await Promise.all([
        findCoordinates(startLocation),
        findCoordinates(destination),
      ]);

      // Retrieve a driving route from OSRM.
      const routeResponse = await fetch(
        `https://router.project-osrm.org/route/v1/driving/` +
          `${start.lon},${start.lat};${end.lon},${end.lat}` +
          `?overview=full&geometries=geojson`
      );

      if (!routeResponse.ok) {
        throw new Error("Could not calculate the driving route.");
      }

      const routeResult = await routeResponse.json();

      if (!routeResult.routes?.length) {
        throw new Error("No driving route was found.");
      }

      const routeCoordinates: Coordinates[] =
        routeResult.routes[0].geometry.coordinates.map(
          ([lon, lat]: [number, number]) => ({
            lat,
            lon,
          })
        );

      const response = await fetch(`${API}/api/journeys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          driverName: driverName.trim(),
          startLocation: startLocation.trim(),
          destination: destination.trim(),
          departureTime: departure.toISOString(),
          vehicle,
          totalSeats,
          farePerKm,
          routeCoordinates,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to publish journey.");
      }

      setMessage("Your planned journey has been published!");
      setStartLocation("");
      setDestination("");
      setDepartureTime("");

      await fetchData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not publish journey."
      );
    } finally {
      setLoading(false);
    }
  }

  async function respondToRequest(
    requestId: number,
    action: "ACCEPTED" | "REJECTED"
  ) {
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API}/api/requests/${requestId}/respond`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Could not update request.");
      }

      setMessage(
        action === "ACCEPTED"
          ? "Passenger request accepted."
          : "Passenger request rejected."
      );

      await fetchData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update passenger request."
      );
    }
  }

  async function completeJourney(journeyId: number) {
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API}/api/journeys/${journeyId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "COMPLETED" }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Could not complete journey.");
      }

      setMessage("Journey marked as completed.");
      await fetchData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not complete journey."
      );
    }
  }

  const activeJourneys = journeys.filter(
    (journey) =>
      journey.status === "ACTIVE" || journey.status === "FULL"
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <div>
            <h1 className="text-2xl font-bold text-indigo-600">
              RideFlow
            </h1>
            <p className="text-sm text-slate-500">
              Route-based ride sharing
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsOnline((value) => !value)}
            className={`flex items-center gap-2 rounded-xl px-4 py-3 font-semibold text-white ${
              isOnline
                ? "bg-green-600 hover:bg-green-700"
                : "bg-slate-600 hover:bg-slate-700"
            }`}
          >
            <Power size={18} />
            {isOnline ? "Available" : "Go Available"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-5 py-8">
        <section>
          <h2 className="text-3xl font-bold">Driver Dashboard</h2>
          <p className="mt-2 text-slate-500">
            Publish journeys you already plan to take and share available seats.
          </p>
        </section>

        {message && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={publishJourney}
            className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                <Route size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold">
                  Publish Your Journey
                </h3>
                <p className="text-sm text-slate-500">
                  Tell passengers where you're already going.
                </p>
              </div>
            </div>

            <label className="block text-sm font-medium">
              Driver name
              <input
                required
                value={driverName}
                onChange={(event) => setDriverName(event.target.value)}
                className="mt-2 w-full rounded-lg border p-3"
                placeholder="Your name"
              />
            </label>

            <label className="block text-sm font-medium">
              Starting point
              <input
                required
                value={startLocation}
                onChange={(event) => setStartLocation(event.target.value)}
                className="mt-2 w-full rounded-lg border p-3"
                placeholder="e.g. Kengeri, Bengaluru"
              />
            </label>

            <label className="block text-sm font-medium">
              Destination
              <input
                required
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                className="mt-2 w-full rounded-lg border p-3"
                placeholder="e.g. Majestic, Bengaluru"
              />
            </label>

            <label className="block text-sm font-medium">
              Departure date and time
              <input
                required
                type="datetime-local"
                value={departureTime}
                onChange={(event) => setDepartureTime(event.target.value)}
                className="mt-2 w-full rounded-lg border p-3"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Vehicle
                <select
                  value={vehicle}
                  onChange={(event) => setVehicle(event.target.value)}
                  className="mt-2 w-full rounded-lg border bg-white p-3"
                >
                  <option>Bike</option>
                  <option>Auto</option>
                  <option>Car</option>
                  <option>SUV</option>
                </select>
              </label>

              <label className="block text-sm font-medium">
                Available seats
                <input
                  required
                  type="number"
                  min={1}
                  max={20}
                  value={totalSeats}
                  onChange={(event) =>
                    setTotalSeats(Number(event.target.value))
                  }
                  className="mt-2 w-full rounded-lg border p-3"
                />
              </label>
            </div>

            <label className="block text-sm font-medium">
              Fare per passenger (₹/km)
              <input
                required
                type="number"
                min={0}
                max={1000}
                step="0.5"
                value={farePerKm}
                onChange={(event) =>
                  setFarePerKm(Number(event.target.value))
                }
                className="mt-2 w-full rounded-lg border p-3"
              />
            </label>

            <button
              disabled={loading || !isOnline}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <Route size={18} />
              )}
              {loading ? "Publishing journey..." : "Publish Journey"}
            </button>

            {!isOnline && (
              <p className="text-center text-sm text-slate-500">
                Select Go Available before publishing.
              </p>
            )}
          </form>

          <div className="space-y-6">
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">
                    Passenger Requests
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Accept or reject requests for your route.
                  </p>
                </div>
                <Users className="text-indigo-600" size={24} />
              </div>

              {requests.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
                  No pending passenger requests.
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-xl border p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold">
                            {request.passengerName}
                          </h4>
                          <p className="mt-1 text-sm text-slate-500">
                            Journey #{request.journeyId}
                          </p>
                        </div>
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                          {request.status}
                        </span>
                      </div>

                      <div className="mt-4 space-y-3 text-sm">
                        <p className="flex items-start gap-2">
                          <MapPin
                            size={17}
                            className="mt-0.5 shrink-0 text-green-600"
                          />
                          Pickup: {request.pickup}
                        </p>
                        <p className="flex items-start gap-2">
                          <MapPin
                            size={17}
                            className="mt-0.5 shrink-0 text-red-500"
                          />
                          Drop-off: {request.destination}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-bold">
                            ₹{request.estimatedFare}
                          </p>
                          <p className="text-xs text-slate-500">
                            {request.seatsRequested} seat(s) ·{" "}
                            {request.paymentMethod}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              void respondToRequest(request.id, "ACCEPTED")
                            }
                            className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() =>
                              void respondToRequest(request.id, "REJECTED")
                            }
                            className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold">Your Vehicle</h3>
              <div className="mt-4 flex items-center gap-4 rounded-xl bg-slate-50 p-4">
                <Car size={32} className="text-indigo-600" />
                <div>
                  <p className="font-semibold">{vehicle}</p>
                  <p className="text-sm text-slate-500">
                    Selected for your next journey
                  </p>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold">Published Journeys</h3>
              <p className="mt-1 text-sm text-slate-500">
                Your planned routes and remaining seats.
              </p>
            </div>
            <button
              onClick={() => void fetchData()}
              className="rounded-lg border p-2 hover:bg-slate-50"
              title="Refresh journeys"
            >
              <RefreshCw size={18} />
            </button>
          </div>

          {activeJourneys.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed p-8 text-center text-slate-500">
              You haven't published a journey yet.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {activeJourneys.map((journey) => (
                <div key={journey.id} className="rounded-xl border p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                      {journey.status}
                    </span>
                    <span className="text-sm text-slate-500">
                      Journey #{journey.id}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <p className="flex items-start gap-2 font-semibold">
                      <MapPin
                        size={18}
                        className="mt-0.5 shrink-0 text-green-600"
                      />
                      {journey.startLocation}
                    </p>
                    <p className="flex items-start gap-2 font-semibold">
                      <MapPin
                        size={18}
                        className="mt-0.5 shrink-0 text-red-500"
                      />
                      {journey.destination}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <p className="flex items-center gap-2 text-slate-600">
                      <Clock size={16} />
                      {new Date(journey.departureTime).toLocaleString()}
                    </p>
                    <p className="flex items-center gap-2 text-slate-600">
                      <Users size={16} />
                      {journey.availableSeats} seats left
                    </p>
                    <p className="flex items-center gap-2 text-slate-600">
                      <Car size={16} />
                      {journey.vehicle}
                    </p>
                    <p className="flex items-center gap-2 text-slate-600">
                      <IndianRupee size={16} />
                      {journey.farePerKm}/km
                    </p>
                  </div>

                  <button
                    onClick={() => void completeJourney(journey.id)}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-green-600 py-2.5 font-semibold text-green-700 hover:bg-green-50"
                  >
                    <CheckCircle size={17} />
                    Complete Journey
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}