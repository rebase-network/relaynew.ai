import { z } from "zod";

import { healthStatusSchema, isoTimestampSchema } from "./common";
import {
  probeCompatibilityModeSchema,
  probeDetectionModeSchema,
  probeResolvedCompatibilityModeSchema,
} from "./probe";

const trimString = (value: unknown) => (typeof value === "string" ? value.trim() : value);
const emptyStringToUndefined = (value: unknown) => {
  const trimmed = trimString(value);
  return trimmed === "" ? undefined : trimmed;
};
const numberInputToNullable = (value: unknown) => {
  const trimmed = trimString(value);
  if (trimmed === "" || trimmed === undefined || trimmed === null) {
    return null;
  }

  if (typeof trimmed === "number") {
    return trimmed;
  }

  if (typeof trimmed === "string") {
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : trimmed;
  }

  return trimmed;
};
const requiredHttpsUrlSchema = z.preprocess(trimString, z.url({ protocol: /^https$/ }));
const optionalUrlSchema = z.preprocess(emptyStringToUndefined, z.url().optional());
const optionalNonEmptyStringSchema = z.preprocess(emptyStringToUndefined, z.string().min(1).optional());
const requiredNonEmptyStringSchema = z.preprocess(trimString, z.string().min(1));
const internalIdSchema = z.string().min(1);
const nullablePriceNumberSchema = z.preprocess(
  numberInputToNullable,
  z.number().finite().min(0).nullable(),
);

export const submissionModelPriceSchema = z
  .object({
    modelKey: requiredNonEmptyStringSchema,
    inputPricePer1M: nullablePriceNumberSchema,
    outputPricePer1M: nullablePriceNumberSchema,
  })
  .refine(
    (value) => value.inputPricePer1M !== null || value.outputPricePer1M !== null,
    {
      message: "At least one price field is required",
      path: ["inputPricePer1M"],
    },
  );

export const publicSubmissionRequestSchema = z.object({
  relayName: requiredNonEmptyStringSchema,
  baseUrl: requiredHttpsUrlSchema,
  websiteUrl: optionalUrlSchema,
  contactInfo: requiredNonEmptyStringSchema,
  description: requiredNonEmptyStringSchema,
  notes: optionalNonEmptyStringSchema,
  modelPrices: z.array(submissionModelPriceSchema).min(1),
  testApiKey: requiredNonEmptyStringSchema,
  testModel: optionalNonEmptyStringSchema,
  compatibilityMode: z.preprocess(trimString, probeCompatibilityModeSchema).default("auto"),
});

export const submissionProbeSummarySchema = z.object({
  ok: z.boolean(),
  healthStatus: healthStatusSchema,
  httpStatus: z.number().int().min(100).max(599).nullable(),
  message: z.string().nullable(),
  verifiedAt: isoTimestampSchema,
  compatibilityMode: probeResolvedCompatibilityModeSchema.nullable().optional(),
  detectionMode: probeDetectionModeSchema.optional(),
});

export const publicSubmissionResponseSchema = z.object({
  ok: z.literal(true),
  id: internalIdSchema,
  status: z.enum(["pending", "approved", "rejected", "archived"]),
  probe: submissionProbeSummarySchema.nullable().optional(),
});

export type PublicSubmissionRequest = z.infer<typeof publicSubmissionRequestSchema>;
export type SubmissionProbeSummary = z.infer<typeof submissionProbeSummarySchema>;
export type PublicSubmissionResponse = z.infer<typeof publicSubmissionResponseSchema>;
export type SubmissionModelPrice = z.infer<typeof submissionModelPriceSchema>;
