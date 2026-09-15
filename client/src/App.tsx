import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import PassengerDashboard from "./pages/PassengerDashboard";
import DriverDashboard from "./pages/DriverDashboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/passenger" element={<PassengerDashboard />} />
      <Route path="/driver" element={<DriverDashboard />} />
    </Routes>
  );
}

export default App;