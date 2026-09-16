import {
  Car,
  Clock3,
  CreditCard,
  History,
  MapPin,
  ShieldCheck,
  Star,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { currentRide, getRideHistory } from "../rideStore";

export default function PassengerDashboard() {
  const navigate = useNavigate();
  const [rideHistory] = useState(getRideHistory());
  const completedRides = rideHistory.length;

const totalSpent = rideHistory.reduce(
  (total, ride) => total + ride.fare,
  0
);

const [activeRide, setActiveRide] = useState("None");

useEffect(() => {
  const checkActiveRide = () => {
    const savedRide = localStorage.getItem("rideflow_current_ride");

    if (savedRide) {
      const ride = JSON.parse(savedRide);

      if (ride.status === "COMPLETED") {
        setActiveRide("None");
      } else if (ride.status === "REQUESTED") {
        setActiveRide("Requested");
      } else if (ride.status === "ACCEPTED") {
        setActiveRide("Accepted");
      } else if (ride.status === "STARTED") {
        setActiveRide("In Progress");
      }
    } else {
      setActiveRide("None");
    }
  };

  checkActiveRide();

  const interval = setInterval(checkActiveRide, 1000);

  return () => clearInterval(interval);
}, []);

  return (
    <div className="min-h-screen bg-slate-100">

      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <div>
            <h1 className="text-2xl font-bold text-indigo-600">
              RideFlow
            </h1>

            <p className="text-xs text-slate-500">
              Passenger
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">
                Welcome back
              </p>

              <p className="text-xs text-slate-500">
                Passenger
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-600">
              P
            </div>
          </div>

        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-8">

        {/* Welcome */}
        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            Passenger Dashboard
          </h2>

          <p className="mt-1 text-slate-500">
            Manage your rides and travel with RideFlow.
          </p>
        </div>

        {/* Statistics */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

          <StatCard
            title="Active Ride"
            value={activeRide}
            icon={<Car size={22} />}
          />

          <StatCard
            title="Completed Rides"
            value={completedRides.toString()}
            icon={<History size={22} />}
          />

          <StatCard
            title="Total Spent"
            value={`₹${Math.round(totalSpent)}`}
            icon={<Wallet size={22} />}
          />

          <StatCard
            title="Rating"
            value="4.8"
            icon={<Star size={22} />}
          />

        </div>

        {activeRide === "Accepted" && currentRide && (
        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          <h3 className="text-lg font-semibold text-slate-800">
            Driver Information
          </h3>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Driver</span>
              <span className="font-medium text-slate-800">
                {currentRide.driverName}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Rating</span>
              <span className="font-medium text-slate-800">
                ⭐ {currentRide.driverRating}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Vehicle Number</span>
              <span className="font-medium text-slate-800">
                {currentRide.driverVehicleNumber}
              </span>
            </div>
          </div>
        </div>
      )}

        {/* Main Grid */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">

          {/* Book Ride */}
          <div className="rounded-2xl border bg-white p-6 shadow-sm lg:col-span-2">

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <MapPin size={22} />
              </div>

              <div>
                <h3 className="text-xl font-semibold">
                  Book a Ride
                </h3>

                <p className="text-sm text-slate-500">
                  Choose your pickup and destination.
                </p>
              </div>
            </div>

            {/* Locations */}
            <div className="mt-6 space-y-3">

              <div className="rounded-xl border p-4">
                <p className="text-xs text-slate-500">
                  Pickup
                </p>

                <p className="mt-1 font-medium">
                  Current location
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-xs text-slate-500">
                  Destination
                </p>

                <p className="mt-1 text-slate-400">
                  Where do you want to go?
                </p>
              </div>

            </div>

            <button
              onClick={() => navigate("/")}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 font-semibold text-white transition hover:bg-indigo-700"
            >
              <Car size={19} />
              Book a Ride
            </button>

          </div>

          {/* Safety */}
          <div className="rounded-2xl border bg-white p-6 shadow-sm">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <ShieldCheck size={22} />
            </div>

            <h3 className="mt-4 text-xl font-semibold">
              Safety Center
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Access emergency assistance and ride safety
              features whenever you need them.
            </p>

            <button className="mt-5 w-full rounded-xl border border-slate-300 py-3 font-medium hover:bg-slate-50">
              Open Safety Center
            </button>

          </div>

        </div>

        {/* Recent Rides */}
        <div className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between">

            <div>
              <h3 className="text-xl font-semibold">
                Recent Rides
              </h3>

              <p className="text-sm text-slate-500">
                Your latest completed trips.
              </p>
            </div>

            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              View all
            </button>

          </div>

          <div className="mt-5 divide-y">

            {rideHistory.length === 0 ? (
              <p className="py-6 text-center text-slate-500">
                No completed rides yet.
              </p>
            ) : (
              rideHistory.map((ride, index) => (
                <RideRow
                  key={index}
                  from={ride.pickup}
                  to={ride.destination}
                  date="Completed"
                  fare={`₹${ride.fare}`}
                status="Completed"
              />
            ))
          )}

          </div>

        </div>

        {/* Quick Actions */}
        <div className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">

          <h3 className="text-xl font-semibold">
            Quick Actions
          </h3>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            <QuickAction
              icon={<Car size={20} />}
              title="Book Ride"
              onClick={() => navigate("/")}
            />

            <QuickAction
              icon={<History size={20} />}
              title="Ride History"
            />

            <QuickAction
              icon={<CreditCard size={20} />}
              title="Payments"
            />

            <QuickAction
              icon={<ShieldCheck size={20} />}
              title="Safety"
            />

          </div>

        </div>

      </main>
    </div>
  );
}

/* Statistics Card */

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <p className="text-sm text-slate-500">
          {title}
        </p>

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          {icon}
        </div>

      </div>

      <p className="mt-4 text-2xl font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}

/* Recent Ride */

function RideRow({
  from,
  to,
  date,
  fare,
  status,
}: {
  from: string;
  to: string;
  date: string;
  fare: string;
  status: string;
}) {
  return (
    <div className="flex items-center gap-4 py-4">

      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
        <Car size={19} />
      </div>

      <div className="min-w-0 flex-1">

        <p className="truncate font-medium">
          {from}
        </p>

        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>to</span>
          <span>{to}</span>
        </div>

      </div>

      <div className="hidden items-center gap-1 text-sm text-slate-500 sm:flex">
        <Clock3 size={15} />
        {date}
      </div>

      <div className="text-right">

        <p className="font-semibold">
          {fare}
        </p>

        <p className="text-xs text-green-600">
          {status}
        </p>

      </div>

    </div>
  );
}

/* Quick Action */

function QuickAction({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50"
    >
      <div className="text-indigo-600">
        {icon}
      </div>

      <span className="font-medium">
        {title}
      </span>
    </button>
  );
}