import { useEffect, useState } from "react";
import { createRide, currentRide } from "../rideStore";
import RideMap from "../components/RideMap";

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

type VehicleType = "BIKE" | "AUTO" | "CAB" | "PREMIUM_CAB";

function HomePage() {
  const [distance, setDistance] = useState(0);

  const [paymentMethod, setPaymentMethod] =
    useState<"CASH" | "UPI">("UPI");

  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");

  const [showVehicles, setShowVehicles] = useState(false);

  const [selectedVehicle, setSelectedVehicle] =
    useState<VehicleType>("CAB");

  const [rideRequested, setRideRequested] = useState(
    localStorage.getItem("rideflow_current_ride") !== null
  );

  const [rideStatus, setRideStatus] = useState("REQUESTED");

  useEffect(() => {
    const checkRideStatus = () => {
      const savedRide = localStorage.getItem(
        "rideflow_current_ride"
      );

      if (savedRide) {
        const ride = JSON.parse(savedRide);

        setRideRequested(true);
        setRideStatus(ride.status);
      }
    };

    checkRideStatus();

    const interval = setInterval(checkRideStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleBookRide = () => {
    if (!pickup || !destination) {
      alert("Please enter pickup and destination.");
      return;
    }

    // Clear previous ride
    localStorage.removeItem("rideflow_current_ride");

    setRideRequested(false);
    setRideStatus("REQUESTED");
    setShowVehicles(true);
  };

  const calculateFare = (vehicle: VehicleType) => {
    return Math.round(
      vehicle === "BIKE"
        ? 30 + distance * 8
        : vehicle === "AUTO"
        ? 40 + distance * 12
        : vehicle === "CAB"
        ? 60 + distance * 15
        : 100 + distance * 20
    );
  };

  const handleConfirmRide = async () => {
    const ride = {
      pickup,
      destination,
      vehicle: selectedVehicle,
      fare: calculateFare(selectedVehicle),
      paymentMethod,
      status: "REQUESTED" as const,
    };

    try {
      const response = await fetch(
        "http://localhost:5000/api/rides",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(ride),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create ride");
      }

      const data = await response.json();

      console.log("Backend response:", data);

      // Save ride locally so Passenger and Driver dashboards
      // continue using the existing ride flow.
      createRide(ride);

      setRideRequested(true);
      setRideStatus("REQUESTED");
      setShowVehicles(false);

      alert("Ride request created successfully!");
    } catch (error) {
      console.error("Backend request failed:", error);

      alert(
        "Unable to connect to RideFlow server. Make sure the backend is running."
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
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
            <button className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
              Login
            </button>

            <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              Sign Up
            </button>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <UserRound size={20} />
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center">
          {/* Left */}
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

            {/* Booking Card */}
            <div className="mt-8 rounded-2xl border bg-white p-5 shadow-lg">
              <h3 className="mb-5 text-lg font-semibold">
                Where are you going?
              </h3>

              <div className="space-y-3">
                {/* Pickup */}
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
                      onChange={(e) =>
                        setPickup(e.target.value)
                      }
                      placeholder="Enter pickup location"
                      className="mt-1 w-full bg-transparent font-medium outline-none"
                    />
                  </div>
                </div>

                {/* Destination */}
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
                      onChange={(e) =>
                        setDestination(e.target.value)
                      }
                      placeholder="Enter destination"
                      autoComplete="off"
                      className="mt-1 w-full bg-transparent font-medium outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleBookRide}
                  className="w-full rounded-xl bg-indigo-600 py-4 font-semibold text-white transition hover:bg-indigo-700"
                >
                  Book a Ride
                </button>
              </div>
            </div>

            {/* Vehicle Selection */}
            {showVehicles && !rideRequested && (
              <div className="mt-6 rounded-2xl border bg-white p-5 shadow-lg">
                <h3 className="mb-4 text-lg font-semibold">
                  Choose your ride
                </h3>

                <div className="space-y-3">
                  <VehicleCard
                    type="BIKE"
                    name="Bike"
                    description="Affordable & quick"
                    price={`₹${calculateFare("BIKE")}`}
                    icon={<Bike size={24} />}
                    selected={selectedVehicle === "BIKE"}
                    onClick={() =>
                      setSelectedVehicle("BIKE")
                    }
                  />

                  <VehicleCard
                    type="AUTO"
                    name="Auto"
                    description="Comfortable everyday ride"
                    price={`₹${calculateFare("AUTO")}`}
                    icon={<Car size={24} />}
                    selected={selectedVehicle === "AUTO"}
                    onClick={() =>
                      setSelectedVehicle("AUTO")
                    }
                  />

                  <VehicleCard
                    type="CAB"
                    name="Cab"
                    description="Comfortable private ride"
                    price={`₹${calculateFare("CAB")}`}
                    icon={<Car size={24} />}
                    selected={selectedVehicle === "CAB"}
                    onClick={() =>
                      setSelectedVehicle("CAB")
                    }
                  />

                  <VehicleCard
                    type="PREMIUM_CAB"
                    name="Premium Cab"
                    description="Premium comfort"
                    price={`₹${calculateFare("PREMIUM_CAB")}`}
                    icon={<Car size={24} />}
                    selected={
                      selectedVehicle === "PREMIUM_CAB"
                    }
                    onClick={() =>
                      setSelectedVehicle("PREMIUM_CAB")
                    }
                  />
                </div>

                {/* Selected Ride */}
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
                        {selectedVehicle}
                      </span>
                    </div>

                    <div className="mt-2 flex justify-between">
                      <span className="text-slate-500">
                        Distance
                      </span>

                      <span className="font-semibold">
                        {distance.toFixed(1)} km
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

                {/* Payment Method */}
                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium text-slate-700">
                    Payment Method
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentMethod("UPI")
                      }
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
                      onClick={() =>
                        setPaymentMethod("CASH")
                      }
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

                {/* Trip Summary */}
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

                {/* Confirm Ride */}
                <button
                  onClick={handleConfirmRide}
                  className="mt-5 w-full rounded-xl bg-green-600 py-4 font-semibold text-white hover:bg-green-700"
                >
                  Confirm Ride
                </button>
              </div>
            )}

            {/* Ride Status */}
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
                        "Searching for a nearby driver..."}

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
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">
                      Pickup
                    </span>

                    <span className="font-medium">
                      {currentRide?.pickup}
                    </span>
                  </div>

                  <div className="mt-3 flex justify-between text-sm">
                    <span className="text-slate-500">
                      Destination
                    </span>

                    <span className="font-medium">
                      {currentRide?.destination}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      localStorage.removeItem(
                        "rideflow_current_ride"
                      );

                      setRideRequested(false);
                      setRideStatus("REQUESTED");
                      setShowVehicles(false);
                      setPickup("");
                      setDestination("");
                      setSelectedVehicle("CAB");
                      setDistance(0);
                    }}
                    className="mt-4 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700"
                  >
                    Book Another Ride
                  </button>

                  <div className="mt-3 flex justify-between text-sm">
                    <span className="text-slate-500">
                      Vehicle
                    </span>

                    <span className="font-medium">
                      {currentRide?.vehicle}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right - Map */}
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
                <div className="mt-4 rounded-xl bg-white p-4 shadow">
                  <p className="text-sm text-slate-500">
                    Estimated distance
                  </p>

                  <p className="text-lg font-semibold text-slate-800">
                    {distance.toFixed(1)} km
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Features */}
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
  type: VehicleType;
  name: string;
  description: string;
  price: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
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
  icon: React.ReactNode;
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