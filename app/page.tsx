"use client";

import React, { useState, useRef, useEffect } from "react";
import { FaLocationDot } from "react-icons/fa6";
import { FaArrowRight } from "react-icons/fa6";
import { RiUserLocationLine } from "react-icons/ri";
import { TbMaximize, TbMinimize } from "react-icons/tb";
import { BsLightningFill } from "react-icons/bs";

import {
  GoogleMap,
  useLoadScript,
  DirectionsRenderer,
  Autocomplete,
  Marker,
} from "@react-google-maps/api";

const mapLibraries: "places"[] = ["places"];

export default function JakartaNavigator() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: mapLibraries,
  });

  const [startPoint, setStartPoint] = useState("");
  const [endPoint, setEndPoint] = useState("");
  const [startCoords, setStartCoords] =
    useState<google.maps.LatLngLiteral | null>(null);
  const [endCoords, setEndCoords] = useState<google.maps.LatLngLiteral | null>(
    null
  );
  const [carKwh, setCarKwh] = useState(0);
  const [routeData, setRouteData] =
    useState<google.maps.DirectionsResult | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapHeight, setMapHeight] = useState("calc(100vh - 210px)");
  const [mapCenter, setMapCenter] = useState({
    lat: -6.2,
    lng: 106.816666,
  });
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  const startLocationRef = useRef<google.maps.places.Autocomplete | null>(null);
  const endLocationRef = useRef<google.maps.places.Autocomplete | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFullscreen) {
      setMapHeight("100vh");
    } else {
      setMapHeight("calc(100vh - 210px)");
    }
  }, [isFullscreen]);

  const geocodeCoordinates = (
    lat: number,
    lng: number,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (!isLoaded) return;

    const geocoder = new google.maps.Geocoder();
    const latlng = { lat, lng };

    geocoder.geocode({ location: latlng }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
        setter(results[0].formatted_address);
      } else {
        setter(`${lat}, ${lng}`);
      }
    });
  };

  const fetchCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setStartCoords({
          lat,
          lng,
        });

        if (isLoaded) {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (
              status === google.maps.GeocoderStatus.OK &&
              results &&
              results[0]
            ) {
              setStartPoint(results[0].formatted_address);
            } else {
              setStartPoint(`${lat}, ${lng}`);
            }
          });
        } else {
          setStartPoint(`${lat}, ${lng}`);
        }

        if (mapInstance) {
          mapInstance.setCenter({ lat, lng });
          mapInstance.setZoom(15);
        }
      },
      (error) => {
        alert(
          "Unable to access your current location. Please check your browser permissions."
        );
        console.error("Geolocation error:", error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const calculateRoute = () => {
    if (!startPoint || !endPoint || !carKwh) {
      return alert("Tolong masukkan titk awal, akhir, dan kWh mobil.");
    }

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: startPoint,
        destination: endPoint,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setRouteData(result);

          if (result.routes[0] && result.routes[0].legs[0]) {
            const leg = result.routes[0].legs[0];
            if (leg.start_location) {
              setStartCoords({
                lat: leg.start_location.lat(),
                lng: leg.start_location.lng(),
              });
            }
            if (leg.end_location) {
              setEndCoords({
                lat: leg.end_location.lat(),
                lng: leg.end_location.lng(),
              });
            }

            const bounds = new google.maps.LatLngBounds();
            bounds.extend(leg.start_location);
            bounds.extend(leg.end_location);

            if (mapInstance) {
              mapInstance.fitBounds(bounds);
            }
          }
        } else {
          alert(
            "Could not calculate directions. Please check your locations and try again."
          );
        }
      }
    );
  };

  const handleStartLocationChange = () => {
    if (startLocationRef.current) {
      const place = startLocationRef.current.getPlace();
      if (place.formatted_address) {
        setStartPoint(place.formatted_address);
      }

      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setStartCoords({ lat, lng });
      }
    }
  };

  const handleEndLocationChange = () => {
    if (endLocationRef.current) {
      const place = endLocationRef.current.getPlace();
      if (place.formatted_address) {
        setEndPoint(place.formatted_address);
      }

      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setEndCoords({ lat, lng });
      }
    }
  };

  const toggleFullscreen = () => {
    if (mapContainerRef.current) {
      if (!document.fullscreenElement) {
        mapContainerRef.current.requestFullscreen().catch((err) => {
          alert(`Error attempting to enable fullscreen: ${err.message}`);
        });
        setIsFullscreen(true);
      } else {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleMapLoad = (map: google.maps.Map) => {
    setMapInstance(map);
  };

  if (loadError)
    return (
      <div className="text-red-500 text-center p-4">
        Error loading Google Maps
      </div>
    );

  if (!isLoaded)
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl font-medium">Loading Maps...</div>
      </div>
    );

  return (
    <div className="relative h-screen flex flex-col">
      <div
        className={`w-full bg-white p-4 shadow-lg ${
          isFullscreen ? "absolute top-0 left-0 right-0" : ""
        }`}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <FaLocationDot className="text-blue-500" />
            <Autocomplete
              onLoad={(autocomplete) =>
                (startLocationRef.current = autocomplete)
              }
              onPlaceChanged={handleStartLocationChange}
              className="w-full"
            >
              <input
                type="text"
                className="border border-gray-300 p-3 rounded-lg w-full"
                placeholder="Enter starting point"
                value={startPoint}
                onChange={(e) => setStartPoint(e.target.value)}
              />
            </Autocomplete>

            <button
              onClick={fetchCurrentLocation}
              className="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition duration-300"
              aria-label="Use my current location"
            >
              <RiUserLocationLine />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <FaLocationDot className="text-red-500" />
            <Autocomplete
              onLoad={(autocomplete) => (endLocationRef.current = autocomplete)}
              onPlaceChanged={handleEndLocationChange}
              className="w-full"
            >
              <input
                type="text"
                className="border border-gray-300 p-3 rounded-lg w-full"
                placeholder="Enter destination"
                value={endPoint}
                onChange={(e) => setEndPoint(e.target.value)}
              />
            </Autocomplete>
          </div>

          <div className="flex items-center gap-3">
            <BsLightningFill className="text-yellow-500" />
            <input
              type="text"
              className="border border-gray-300 p-3 rounded-lg w-full"
              placeholder="Enter current car kWh"
              value={carKwh}
              onChange={(e) => setCarKwh(Number(e.target.value))}
            />

            <button
              onClick={calculateRoute}
              className="bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 transition duration-300"
              aria-label="Calculate route"
            >
              <FaArrowRight />
            </button>
          </div>
        </div>
      </div>
      <div
        ref={mapContainerRef}
        className="relative w-full flex flex-grow items-center justify-center"
      >
        <GoogleMap
          mapContainerStyle={{
            width: "100%",
            height: mapHeight,
          }}
          zoom={13}
          center={mapCenter}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            zoomControl: true,
          }}
          onLoad={handleMapLoad}
        >
          {/* Display markers when not showing route */}
          {!routeData && startCoords && (
            <Marker
              position={startCoords}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: "#4285F4",
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "#FFFFFF",
                scale: 8,
              }}
            />
          )}

          {!routeData && endCoords && (
            <Marker
              position={endCoords}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: "#EA4335",
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "#FFFFFF",
                scale: 8,
              }}
            />
          )}

          {routeData && <DirectionsRenderer directions={routeData} />}
        </GoogleMap>

        {routeData && routeData.routes[0]?.legs[0] && (
          <div className="fixed bottom-4 flex flex-col w-[90%] transform bg-blue-500 text-white shadow-lg rounded-lg p-4 z-50">
            <p className="text-lg font-semibold">
              Total Jarak: {routeData.routes[0].legs[0].distance?.text}
            </p>
            <p className="text-lg font-semibold">
              Total waktu: {routeData.routes[0].legs[0].duration?.text}
            </p>
          </div>
        )}

        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-md hover:bg-gray-100 z-10"
        >
          {isFullscreen ? <TbMinimize /> : <TbMaximize />}
        </button>
      </div>
    </div>
  );
}
