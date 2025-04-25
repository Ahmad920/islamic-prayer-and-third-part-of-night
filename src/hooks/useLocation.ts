
import { useState } from 'react';
import { LocationData } from '@/types/prayer';

export const useLocation = () => {
  const [location, setLocation] = useState<LocationData>({ 
    latitude: null, 
    longitude: null, 
    city: "Loading...", 
    country: "..." 
  });
  const [error, setError] = useState<string | null>(null);

  const getLocationByIP = async () => {
    try {
      const response = await fetch("https://ipapi.co/json/");
      const data = await response.json();
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
        country: data.country_name,
        source: "ip"
      };
    } catch (error) {
      console.error("Error getting location by IP:", error);
      return null;
    }
  };

  const getLocationByBrowser = (): Promise<LocationData | null> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            city: "Current Location",
            country: "",
            source: "browser"
          });
        },
        (error) => {
          reject(error);
        }
      );
    });
  };

  const getUserLocation = async () => {
    try {
      const ipLocation = await getLocationByIP();
      
      if (ipLocation && ipLocation.latitude && ipLocation.longitude) {
        setLocation(ipLocation);
        return ipLocation;
      }
      
      try {
        const browserLocation = await getLocationByBrowser();
        if (browserLocation) {
          setLocation(browserLocation);
          return browserLocation;
        }
        throw new Error("Could not determine your location. Please enter it manually.");
      } catch (geoError) {
        throw new Error("Could not determine your location. Please enter it manually.");
      }
    } catch (error) {
      console.error("Error getting user location:", error);
      setError(error instanceof Error ? error.message : "Unknown error getting location");
      return null;
    }
  };

  return { location, error, getUserLocation };
};
