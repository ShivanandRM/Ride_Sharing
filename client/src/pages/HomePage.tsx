import { useState } from "react";
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
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [showVehicles, setShowVehicles] = useState(false);
  const [selectedVehicle, setSelectedVehicle] =
    useState<VehicleType>("CAB");

  const handleBookRide = () => {
    if (!pickup || !destination) {
      alert("Please enter pickup and destination.");
      return;
    }

    setShowVehicles(true);
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
                      value={destination}
                      onChange={(e) =>
                        setDestination(e.target.value)
                      }
                      placeholder="Search destination"
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
            {showVehicles && (
              <div className="mt-6 rounded-2xl border bg-white p-5 shadow-lg">

                <h3 className="mb-4 text-lg font-semibold">
                  Choose your ride
                </h3>

                <div className="space-y-3">

                  <VehicleCard
                    type="BIKE"
                    name="Bike"
                    description="Affordable & quick"
                    price="₹65"
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
                    price="₹95"
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
                    price="₹145"
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
                    price="₹220"
                    icon={<Car size={24} />}
                    selected={
                      selectedVehicle === "PREMIUM_CAB"
                    }
                    onClick={() =>
                      setSelectedVehicle("PREMIUM_CAB")
                    }
                  />

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

                <button
                  onClick={() =>
                    alert(
                      `Ride requested with ${selectedVehicle}`
                    )
                  }
                  className="mt-5 w-full rounded-xl bg-green-600 py-4 font-semibold text-white hover:bg-green-700"
                >
                  Confirm Ride
                </button>

              </div>
            )}

          </div>

          {/* Right */}
          <div className="relative">

            <div className="overflow-hidden rounded-3xl border bg-white shadow-xl">

              <div className="flex h-[480px] items-center justify-center bg-slate-200">

                <div className="text-center">

                  <MapPin
                    size={48}
                    className="mx-auto mb-4 text-indigo-600"
                  />

                  <h3 className="text-xl font-semibold text-slate-800">
                    RideFlow Map
                  </h3>

                  <p className="mt-2 max-w-sm px-6 text-sm text-slate-500">
                    Your interactive map will appear here
                    when the maps service is connected.
                  </p>

                  <div className="mt-5 rounded-lg bg-white px-4 py-3 text-sm shadow">
                    Live ride tracking
                  </div>

                </div>

              </div>

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

        <p className="font-semibold">
          {name}
        </p>

        <p className="text-sm text-slate-500">
          {description}
        </p>

      </div>

      <div className="text-right">

        <p className="font-bold">
          {price}
        </p>

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

      <h3 className="text-lg font-semibold">
        {title}
      </h3>

      <p className="mt-2 leading-6 text-slate-600">
        {description}
      </p>

    </div>
  );
}

export default HomePage;