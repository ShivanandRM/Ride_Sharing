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

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    state?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
  };
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
        locations.map(
          (location) =>
            [location.lat, location.lon] as [
              number,
              number
            ]
        ),
        {
          padding: [40, 40],
        }
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

  const [route, setRoute] = useState<
    [number, number][]
  >([]);

  const [distance, setDistance] = useState(0);

  const [locationError, setLocationError] =
    useState("");

  const [routeLoading, setRouteLoading] =
    useState(false);

  /*
   * Find a location using Nominatim.
   */
  const findLocation = async (
    place: string,
    signal: AbortSignal
  ): Promise<Location | null> => {
    if (!place.trim()) {
      return null;
    }

    const query = encodeURIComponent(
      `${place.trim()}, Karnataka, India`
    );

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in&addressdetails=1&q=${query}`,
      {
        signal,
        headers: {
          "Accept-Language": "en",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Location search failed: ${response.status}`
      );
    }

    const data: NominatimResult[] =
      await response.json();

    if (!data.length) {
      return null;
    }

    /*
     * Prefer Karnataka results.
     */
    const karnatakaResult = data.find(
      (item) =>
        item.address?.state
          ?.toLowerCase()
          .includes("karnataka")
    );

    const result =
      karnatakaResult || data[0];

    const lat = Number(result.lat);
    const lon = Number(result.lon);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon)
    ) {
      return null;
    }

    console.log(
      `Location found for "${place}":`,
      result.display_name,
      lat,
      lon
    );

    return {
      lat,
      lon,
    };
  };

  /*
   * Find pickup and destination.
   *
   * Important:
   * We wait until BOTH fields contain text.
   * This prevents unnecessary API requests while typing.
   */
  useEffect(() => {
    const controller = new AbortController();

    const searchLocations = async () => {
      if (
        !pickup.trim() ||
        !destination.trim()
      ) {
        setPickupLocation(null);
        setDestinationLocation(null);
        setRoute([]);
        setDistance(0);
        onDistanceChange(0);
        setLocationError("");
        return;
      }

      setLocationError("");
      setRoute([]);
      setDistance(0);
      onDistanceChange(0);

      try {
        /*
         * Search pickup first.
         */
        const pickupResult =
          await findLocation(
            pickup,
            controller.signal
          );

        if (controller.signal.aborted) {
          return;
        }

        setPickupLocation(pickupResult);

        if (!pickupResult) {
          setDestinationLocation(null);
          setLocationError(
            `Could not find pickup location: ${pickup}`
          );
          return;
        }

        /*
         * Small delay between Nominatim requests.
         */
        await new Promise((resolve) =>
          setTimeout(resolve, 1100)
        );

        if (controller.signal.aborted) {
          return;
        }

        /*
         * Search destination.
         */
        const destinationResult =
          await findLocation(
            destination,
            controller.signal
          );

        if (controller.signal.aborted) {
          return;
        }

        setDestinationLocation(
          destinationResult
        );

        if (!destinationResult) {
          setLocationError(
            `Could not find destination: ${destination}`
          );
          return;
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "Location search failed:",
          error
        );

        setPickupLocation(null);
        setDestinationLocation(null);
        setRoute([]);
        setDistance(0);
        onDistanceChange(0);

        setLocationError(
          "Unable to find the locations. Please try again."
        );
      }
    };

    /*
     * Wait 500 ms after the user stops typing.
     */
    const timer = setTimeout(
      searchLocations,
      500
    );

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [pickup, destination, onDistanceChange]);

  /*
   * Calculate ACTUAL ROAD DISTANCE using OSRM.
   */
  useEffect(() => {
    if (
      !pickupLocation ||
      !destinationLocation
    ) {
      setRoute([]);
      setDistance(0);
      onDistanceChange(0);
      setRouteLoading(false);
      return;
    }

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 15000);

    const getRoute = async () => {
      setRouteLoading(true);
      setRoute([]);
      setDistance(0);
      onDistanceChange(0);

      try {
        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${pickupLocation.lon},${pickupLocation.lat};` +
          `${destinationLocation.lon},${destinationLocation.lat}` +
          `?overview=full&geometries=geojson`;

        console.log(
          "Requesting route:",
          url
        );

        const response = await fetch(url, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            `OSRM request failed: ${response.status}`
          );
        }

        const data = await response.json();

        if (
          !data.routes ||
          data.routes.length === 0
        ) {
          throw new Error(
            "No driving route found."
          );
        }

        const routeData = data.routes[0];

        /*
         * OSRM returns distance in METERS.
         * Convert to KM.
         */
        const roadDistance =
          Number(routeData.distance) / 1000;

        if (
          !Number.isFinite(roadDistance) ||
          roadDistance <= 0
        ) {
          throw new Error(
            "Invalid road distance received."
          );
        }

        console.log(
          "ACTUAL ROAD DISTANCE:",
          roadDistance,
          "km"
        );

        setDistance(roadDistance);
        onDistanceChange(roadDistance);

        /*
         * Draw actual road route.
         */
        const coordinates =
          routeData.geometry.coordinates;

        const roadRoute: [number, number][] =
          coordinates.map(
            ([lon, lat]: [
              number,
              number
            ]) =>
              [lat, lon] as [
                number,
                number
              ]
          );

        setRoute(roadRoute);
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          console.warn(
            "Route request timed out."
          );
        } else {
          console.error(
            "Route calculation failed:",
            error
          );
        }

        /*
         * Do NOT invent a distance.
         */
        setDistance(0);
        onDistanceChange(0);
        setRoute([]);

        setLocationError(
          "Unable to calculate road distance. Please try again."
        );
      } finally {
        clearTimeout(timeout);

        if (!controller.signal.aborted) {
          setRouteLoading(false);
        }
      }
    };

    getRoute();

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [
    pickupLocation,
    destinationLocation,
    onDistanceChange,
  ]);

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
        destinationLocation={
          destinationLocation
        }
      />

      {route.length > 0 && (
        <Polyline positions={route} />
      )}

      {routeLoading && (
        <div className="absolute bottom-4 left-4 z-[1000] rounded-lg bg-white px-4 py-2 text-sm font-semibold shadow-lg">
          Calculating road distance...
        </div>
      )}

      {!routeLoading && distance > 0 && (
        <div className="absolute bottom-4 left-4 z-[1000] rounded-lg bg-white px-4 py-2 text-sm font-semibold shadow-lg">
          Road Distance:{" "}
          {distance.toFixed(2)} km
        </div>
      )}

      {locationError && (
        <div className="absolute left-4 top-4 z-[1000] rounded-lg bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-lg">
          {locationError}
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