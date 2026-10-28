import { tool } from "ai";
import { z } from "zod";

const WMO_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

export const weatherTool = tool({
  description:
    "Get real-time weather information and forecast for any city or location worldwide via Open-Meteo.",
  execute: async ({ location }) => {
    const loc = location.trim();
    if (!loc) {
      return JSON.stringify({ error: "Missing location parameter" });
    }

    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(loc)}&count=1&language=en&format=json`;
      const geoRes = await fetch(geoUrl);
      if (!geoRes.ok) {
        return JSON.stringify({
          error: `Geocoding failed with status ${geoRes.status}`,
        });
      }

      const geoData = (await geoRes.json()) as {
        results?: {
          name: string;
          latitude: number;
          longitude: number;
          country?: string;
          admin1?: string;
        }[];
      };

      if (!geoData.results || geoData.results.length === 0) {
        return JSON.stringify({ error: `Location '${loc}' not found` });
      }

      const [match] = geoData.results;
      const { name, latitude, longitude, country, admin1 } = match;

      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`;
      const weatherRes = await fetch(forecastUrl);
      if (!weatherRes.ok) {
        return JSON.stringify({
          error: `Weather query failed with status ${weatherRes.status}`,
        });
      }

      const weatherData = (await weatherRes.json()) as {
        current?: {
          temperature_2m: number;
          relative_humidity_2m: number;
          apparent_temperature: number;
          weather_code: number;
          wind_speed_10m: number;
        };
      };

      const { current } = weatherData;
      if (!current) {
        return JSON.stringify({
          error: `No current weather data for '${loc}'`,
        });
      }

      const weatherCondition =
        WMO_CODES[current.weather_code] ||
        `Condition code ${current.weather_code}`;

      return JSON.stringify({
        condition: weatherCondition,
        coordinates: { latitude, longitude },
        feels_like: `${current.apparent_temperature}°C`,
        humidity: `${current.relative_humidity_2m}%`,
        location: `${name}, ${admin1 ? `${admin1}, ` : ""}${country || ""}`,
        temperature: `${current.temperature_2m}°C`,
        wind_speed: `${current.wind_speed_10m} km/h`,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return JSON.stringify({ error: msg, location: loc });
    }
  },
  inputSchema: z.object({
    location: z
      .string()
      .describe(
        "City or region name, e.g. 'Jakarta', 'Bandung', 'Tokyo', 'London'"
      ),
  }),
});
