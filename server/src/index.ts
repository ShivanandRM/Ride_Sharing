import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

type Ride = {
  id: number;
  pickup: string;
  destination: string;
  vehicle: string;
  fare: number;
  paymentMethod: "CASH" | "UPI";
  status: string;
};

const rides: Ride[] = [];

app.get("/", (_req, res) => {
  res.json({
    message: "RideFlow backend is running",
  });
});

// Create a new ride
app.post("/api/rides", (req, res) => {
  const ride: Ride = {
    id: Date.now(),
    pickup: req.body.pickup,
    destination: req.body.destination,
    vehicle: req.body.vehicle,
    fare: req.body.fare,
    paymentMethod: req.body.paymentMethod,
    status: "REQUESTED",
  };

  rides.push(ride);

  console.log("New ride received:", ride);

  res.status(201).json({
    message: "Ride created successfully",
    ride,
  });
});

// Get all rides
app.get("/api/rides", (_req, res) => {
  res.json(rides);
});
// Update ride status
app.patch("/api/rides/:id/status", (req, res) => {
  const rideId = Number(req.params.id);
  const { status } = req.body;

  const ride = rides.find((ride) => ride.id === rideId);

  if (!ride) {
    return res.status(404).json({
      message: "Ride not found",
    });
  }

  ride.status = status;

  console.log(`Ride ${rideId} status updated to ${status}`);

  res.json({
    message: "Ride status updated successfully",
    ride,
  });
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`RideFlow server running on http://localhost:${PORT}`);
});