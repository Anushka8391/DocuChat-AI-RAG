import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";
import { ragService } from "@/services/rag/rag.service";
import type { RagMatch, UploadedFileMetadata } from "@/types";

const WEATHER_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

type OpenMeteoGeocodingResponse = {
  results?: Array<{
    name: string;
    country?: string;
    admin1?: string;
    latitude: number;
    longitude: number;
    timezone?: string;
  }>;
};

type OpenMeteoForecastResponse = {
  current?: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    is_day: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
  timezone?: string;
};

interface AgentToolContext {
  userId: string;
  model?: string;
  attachedFile?: UploadedFileMetadata | null;
}

type UploadedFileRow = {
  id: string;
  user_id: string;
  file_name: string;
  bucket_name: string;
  storage_path: string;
};

function sanitizeExpression(expression: string) {
  const normalized = expression.replace(/\s+/g, "");

  if (!normalized) {
    throw new Error("Provide a math expression to evaluate.");
  }

  if (!/^[0-9+\-*/().%]+$/.test(normalized)) {
    throw new Error(
      "Calculator supports only numbers, parentheses, and the + - * / % operators.",
    );
  }

  return normalized;
}

function evaluateExpression(expression: string) {
  const safeExpression = sanitizeExpression(expression);
  const result = Function(`"use strict"; return (${safeExpression});`)() as unknown;

  if (typeof result !== "number" || Number.isNaN(result) || !Number.isFinite(result)) {
    throw new Error("The calculator could not evaluate that expression.");
  }

  return result;
}

function formatMatches(matches: RagMatch[]) {
  return matches.map((match, index) => ({
    source: String(match.metadata.fileName ?? `Document ${index + 1}`),
    score: Number(match.score.toFixed(4)),
    snippet: match.content.slice(0, 600),
  }));
}

function formatLocationName(location: {
  name: string;
  country?: string;
  admin1?: string;
}) {
  return [location.name, location.admin1, location.country].filter(Boolean).join(", ");
}

