import {
  Car,
  CheckCircle,
  Clock3,
  IndianRupee,
  MapPin,
  Power,
  Star,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { currentRide, updateRideStatus } from "../rideStore";

export default function DriverDashboard() {
  const [isOnline, setIsOnline] = useState(false);
  const [rideAccepted, setRideAccepted] = useState(false);
  const [rideStarted, setRideStarted] = useState(false);
  const [rideCompleted, setRideCompleted] = useState(false);
  const [completedRide, setCompletedRide] = useState(currentRide);

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
              Driver
            </p>
          </div>

          <div className="flex items-center gap-4">

            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">
                Rajesh Kumar
              </p>

              <p className="text-xs text-slate-500">
                Driver
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-600">
              R
            </div>

          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-8">

        {/* Welcome */}
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">

          <div>
            <h2 className="text-3xl font-bold text-slate-900">
              Driver Dashboard
            </h2>

            <p className="mt-1 text-slate-500">
              Manage your availability, rides and earnings.
            </p>
          </div>

          {/* Online Toggle */}
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white transition ${
              isOnline
                ? "bg-green-600 hover:bg-green-700"
                : "bg-slate-500 hover:bg-slate-600"
            }`}
          >
            <Power size={19} />

            {isOnline ? "You're Online" : "Go Online"}
          </button>

        </div>

        {/* Stats */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

          <StatCard
            title="Today's Earnings"
            value="₹1,840"
            icon={<IndianRupee size={22} />}
          />

          <StatCard
            title="Completed Rides"
            value="14"
            icon={<CheckCircle size={22} />}
          />

          <StatCard
            title="Online Hours"
            value="7.5 hrs"
            icon={<Clock3 size={22} />}
          />

          <StatCard
            title="Rating"
            value="4.7"
            icon={<Star size={22} />}
          />

        </div>

        {/* Main Content */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">

          {/* Ride Requests */}
          <div className="rounded-2xl border bg-white p-6 shadow-sm lg:col-span-2">

            <div className="flex items-center justify-between">

              <div>
                <h3 className="text-xl font-semibold">
                  Ride Requests
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Nearby passengers looking for a ride.
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  isOnline
                    ? "bg-green-50 text-green-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {isOnline ? "Receiving requests" : "Offline"}
              </span>

            </div>

              {isOnline ? (
  rideCompleted ? (
    <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-6">
      <div className="flex items-start gap-4">

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-green-600 shadow-sm">
          <CheckCircle size={22} />
        </div>

        <div className="flex-1">
          <p className="font-semibold text-green-800">
            Ride Completed
          </p>

          <p className="mt-1 text-sm text-slate-500">
            The ride has been completed successfully.
          </p>

          <div className="mt-5 space-y-3">

            <div className="flex items-center gap-2 text-sm">
              <MapPin
                size={17}
                className="text-green-600"
              />
              {completedRide?.pickup}
            </div>

            <div className="flex items-center gap-2 text-sm">
              <MapPin
                size={17}
                className="text-red-500"
              />
              {completedRide?.destination}
            </div>

          </div>

          <p className="mt-5 text-lg font-bold">
            Fare: ₹{completedRide?.fare}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Payment:{" "}
            <span className="font-semibold text-slate-700">
              {completedRide?.paymentMethod === "UPI"
                ? "UPI"
                : "Cash"}
            </span> 
          </p>

        </div>
      </div>
    </div>

  ) : rideStarted ? (
                // =========================
                // RIDE IN PROGRESS
                // =========================
                <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-6">
                  <div className="flex items-start gap-4">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                      <MapPin size={22} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-blue-800">
                            Ride In Progress
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            You are currently driving the passenger.
                          </p>
                        </div>

                        <p className="text-lg font-bold">
                          ₹{currentRide?.fare}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Payment:{" "}
                          <span className="font-semibold text-slate-700">
                            {currentRide?.paymentMethod === "UPI"
                            ? "UPI"
                            : "Cash"}
                          </span>
                        </p>
                      </div>

                      <div className="mt-5 space-y-3">

                        <div className="flex items-center gap-2 text-sm">
                          <MapPin
                            size={17}
                            className="text-green-600"
                          />
                          {currentRide?.pickup}
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <MapPin
                            size={17}
                            className="text-red-500"
                          />
                          {currentRide?.destination}
                        </div>

                      </div>

                      <button
                        onClick={() => {
                          setCompletedRide(currentRide);
                          updateRideStatus("COMPLETED");
                          setRideStarted(false);
                          setRideAccepted(false);
                          setRideCompleted(true);
                        }}
                        className="mt-5 w-full rounded-lg bg-green-600 py-3 font-semibold text-white hover:bg-green-700"
                      >
                        Complete Ride
                      </button>

                    </div>
                  </div>
                </div>

              ) : rideAccepted ? (

                // =========================
                // RIDE ACCEPTED
                // =========================
                <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-6">
                  <div className="flex items-start gap-4">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-green-600 shadow-sm">
                      <CheckCircle size={22} />
                    </div>

                    <div className="flex-1">

                      <div className="flex items-start justify-between">
  <div>
    <p className="font-semibold text-green-800">
      Ride Accepted
    </p>

    <p className="mt-1 text-sm text-slate-500">
      You can now start the ride.
    </p>
  </div>

  <div className="text-right">
    <p className="text-lg font-bold">
      ₹{currentRide?.fare}
    </p>

    <p className="mt-1 text-sm text-slate-500">
      Payment:{" "}
      <span className="font-semibold text-slate-700">
        {currentRide?.paymentMethod === "UPI"
          ? "UPI"
          : "Cash"}
      </span>
    </p>
  </div>
</div>

                      <div className="mt-5 space-y-3">

                        <div className="flex items-center gap-2 text-sm">
                          <MapPin
                            size={17}
                            className="text-green-600"
                          />
                          {currentRide?.pickup}
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <MapPin
                            size={17}
                            className="text-red-500"
                          />
                          {currentRide?.destination}
                        </div>

                      </div>

                      <button
                        onClick={() => {
                          updateRideStatus("STARTED");
                          setRideStarted(true);
                        }}
                        className="mt-5 w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700"
                      >
                        Start Ride
                      </button>

                    </div>
                  </div>
                </div>

              ) : (

                // =========================
                // NEW RIDE REQUEST
                // =========================
                <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
                  <div className="flex items-start gap-4">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                      <MapPin size={22} />
                    </div>

                    <div className="flex-1">

                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">
                            New Ride Request
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            Passenger nearby
                          </p>
                        </div>

                        <p className="text-lg font-bold">
                          ₹{currentRide?.fare}
                        </p>
                      </div>

                      <div className="mt-4 space-y-2">

                        <div className="flex items-center gap-2 text-sm">
                          <MapPin
                            size={16}
                            className="text-green-600"
                          />
                          {currentRide?.pickup}
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <MapPin
                            size={16}
                            className="text-red-500"
                          />
                          {currentRide?.destination}
                        </div>

                      </div>

                      <div className="mt-4 flex gap-3">

                        <button
                          onClick={() => {
                            updateRideStatus("ACCEPTED");
                            setRideAccepted(true);
                          }}
                          className="flex-1 rounded-lg bg-green-600 py-3 font-semibold text-white hover:bg-green-700"
                        >
                          Accept Ride
                        </button>

                        <button
                          className="rounded-lg border border-slate-300 px-5 py-3 font-medium hover:bg-white"
                        >
                          Decline
                        </button>

                      </div>

                    </div>
                  </div>
                </div>
              )

            ) : (

              // =========================
              // OFFLINE
              // =========================
              <div className="mt-6 rounded-xl border border-dashed p-10 text-center">

                <Power
                  size={36}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 font-medium text-slate-700">
                  You're currently offline
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Go online to start receiving nearby ride requests.
                </p>

              </div>
            )}
            </div>
          {/* Vehicle */}
          <div className="rounded-2xl border bg-white p-6 shadow-sm">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Car size={22} />
            </div>

            <h3 className="mt-4 text-xl font-semibold">
              Your Vehicle
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Registered vehicle
            </p>

            <div className="mt-5 rounded-xl bg-slate-50 p-4">

              <p className="font-semibold">
                Maruti Suzuki Swift
              </p>

              <p className="mt-1 text-sm text-slate-500">
                KA 01 AB 1234
              </p>

              <div className="mt-3 inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                Verified
              </div>

            </div>

            <button className="mt-4 w-full rounded-xl border py-3 font-medium hover:bg-slate-50">
              Manage Vehicle
            </button>

          </div>

        </div>

        {/* Earnings */}
        <div className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <Wallet size={22} />
            </div>

            <div>
              <h3 className="text-xl font-semibold">
                Earnings Summary
              </h3>

              <p className="text-sm text-slate-500">
                Your earnings for today.
              </p>
            </div>

          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">

            <EarningCard
              title="Gross Earnings"
              value="₹1,840"
            />

            <EarningCard
              title="Platform Fee"
              value="₹184"
            />

            <EarningCard
              title="Net Earnings"
              value="₹1,656"
            />

          </div>

        </div>

      </main>
    </div>
  );
}

/* Statistics */

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

      <p className="mt-4 text-2xl font-bold">
        {value}
      </p>

    </div>
  );
}

/* Earnings */

function EarningCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border p-5">

      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>

    </div>
  );
}