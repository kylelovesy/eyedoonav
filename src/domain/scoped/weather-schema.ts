/*---------------------------------------
File: src/domain/user-owned/weather-schema.ts
Description: Weather schemas used throughout the application.

Author: Kyle Lovesy
Date: 28/10-2025 - 10.00
Version: 1.1.0
---------------------------------------*/
import { z } from 'zod';
import { optionalTimestampSchema } from '@/domain/common/shared-schemas';

/**
 * Weather Schemas
 * Weather data and forecasting system
 */

// ============================================================================
// Weather Condition Schema
// ============================================================================

export const weatherConditionSchema = z.object({
  id: z.number().int().positive(),
  main: z.string().min(1, 'Main weather condition is required'),
  description: z.string().min(1, 'Weather description is required'),
  icon: z.string().min(1, 'Weather icon is required'),
});

// ============================================================================
// Weather Display Data Schema
// ============================================================================

export const weatherDisplayDataSchema = z.object({
  condition: weatherConditionSchema,
  temperature: z.number(),
  temperatureMin: z.number().optional(),
  temperatureMax: z.number().optional(),
  humidity: z.number().min(0).max(100),
  windSpeed: z.number().min(0),
  precipitationChance: z.number().min(0).max(100),
  timestamp: optionalTimestampSchema,
});

// ============================================================================
// Weather Alert Schema
// ============================================================================

export const weatherAlertSchema = z.object({
  id: z.string().min(1, 'Alert ID is required'),
  sender: z.string().min(1, 'Alert sender is required'),
  event: z.string().min(1, 'Alert event is required'),
  start: optionalTimestampSchema,
  end: optionalTimestampSchema,
  description: z.string().min(1, 'Alert description is required'),
  severity: z.enum(['minor', 'moderate', 'severe', 'extreme']),
});

// ============================================================================
// Stored Weather Data Schema
// ============================================================================

export const storedWeatherDataSchema = z.object({
  location: z.string().min(1, 'Location is required'),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
  }),
  current: weatherDisplayDataSchema.optional(),
  hourly: z.array(weatherDisplayDataSchema).default([]),
  daily: z.array(weatherDisplayDataSchema).default([]),
  alerts: z.array(weatherAlertSchema).default([]),
  lastUpdated: optionalTimestampSchema,
  expiresAt: optionalTimestampSchema,
});

// ============================================================================
// Project Weather Schema
// ============================================================================

export const projectWeatherSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  location: z.string().min(1, 'Location is required'),
  weatherData: storedWeatherDataSchema,
  lastFetched: optionalTimestampSchema,
  cacheExpiry: optionalTimestampSchema,
});

// ============================================================================
// Event Weather Schema
// ============================================================================

export const eventWeatherSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  eventTime: optionalTimestampSchema,
  weather: weatherDisplayDataSchema,
  confidence: z.enum(['high', 'medium', 'low']),
  lastUpdated: optionalTimestampSchema,
});

// ============================================================================
// Weather Fetch Job Schema
// ============================================================================

export const weatherFetchJobSchema = z.object({
  id: z.string().min(1, 'Job ID is required'),
  projectId: z.string().min(1, 'Project ID is required'),
  location: z.string().min(1, 'Location is required'),
  priority: z.enum(['high', 'normal', 'low']),
  requestedAt: optionalTimestampSchema,
  scheduledFor: optionalTimestampSchema,
  attempts: z.number().int().min(0),
  maxAttempts: z.number().int().positive(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  error: z.string().optional(),
});

// ============================================================================
// Input Schemas
// ============================================================================

export const weatherFetchRequestSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  location: z.string().min(1, 'Location is required'),
  coordinates: z
    .object({
      lat: z.number().min(-90).max(90),
      lon: z.number().min(-180).max(180),
    })
    .optional(),
  priority: z.enum(['high', 'normal', 'low']).default('normal'),
});

export const weatherUpdateRequestSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  forceRefresh: z.boolean().default(false),
});

// ============================================================================
// Query Schemas
// ============================================================================

export const weatherQuerySchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  includeHourly: z.boolean().default(true),
  includeDaily: z.boolean().default(true),
  includeAlerts: z.boolean().default(true),
  maxAge: z.number().int().positive().optional(),
});

export const weatherForecastQuerySchema = z.object({
  location: z.string().min(1, 'Location is required'),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
  }),
  startDate: optionalTimestampSchema,
  endDate: optionalTimestampSchema,
  units: z.enum(['metric', 'imperial']).default('metric'),
});

// ============================================================================
// Constants
// ============================================================================

export const WEATHER_CONSTANTS = {
  CACHE_DURATION: {
    CURRENT: 10 * 60 * 1000, // 10 minutes
    HOURLY: 30 * 60 * 1000, // 30 minutes
    DAILY: 2 * 60 * 60 * 1000, // 2 hours
  },
  UPDATE_INTERVALS: {
    PLANNING_CARD: 12 * 60 * 60 * 1000, // 12 hours
    PACKING_CARD: 6 * 60 * 60 * 1000, // 6 hours
    ACTION_CARD: 60 * 60 * 1000, // 1 hour
  },
  FORECAST_PERIODS: {
    PLANNING_DAYS_BEFORE: 5,
    PLANNING_DAYS_UNTIL: 2,
    PACKING_DAYS_BEFORE: 2,
    PACKING_DAYS_AFTER: 1,
    ACTION_HOURS_BEFORE: 12,
  },
} as const;

// ============================================================================
// Type Exports
// ============================================================================

export type WeatherCondition = z.infer<typeof weatherConditionSchema>;
export type WeatherDisplayData = z.infer<typeof weatherDisplayDataSchema>;
export type WeatherAlert = z.infer<typeof weatherAlertSchema>;
export type StoredWeatherData = z.infer<typeof storedWeatherDataSchema>;
export type ProjectWeather = z.infer<typeof projectWeatherSchema>;
export type EventWeather = z.infer<typeof eventWeatherSchema>;
export type WeatherFetchJob = z.infer<typeof weatherFetchJobSchema>;
export type WeatherFetchRequest = z.infer<typeof weatherFetchRequestSchema>;
export type WeatherUpdateRequest = z.infer<typeof weatherUpdateRequestSchema>;
export type WeatherQuery = z.infer<typeof weatherQuerySchema>;
export type WeatherForecastQuery = z.infer<typeof weatherForecastQuerySchema>;