function getWeatherLabel(code: number | undefined) {
  if (typeof code !== "number") {
    return "Unknown conditions";
  }

  return WEATHER_CODES[code] ?? "Unknown conditions";
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

async function lookupWeather(location: string) {
  const geocoding = await fetchJson<OpenMeteoGeocodingResponse>(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`,
  );
  const place = geocoding.results?.[0];

  if (!place) {
    throw new Error(`I could not find weather data for \"${location}\".`);
  }

  const forecast = await fetchJson<OpenMeteoForecastResponse>(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=1`,
  );

  const current = forecast.current;
  const daily = forecast.daily;

  if (!current || !daily) {
    throw new Error("Weather data is unavailable right now.");
  }

  return {
    resolvedLocation: formatLocationName(place),
    timezone: forecast.timezone ?? place.timezone ?? "auto",
    currentTime: current.time,
    summary: `${getWeatherLabel(current.weather_code)}. ${Math.round(current.temperature_2m)}°C now, feels like ${Math.round(current.apparent_temperature)}°C.`,
    current: {
      weather: getWeatherLabel(current.weather_code),
      temperatureC: Math.round(current.temperature_2m),
      feelsLikeC: Math.round(current.apparent_temperature),
      humidityPercent: Math.round(current.relative_humidity_2m),
      windSpeedKph: Math.round(current.wind_speed_10m),
      precipitationMm: Number(current.precipitation.toFixed(1)),
      period: current.is_day ? "day" : "night",
    },
    today: {
      weather: getWeatherLabel(daily.weather_code[0]),
      highC: Math.round(daily.temperature_2m_max[0] ?? current.temperature_2m),
      lowC: Math.round(daily.temperature_2m_min[0] ?? current.temperature_2m),
      precipitationProbabilityPercent: Math.round(daily.precipitation_probability_max[0] ?? 0),
    },
  };
}

function getCurrentDateTime(timeZone?: string) {
  const now = new Date();
  const resolvedTimeZone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    iso: now.toISOString(),
    timeZone: resolvedTimeZone,
    date: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: resolvedTimeZone,
    }).format(now),
    time: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      timeZone: resolvedTimeZone,
    }).format(now),
  };
}

async function resolveAttachedFileForUser(userId: string, fileId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("uploaded_files")
    .select("id, user_id, file_name, bucket_name, storage_path")
    .eq("id", fileId)
    .eq("user_id", userId)
    .single<UploadedFileRow>();

  if (error || !data) {
    throw error ?? new Error("The attached file could not be verified for this user.");
  }

  return {
    id: data.id,
    name: data.file_name,
    bucket: data.bucket_name,
    path: data.storage_path,
  };
}

export function createAgentTools(context: AgentToolContext) {
  const retrievalTool = tool(
    async (input) => {
      const { query, fileId } = input as { query: string; fileId?: string };
      const effectiveFileId = fileId ?? context.attachedFile?.id;

      try {
        if (effectiveFileId) {
          const trustedFile = await resolveAttachedFileForUser(context.userId, effectiveFileId);
          const result = await ragService.answerQuestionFromFile({
            userId: context.userId,
            query,
            matchCount: 4,
            model: context.model,
            fileId: trustedFile.id,
            fileName: trustedFile.name,
            storagePath: trustedFile.path,
            bucketName: trustedFile.bucket,
          });

          return JSON.stringify({
            query,
            fileId: trustedFile.id,
            answer: result.answer,
            matches: formatMatches(result.matches),
            warning: result.warning,
          });
        }

        // No file context — search across all indexed documents for this user.
        const matches = await ragService.retrieveRelevantChunks({
          userId: context.userId,
          query,
          matchCount: 4,
          model: context.model,
        });

        return JSON.stringify({
          query,
          fileId: null,
          matches: formatMatches(matches),
        });
      } catch (error) {
        return JSON.stringify({
          query,
          fileId: effectiveFileId ?? null,
          matches: [],
          error: getErrorMessage(error),
        });
      }
    },
    {
      name: "retrieval_search",
      description:
        "Search the uploaded knowledge base for relevant context before answering questions grounded in user documents. If a file is attached, prioritize that file.",
      schema: z.object({
        query: z.string().min(1).describe("Search query for the vector database"),
        fileId: z.string().optional().describe("Optional attached file id to search within first"),
      }),
    },
  );

  const calculatorTool = tool(
    async (input) => {
      const { expression } = input as { expression: string };

      try {
        const result = evaluateExpression(expression);

        return JSON.stringify({
          expression,
          result,
        });
      } catch (error) {
        return JSON.stringify({
          expression,
          error: getErrorMessage(error),
        });
      }
    },
    {
      name: "calculator",
      description:
        "Evaluate simple arithmetic like percentages, sums, multiplication, division, and parentheses.",
      schema: z.object({
        expression: z
          .string()
          .min(1)
          .describe("Math expression using only numbers, parentheses, and + - * / %"),
      }),
    },
  );

  const currentDateTimeTool = tool(
    async (input) => {
      const { timeZone } = input as { timeZone?: string };

      try {
        return JSON.stringify(getCurrentDateTime(timeZone));
      } catch (error) {
        return JSON.stringify({
          error: getErrorMessage(error),
        });
      }
    },
    {
      name: "current_datetime",
      description:
        "Get the current date and time. Use this for questions about today's date, the current time, the day of the week, or other time-sensitive references.",
      schema: z.object({
        timeZone: z
          .string()
          .optional()
          .describe("Optional IANA time zone like Asia/Kolkata or Europe/London."),
      }),
    },
  );

  const weatherTool = tool(
    async (input) => {
      const { location } = input as { location: string };

      try {
        const weather = await lookupWeather(location);

        return JSON.stringify(weather);
      } catch (error) {
        return JSON.stringify({
          location,
          error: getErrorMessage(error),
        });
      }
    },
    {
      name: "weather_lookup",
      description:
        "Get the current weather and today's forecast for a specific city or location.",
      schema: z.object({
        location: z.string().min(1).describe("City, state, country, or place name to look up weather for."),
      }),
    },
  );

  return [retrievalTool, calculatorTool, currentDateTimeTool, weatherTool];
}
