import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  MapPin,
  Search,
  ShieldCheck,
  UserRound,
  Bike,
  Car,
  Navigation,
  Clock,
  IndianRupee,
} from "lucide-react";

import RideMap from "../components/RideMap";
import { createRide, currentRide } from "../rideStore";

type VehicleType = "BIKE" | "AUTO" | "CAB" | "PREMIUM_CAB";
type PaymentMethod = "CASH" | "UPI";

function HomePage() {
  const [distance, setDistance] = useState(0);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("UPI");

  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");

  const [showVehicles, setShowVehicles] = useState(false);
  const [selectedVehicle, setSelectedVehicle] =
    useState<VehicleType>("CAB");

  const [rideRequested, setRideRequested] = useState(false);
  const [rideStatus, setRideStatus] = useState("REQUESTED");

  useEffect(() => {
    const savedRide = localStorage.getItem("rideflow_current_ride");

    if (!savedRide) {
      setRideRequested(false);
      setRideStatus("REQUESTED");
      return;
    }

    try {
      const ride = JSON.parse(savedRide);
      setRideRequested(true);
      setRideStatus(ride.status || "REQUESTED");
      setPickup(ride.pickup || "");
      setDestination(ride.destination || "");
    } catch (error) {
      console.error("Failed to read saved ride:", error);
    }
  }, []);

  useEffect(() => {
    const checkRideStatus = () => {
      const savedRide = localStorage.getItem("rideflow_current_ride");

      if (!savedRide) {
        return;
      }

      try {
        const ride = JSON.parse(savedRide);
        setRideRequested(true);
        setRideStatus(ride.status || "REQUESTED");
      } catch (error) {
        console.error("Failed to read current ride:", error);
      }
    };

    checkRideStatus();

    const interval = window.setInterval(checkRideStatus, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const calculateFare = (vehicle: VehicleType): number => {
    const actualDistance = Math.max(distance, 0);

    switch (vehicle) {
      case "BIKE":
        return Math.round(30 + actualDistance * 8);

      case "AUTO":
        return Math.round(40 + actualDistance * 12);

      case "CAB":
        return Math.round(60 + actualDistance * 15);

      case "PREMIUM_CAB":
        return Math.round(100 + actualDistance * 20);

      default:
        return 0;
    }
  };

  const handleBookRide = () => {
    if (!pickup.trim() || !destination.trim()) {
      alert("Please enter pickup and destination.");
      return;
    }

    if (
      pickup.trim().toLowerCase() ===
      destination.trim().toLowerCase()
    ) {
      alert("Pickup and destination must be different.");
      return;
    }

    localStorage.removeItem("rideflow_current_ride");

    setRideRequested(false);
    setRideStatus("REQUESTED");
    setShowVehicles(true);
    setDistance(0);
  };

  const handleConfirmRide = () => {
    if (!pickup.trim() || !destination.trim()) {
      alert("Please enter pickup and destination.");
      return;
    }

    if (
      pickup.trim().toLowerCase() ===
      destination.trim().toLowerCase()
    ) {
      alert("Pickup and destination must be different.");
      return;
    }

    if (distance <= 0) {
      alert(
        "Please wait for the route and fare to be calculated."
      );
      return;
    }

    const calculatedFare = calculateFare(selectedVehicle);

    try {
      createRide({
        pickup: pickup.trim(),
        destination: destination.trim(),
        vehicle: selectedVehicle,
        fare: calculatedFare,
        paymentMethod,
        status: "REQUESTED",
      });

      setRideRequested(true);
      setRideStatus("REQUESTED");
      setShowVehicles(false);

      alert("Ride requested successfully!");
    } catch (error) {
      console.error("Unable to save ride:", error);
      alert("Unable to save your ride. Please try again.");
    }
  };

  const handleBookAnotherRide = () => {
    localStorage.removeItem("rideflow_current_ride");

    setRideRequested(false);
    setRideStatus("REQUESTED");
    setShowVehicles(false);
    setPickup("");
    setDestination("");
    setSelectedVehicle("CAB");
    setPaymentMethod("UPI");
    setDistance(0);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-indigo-600">
              RideFlow
            </h1>
            <p className="text-xs text-slate-500">
              Move smarter
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Login
            </button>

            <button
              type="button"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Sign Up
            </button>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <UserRound size={20} />
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">
              <ShieldCheck size={17} />
              Safe & reliable rides
            </div>

            <h2 className="text-5xl font-bold leading-tight tracking-tight text-slate-950">
              Your ride.
              <br />
              Your route.
              <br />
              <span className="text-indigo-600">
                Your way.
              </span>
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Book comfortable and affordable rides with
              transparent fares and flexible payment options.
            </p>

            <div className="mt-8 rounded-2xl border bg-white p-5 shadow-lg">
              <h3 className="mb-5 text-lg font-semibold">
                Where are you going?
              </h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-xl border p-4">
                  <MapPin
                    className="text-green-600"
                    size={20}
                  />

                  <div className="flex-1">
                    <p className="text-xs text-slate-500">
                      Pickup location
                    </p>

                    <input
                      value={pickup}
                      onChange={(event) =>
                        setPickup(event.target.value)
                      }
                      placeholder="Enter pickup location"
                      className="mt-1 w-full bg-transparent font-medium outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border p-4">
                  <Search
                    className="text-indigo-600"
                    size={20}
                  />

                  <div className="flex-1">
                    <p className="text-xs text-slate-500">
                      Destination
                    </p>

                    <input
                      id="destination-input"
                      type="text"
                      value={destination}
                      onChange={(event) =>
                        setDestination(event.target.value)
                      }
                      placeholder="Enter destination"
                      autoComplete="off"
                      className="mt-1 w-full bg-transparent font-medium outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleBookRide}
                  className="w-full rounded-xl bg-indigo-600 py-4 font-semibold text-white transition hover:bg-indigo-700"
                >
                  Book a Ride
                </button>
              </div>
            </div>

            {showVehicles && !rideRequested && (
              <div className="mt-6 rounded-2xl border bg-white p-5 shadow-lg">
                <h3 className="mb-4 text-lg font-semibold">
                  Choose your ride
                </h3>

                {distance <= 0 ? (
                  <div className="mb-4 rounded-xl bg-indigo-50 p-4 text-center">
                    <p className="font-medium text-indigo-700">
                      Calculating route and fare...
                    </p>

                    <p className="mt-1 text-sm text-indigo-500">
                      Please wait for the map to calculate the road
                      distance.
                    </p>
                  </div>
                ) : (
                  <div className="mb-4 rounded-xl bg-green-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-700">
                        Road Distance
                      </span>

                      <span className="font-bold text-green-800">
                        {distance.toFixed(2)} km
                      </span>
                    </div>
                  </div>
                )}

                <div
                  className={`space-y-3 ${
                    distance <= 0
                      ? "pointer-events-none opacity-50"
                      : ""
                  }`}
                >
                  <VehicleCard
                    name="Bike"
                    description="Affordable & quick"
                    price={
                      distance > 0
                        ? `₹${calculateFare("BIKE")}`
                        : "Calculating..."
                    }
                    icon={<Bike size={24} />}
                    selected={selectedVehicle === "BIKE"}
                    onClick={() => setSelectedVehicle("BIKE")}
                  />

                  <VehicleCard
                    name="Auto"
                    description="Comfortable everyday ride"
                    price={
                      distance > 0
                        ? `₹${calculateFare("AUTO")}`
                        : "Calculating..."
                    }
                    icon={<Car size={24} />}
                    selected={selectedVehicle === "AUTO"}
                    onClick={() => setSelectedVehicle("AUTO")}
                  />

                  <VehicleCard
                    name="Cab"
                    description="Comfortable private ride"
                    price={
                      distance > 0
                        ? `₹${calculateFare("CAB")}`
                        : "Calculating..."
                    }
                    icon={<Car size={24} />}
                    selected={selectedVehicle === "CAB"}
                    onClick={() => setSelectedVehicle("CAB")}
                  />

                  <VehicleCard
                    name="Premium Cab"
                    description="Premium comfort"
                    price={
                      distance > 0
                        ? `₹${calculateFare("PREMIUM_CAB")}`
                        : "Calculating..."
                    }
                    icon={<Car size={24} />}
                    selected={
                      selectedVehicle === "PREMIUM_CAB"
                    }
                    onClick={() =>
                      setSelectedVehicle("PREMIUM_CAB")
                    }
                  />
                </div>

                {distance > 0 && (
                  <div className="mt-4 rounded-2xl border bg-white p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800">
                      Selected Ride
                    </h3>

                    <div className="mt-3 flex justify-between">
                      <span className="text-slate-500">
                        Vehicle
                      </span>
                      <span className="font-semibold">
                        {selectedVehicle.replace("_", " ")}
                      </span>
                    </div>

                    <div className="mt-2 flex justify-between">
                      <span className="text-slate-500">
                        Distance
                      </span>
                      <span className="font-semibold">
                        {distance.toFixed(2)} km
                      </span>
                    </div>

                    <div className="mt-2 flex justify-between">
                      <span className="text-slate-500">
                        Estimated Fare
                      </span>
                      <span className="font-semibold text-indigo-600">
                        ₹{calculateFare(selectedVehicle)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium text-slate-700">
                    Payment Method
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("UPI")}
                      className={`rounded-xl border p-3 font-medium ${
                        paymentMethod === "UPI"
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-slate-300"
                      }`}
                    >
                      UPI
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("CASH")}
                      className={`rounded-xl border p-3 font-medium ${
                        paymentMethod === "CASH"
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-slate-300"
                      }`}
                    >
                      Cash
                    </button>
                  </div>
                </div>

                <div className="mt-5 rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <Navigation
                      size={18}
                      className="text-indigo-600"
                    />

                    <div>
                      <p className="text-sm font-medium">
                        {pickup}
                      </p>
                      <p className="text-xs text-slate-500">
                        Pickup
                      </p>
                    </div>
                  </div>

                  <div className="my-3 ml-2 h-5 border-l border-dashed border-slate-300" />

                  <div className="flex items-center gap-3">
                    <MapPin
                      size={18}
                      className="text-red-500"
                    />

                    <div>
                      <p className="text-sm font-medium">
                        {destination}
                      </p>
                      <p className="text-xs text-slate-500">
                        Destination
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmRide}
                  disabled={distance <= 0}
                  className={`mt-5 w-full rounded-xl py-4 font-semibold text-white ${
                    distance > 0
                      ? "bg-green-600 hover:bg-green-700"
                      : "cursor-not-allowed bg-slate-400"
                  }`}
                >
                  {distance > 0
                    ? "Confirm Ride"
                    : "Calculating Fare..."}
                </button>
              </div>
            )}

            {rideRequested && (
              <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-6 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                    <MapPin size={24} />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-green-800">
                      {rideStatus === "REQUESTED" &&
                        "Ride Requested"}

                      {rideStatus === "ACCEPTED" &&
                        "Driver Accepted Your Ride"}

                      {rideStatus === "STARTED" &&
                        "Ride In Progress"}

                      {rideStatus === "COMPLETED" &&
                        "Ride Completed"}
                    </h3>

                    <p className="mt-1 text-sm text-slate-600">
                      {rideStatus === "REQUESTED" &&
                        "Your ride request has been saved."}

                      {rideStatus === "ACCEPTED" &&
                        "Your driver has accepted the ride."}

                      {rideStatus === "STARTED" &&
                        "Your ride is currently in progress."}

                      {rideStatus === "COMPLETED" &&
                        "Your ride has been completed successfully."}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-xl bg-white p-4">
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-500">
                      Pickup
                    </span>
                    <span className="text-right font-medium">
                      {currentRide?.pickup || pickup}
                    </span>
                  </div>

                  <div className="mt-3 flex justify-between gap-4 text-sm">
                    <span className="text-slate-500">
                      Destination
                    </span>
                    <span className="text-right font-medium">
                      {currentRide?.destination || destination}
                    </span>
                  </div>

                  <div className="mt-3 flex justify-between gap-4 text-sm">
                    <span className="text-slate-500">
                      Vehicle
                    </span>
                    <span className="text-right font-medium">
                      {currentRide?.vehicle || selectedVehicle}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleBookAnotherRide}
                    className="mt-4 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700"
                  >
                    Book Another Ride
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-3xl border bg-white shadow-xl">
              <div className="h-[480px]">
                <RideMap
                  pickup={pickup}
                  destination={destination}
                  onDistanceChange={setDistance}
                />
              </div>

              {distance > 0 && (
                <div className="m-4 rounded-xl bg-white p-4 shadow">
                  <p className="text-sm text-slate-500">
                    Estimated distance
                  </p>

                  <p className="text-lg font-semibold text-slate-800">
                    {distance.toFixed(2)} km
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="border-t bg-white">
          <div className="mx-auto grid max-w-7xl gap-6 px-6 py-12 md:grid-cols-3">
            <Feature
              title="Transparent fares"
              description="Know your estimated fare before confirming your ride."
              icon={<IndianRupee size={22} />}
            />

            <Feature
              title="Flexible payments"
              description="Choose convenient digital or cash payment options."
              icon={<IndianRupee size={22} />}
            />

            <Feature
              title="Safety first"
              description="Ride with verified drivers and access safety features."
              icon={<ShieldCheck size={22} />}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function VehicleCard({
  name,
  description,
  price,
  icon,
  selected,
  onClick,
}: {
  name: string;
  description: string;
  price: string;
  icon: ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${
        selected
          ? "border-indigo-600 bg-indigo-50"
          : "hover:bg-slate-50"
      }`}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white shadow-sm">
        {icon}
      </div>

      <div className="flex-1">
        <p className="font-semibold">{name}</p>
        <p className="text-sm text-slate-500">
          {description}
        </p>
      </div>

      <div className="text-right">
        <p className="font-bold">{price}</p>

        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Clock size={13} />
          ~10 min
        </div>
      </div>
    </button>
  );
}

function Feature({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-6">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white">
        {icon}
      </div>

      <h3 className="text-lg font-semibold">{title}</h3>

      <p className="mt-2 leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}

export default HomePage;