import { z } from "zod";

import { healthStatusSchema, isoTimestampSchema } from "./common";

export const probeResolvedCompatibilityModeSchema = z.enum([
  "openai-responses",
  "openai-chat-completions",
  "anthropic-messages",
]);

export const probeCompatibilityModeSchema = z.enum([
  "auto",
  ...probeResolvedCompatibilityModeSchema.options,
]);

export const probeDetectionModeSchema = z.enum(["auto", "manual"]);

export const probeResolvedCompatibilityModes = probeResolvedCompatibilityModeSchema.options;
export const probeCompatibilityModes = probeCompatibilityModeSchema.options;

export const publicProbeRequestSchema = z.object({
  baseUrl: z.url({ protocol: /^https$/ }),
  apiKey: z.string().min(1),
  model: z.string().min(1),
  compatibilityMode: probeCompatibilityModeSchema.default("auto"),
});

export const publicProbeResponseSchema = z.object({
  ok: z.boolean(),
  targetHost: z.string().min(1),
  model: z.string().min(1),
  connectivity: z.object({
    ok: z.boolean(),
    latencyMs: z.number().int().nonnegative().nullable(),
  }),
  protocol: z.object({
    ok: z.boolean(),
    healthStatus: healthStatusSchema,
    httpStatus: z.number().int().min(100).max(599).nullable().optional(),
  }),
  compatibilityMode: probeResolvedCompatibilityModeSchema.nullable().optional(),
  detectionMode: probeDetectionModeSchema.optional(),
  usedUrl: z.url({ protocol: /^https$/ }).nullable().optional(),
  attemptedModes: z.array(probeResolvedCompatibilityModeSchema).default([]),
  message: z.string().min(1).nullable().optional(),
  measuredAt: isoTimestampSchema,
});

export type ProbeResolvedCompatibilityMode = z.infer<typeof probeResolvedCompatibilityModeSchema>;
export type ProbeCompatibilityMode = z.infer<typeof probeCompatibilityModeSchema>;
export type ProbeDetectionMode = z.infer<typeof probeDetectionModeSchema>;
export type PublicProbeRequest = z.infer<typeof publicProbeRequestSchema>;
export type PublicProbeResponse = z.infer<typeof publicProbeResponseSchema>;
