export type RideStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "STARTED"
  | "COMPLETED";

export type RideRequest = {
  pickup: string;
  destination: string;
  vehicle: string;
  fare: number;
  paymentMethod: "CASH" | "UPI";
  driverName?: string;
  driverRating?: number;
  driverVehicleNumber?: string;
  status: RideStatus;
};

export let currentRide: RideRequest | null = null;

const STORAGE_KEY = "rideflow_current_ride";
const HISTORY_KEY = "rideflow_ride_history";

// Load current ride
const savedRide = localStorage.getItem(STORAGE_KEY);

if (savedRide) {
  currentRide = JSON.parse(savedRide);
}

// Create a new ride
export const createRide = (ride: RideRequest) => {
  currentRide = ride;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(ride)
  );
};

// Update ride status
export const updateRideStatus = (status: RideStatus) => {
  if (currentRide) {
    currentRide.status = status;
    if (status === "ACCEPTED") {
        currentRide.driverName = "Rahul Kumar";
        currentRide.driverRating = 4.8;
        currentRide.driverVehicleNumber = "KA 01 AB 1234";
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(currentRide)
    );

    // Save completed ride to history
    if (status === "COMPLETED") {
      const savedHistory =
        localStorage.getItem(HISTORY_KEY);

      const history: RideRequest[] = savedHistory
        ? JSON.parse(savedHistory)
        : [];

      history.unshift({ ...currentRide });

      localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(history)
      );
    }
  }
};

// Get all completed rides
export const getRideHistory = (): RideRequest[] => {
  const savedHistory =
    localStorage.getItem(HISTORY_KEY);

  if (!savedHistory) {
    return [];
  }

  const history: RideRequest[] =
    JSON.parse(savedHistory);

  return history.map((ride) => ({
    ...ride,
    fare: Math.round(ride.fare),
  }));
};