import {
  CircleMarker,
  MapContainer,
  Popup,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";

type RideMapProps = {
  pickup: string;
  destination: string;
  onDistanceChange: (distance: number) => void;
};

type Location = {
  lat: number;
  lon: number;
};

function MapUpdater({
  pickupLocation,
  destinationLocation,
}: {
  pickupLocation: Location | null;
  destinationLocation: Location | null;
}) {
  const map = useMap();

  useEffect(() => {
    const locations = [
      pickupLocation,
      destinationLocation,
    ].filter(Boolean) as Location[];

    if (locations.length === 1) {
      map.setView(
        [locations[0].lat, locations[0].lon],
        13
      );
    }

    if (locations.length === 2) {
      map.fitBounds(
        locations.map((location) => [
          location.lat,
          location.lon,
        ] as [number, number]),
        { padding: [40, 40] }
      );
    }
  }, [pickupLocation, destinationLocation, map]);

  return null;
}

export default function RideMap({
  pickup,
  destination,
  onDistanceChange,
}: RideMapProps) {
  const [pickupLocation, setPickupLocation] =
    useState<Location | null>(null);

  const [destinationLocation, setDestinationLocation] =
    useState<Location | null>(null);

  const [route, setRoute] = useState<[number, number][]>([]);
  const [distance, setDistance] = useState(0);

  // Find pickup and destination coordinates
  // Debounced to prevent Nominatim 429 errors
  useEffect(() => {
    const timer = setTimeout(() => {
      const findLocation = async (
        place: string,
        setLocation: (location: Location | null) => void
      ) => {
        if (!place.trim()) {
          setLocation(null);
          return;
        }

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(place)}`
          );

          const data = await response.json();

          if (data.length > 0) {
            setLocation({
              lat: Number(data[0].lat),
              lon: Number(data[0].lon),
            });
          } else {
            setLocation(null);
          }
        } catch (error) {
          console.error("Location search failed:", error);
          setLocation(null);
        }
      };

      findLocation(pickup, setPickupLocation);
      findLocation(destination, setDestinationLocation);
    }, 1000);

    return () => clearTimeout(timer);
  }, [pickup, destination]);

  // Calculate driving route
  useEffect(() => {
    const getRoute = async () => {
      if (!pickupLocation || !destinationLocation) {
        setRoute([]);
        return;
      }

      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${pickupLocation.lon},${pickupLocation.lat};${destinationLocation.lon},${destinationLocation.lat}?overview=full&geometries=geojson`
        );

        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const coordinates =
            data.routes[0].geometry.coordinates;
            
            const calculatedDistance = data.routes[0].distance / 1000;

            setDistance(calculatedDistance);
            onDistanceChange(calculatedDistance);

          setRoute(
            coordinates.map(
              ([lon, lat]: [number, number]) =>
                [lat, lon] as [number, number]
            )
          );
        } else {
          setRoute([]);
        }
      } catch (error) {
        console.error("Route calculation failed:", error);
        setRoute([]);
      }
    };

    getRoute();
  }, [pickupLocation, destinationLocation]);

  return (
    <MapContainer
      center={[20.5937, 78.9629]}
      zoom={5}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapUpdater
        pickupLocation={pickupLocation}
        destinationLocation={destinationLocation}
      />

      {route.length > 0 && (
        <Polyline positions={route} />
      )}

      {distance > 0 && (
        <div className="absolute bottom-4 left-4 z-[1000] rounded-lg bg-white px-4 py-2 text-sm font-semibold shadow-lg">
          Distance: {distance.toFixed(2)} km
        </div>
      )}

      {pickupLocation && (
        <CircleMarker
          center={[
            pickupLocation.lat,
            pickupLocation.lon,
          ]}
          radius={10}
        >
          <Popup>
            Pickup: {pickup}
          </Popup>
        </CircleMarker>
      )}

      {destinationLocation && (
        <CircleMarker
          center={[
            destinationLocation.lat,
            destinationLocation.lon,
          ]}
          radius={10}
        >
          <Popup>
            Destination: {destination}
          </Popup>
        </CircleMarker>
      )}
    </MapContainer>
  );
}