import {
  adminOverviewResponseSchema,
  adminPriceCreateSchema,
  adminPricesResponseSchema,
  adminRelayUpsertSchema,
  adminRelaysResponseSchema,
  adminSubmissionReviewSchema,
  adminSubmissionsResponseSchema,
  adminSponsorUpsertSchema,
  adminSponsorsResponseSchema,
  publicSubmissionRequestSchema,
  publicSubmissionResponseSchema,
} from "@relaynews/shared";
import type { FastifyInstance } from "fastify";
import type { Kysely, Transaction } from "kysely";

import type { Database } from "../db/types";
import { runPublicProbe } from "../lib/probe";
import {
  maskApiKey,
  toProbeCredentialVerification,
  toSubmissionProbeSummary,
} from "../lib/probe-credentials";
import { refreshPublicData } from "../lib/refresh-public-data";

type DbExecutor = Kysely<Database> | Transaction<Database>;

function slugifyRelayName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function ensureUniqueRelaySlug(db: DbExecutor, relayName: string) {
  const baseSlug = slugifyRelayName(relayName) || `relay-${Date.now()}`;
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await db
      .selectFrom("relays")
      .select("id")
      .where("slug", "=", candidate)
      .executeTakeFirst();

    if (!existing) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

async function resolveApprovedRelay(
  db: DbExecutor,
  submission: {
    id: string;
    relayName: string;
    baseUrl: string;
    websiteUrl: string | null;
    approvedRelayId: string | null;
  },
) {
  if (submission.approvedRelayId) {
    const approvedRelay = await db
      .selectFrom("relays")
      .select(["id", "slug", "name"])
      .where("id", "=", submission.approvedRelayId)
      .executeTakeFirst();

    if (approvedRelay) {
      return approvedRelay;
    }
  }

  const existingRelay = await db
    .selectFrom("relays")
    .select(["id", "slug", "name"])
    .where("base_url", "=", submission.baseUrl)
    .executeTakeFirst();

  if (existingRelay) {
    return existingRelay;
  }

  const createdAt = new Date().toISOString();
  const slug = await ensureUniqueRelaySlug(db, submission.relayName);

  return db
    .insertInto("relays")
    .values({
      slug,
      name: submission.relayName,
      base_url: submission.baseUrl,
      provider_name: null,
      description: null,
      website_url: submission.websiteUrl,
      docs_url: null,
      status: "pending",
      is_featured: false,
      is_sponsored: false,
      region_label: "global",
      notes: null,
      created_at: createdAt,
      updated_at: createdAt,
    })
    .returning(["id", "slug", "name"])
    .executeTakeFirstOrThrow();
}

export async function registerAdminRoutes(app: FastifyInstance) {
  app.get("/admin/overview", async () => {
    const [relays, pendingSubmissions, activeSponsors, priceRecords] = await Promise.all([
      app.db.selectFrom("relays").select(({ fn }) => fn.count<number>("id").as("count")).executeTakeFirstOrThrow(),
      app.db
        .selectFrom("submissions")
        .select(({ fn }) => fn.count<number>("id").as("count"))
        .where("status", "=", "pending")
        .executeTakeFirstOrThrow(),
      app.db
        .selectFrom("sponsors")
        .select(({ fn }) => fn.count<number>("id").as("count"))
        .where("status", "=", "active")
        .executeTakeFirstOrThrow(),
      app.db
        .selectFrom("relay_prices")
        .select(({ fn }) => fn.count<number>("id").as("count"))
        .executeTakeFirstOrThrow(),
    ]);

    return adminOverviewResponseSchema.parse({
      totals: {
        relays: Number(relays.count),
        pendingSubmissions: Number(pendingSubmissions.count),
        activeSponsors: Number(activeSponsors.count),
        priceRecords: Number(priceRecords.count),
      },
      measuredAt: new Date().toISOString(),
    });
  });

  app.get("/admin/relays", async () => {
    const rows = await app.db
      .selectFrom("relays")
      .select([
        "id",
        "slug",
        "name",
        "base_url as baseUrl",
        "provider_name as providerName",
        "website_url as websiteUrl",
        "status as catalogStatus",
        "is_featured as isFeatured",
        "is_sponsored as isSponsored",
        "updated_at as updatedAt",
      ])
      .orderBy("name", "asc")
      .execute();

    return adminRelaysResponseSchema.parse({ rows });
  });

  app.get("/admin/models", async () => {
    const rows = await app.db
      .selectFrom("models")
      .select(["id", "key", "name", "vendor"])
      .where("is_active", "=", true)
      .orderBy("name", "asc")
      .execute();

    return { rows };
  });

  app.post("/admin/relays", async (request, reply) => {
    const body = adminRelayUpsertSchema.parse(request.body ?? {});
    const row = await app.db
      .insertInto("relays")
      .values({
        slug: body.slug,
        name: body.name,
        base_url: body.baseUrl,
        provider_name: body.providerName ?? null,
        description: body.description ?? null,
        website_url: body.websiteUrl ?? null,
        docs_url: body.docsUrl ?? null,
        status: body.catalogStatus,
        is_featured: body.isFeatured,
        is_sponsored: body.isSponsored,
        region_label: "global",
        notes: body.notes ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returning(["id"])
      .executeTakeFirstOrThrow();

    await refreshPublicData(app.db);
    reply.code(201);
    return { ok: true, id: row.id };
  });

  app.patch("/admin/relays/:id", async (request) => {
    const params = request.params as { id: string };
    const body = adminRelayUpsertSchema.parse(request.body ?? {});
    await app.db
      .updateTable("relays")
      .set({
        slug: body.slug,
        name: body.name,
        base_url: body.baseUrl,
        provider_name: body.providerName ?? null,
        description: body.description ?? null,
        website_url: body.websiteUrl ?? null,
        docs_url: body.docsUrl ?? null,
        status: body.catalogStatus,
        is_featured: body.isFeatured,
        is_sponsored: body.isSponsored,
        notes: body.notes ?? null,
      })
      .where("id", "=", params.id)
      .executeTakeFirst();

    await refreshPublicData(app.db);
    return { ok: true };
  });

  app.get("/admin/submissions", async () => {
    const rows = await app.db
      .selectFrom("submissions")
      .select([
        "id",
        "relay_name as relayName",
        "base_url as baseUrl",
        "website_url as websiteUrl",
        "submitter_name as submitterName",
        "submitter_email as submitterEmail",
        "notes",
        "status",
        "review_notes as reviewNotes",
        "approved_relay_id as approvedRelayId",
        "created_at as createdAt",
      ])
      .orderBy("created_at", "desc")
      .execute();

    const submissionIds = rows.map((row) => row.id);
    const approvedRelayIds = rows.flatMap((row) => (row.approvedRelayId ? [row.approvedRelayId] : []));

    const [submissionCredentials, relayCredentials, approvedRelays] = await Promise.all([
      submissionIds.length === 0
        ? Promise.resolve([])
        : app.db
            .selectFrom("probe_credentials")
            .select([
              "id",
              "submission_id as submissionId",
              "status",
              "test_model as testModel",
              "compatibility_mode as compatibilityMode",
              "api_key as apiKey",
              "last_verified_at as lastVerifiedAt",
              "last_probe_ok as lastProbeOk",
              "last_health_status as lastHealthStatus",
              "last_http_status as lastHttpStatus",
              "last_message as lastMessage",
              "created_at as createdAt",
            ])
            .where("submission_id", "in", submissionIds)
            .where("status", "=", "active")
            .orderBy("created_at", "desc")
            .execute(),
      approvedRelayIds.length === 0
        ? Promise.resolve([])
        : app.db
            .selectFrom("probe_credentials")
            .select([
              "id",
              "relay_id as relayId",
              "status",
              "test_model as testModel",
              "compatibility_mode as compatibilityMode",
              "api_key as apiKey",
              "last_verified_at as lastVerifiedAt",
              "last_probe_ok as lastProbeOk",
              "last_health_status as lastHealthStatus",
              "last_http_status as lastHttpStatus",
              "last_message as lastMessage",
              "created_at as createdAt",
            ])
            .where("relay_id", "in", approvedRelayIds)
            .where("status", "=", "active")
            .orderBy("created_at", "desc")
            .execute(),
      approvedRelayIds.length === 0
        ? Promise.resolve([])
        : app.db
            .selectFrom("relays")
            .select(["id", "slug", "name"])
            .where("id", "in", approvedRelayIds)
            .execute(),
    ]);

    const activeSubmissionCredentialBySubmissionId = new Map<
      string,
      (typeof submissionCredentials)[number]
    >();
    for (const credential of submissionCredentials) {
      if (credential.submissionId && !activeSubmissionCredentialBySubmissionId.has(credential.submissionId)) {
        activeSubmissionCredentialBySubmissionId.set(credential.submissionId, credential);
      }
    }

    const activeRelayCredentialByRelayId = new Map<string, (typeof relayCredentials)[number]>();
    for (const credential of relayCredentials) {
      if (credential.relayId && !activeRelayCredentialByRelayId.has(credential.relayId)) {
        activeRelayCredentialByRelayId.set(credential.relayId, credential);
      }
    }

    const approvedRelayById = new Map(approvedRelays.map((relay) => [relay.id, relay]));

    return adminSubmissionsResponseSchema.parse({
      rows: rows.map((row) => {
        const approvedRelay = row.approvedRelayId ? approvedRelayById.get(row.approvedRelayId) ?? null : null;
        const probeCredential =
          activeSubmissionCredentialBySubmissionId.get(row.id) ??
          (row.approvedRelayId ? activeRelayCredentialByRelayId.get(row.approvedRelayId) : undefined);

        return {
          id: row.id,
          relayName: row.relayName,
          baseUrl: row.baseUrl,
          websiteUrl: row.websiteUrl,
          submitterName: row.submitterName,
          submitterEmail: row.submitterEmail,
          notes: row.notes,
          status: row.status,
          reviewNotes: row.reviewNotes,
          approvedRelay: approvedRelay
            ? {
                slug: approvedRelay.slug,
                name: approvedRelay.name,
              }
            : null,
          probeCredential: probeCredential
            ? {
                id: probeCredential.id,
                status: probeCredential.status,
                testModel: probeCredential.testModel,
                compatibilityMode: probeCredential.compatibilityMode,
                apiKeyPreview: maskApiKey(probeCredential.apiKey),
                lastVerifiedAt: probeCredential.lastVerifiedAt,
                lastProbeOk: probeCredential.lastProbeOk,
                lastHealthStatus: probeCredential.lastHealthStatus,
                lastHttpStatus: probeCredential.lastHttpStatus,
                lastMessage: probeCredential.lastMessage,
              }
            : null,
          createdAt: row.createdAt,
        };
      }),
    });
  });

  app.post("/public/submissions", async (request, reply) => {
    const body = publicSubmissionRequestSchema.parse(request.body ?? {});
    const createdAt = new Date().toISOString();
    const row = await app.db.transaction().execute(async (trx) => {
      const submission = await trx
        .insertInto("submissions")
        .values({
          relay_name: body.relayName,
          base_url: body.baseUrl,
          website_url: body.websiteUrl ?? null,
          submitter_name: body.submitterName ?? null,
          submitter_email: body.submitterEmail ?? null,
          notes: body.notes ?? null,
          status: "pending",
          review_notes: null,
          approved_relay_id: null,
          created_at: createdAt,
          updated_at: createdAt,
        })
        .returning(["id", "status"])
        .executeTakeFirstOrThrow();

      const credential = await trx
        .insertInto("probe_credentials")
        .values({
          submission_id: submission.id,
          relay_id: null,
          api_key: body.testApiKey,
          test_model: body.testModel,
          compatibility_mode: body.compatibilityMode,
          status: "active",
          last_verified_at: null,
          last_probe_ok: null,
          last_health_status: null,
          last_http_status: null,
          last_message: null,
          last_detection_mode: null,
          last_used_url: null,
          created_at: createdAt,
          updated_at: createdAt,
        })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      return {
        id: submission.id,
        status: submission.status,
        credentialId: credential.id,
      };
    });

    const probeResult = await runPublicProbe({
      baseUrl: body.baseUrl,
      apiKey: body.testApiKey,
      model: body.testModel,
      compatibilityMode: body.compatibilityMode,
    });

    await app.db
      .updateTable("probe_credentials")
      .set(toProbeCredentialVerification(probeResult))
      .where("id", "=", row.credentialId)
      .executeTakeFirst();

    reply.code(201);
    return publicSubmissionResponseSchema.parse({
      ok: true,
      id: row.id,
      status: row.status,
      probe: toSubmissionProbeSummary(probeResult),
    });
  });

  app.post("/admin/submissions/:id/review", async (request) => {
    const params = request.params as { id: string };
    const body = adminSubmissionReviewSchema.parse(request.body ?? {});
    await app.db.transaction().execute(async (trx) => {
      const submission = await trx
        .selectFrom("submissions")
        .select([
          "id",
          "relay_name as relayName",
          "base_url as baseUrl",
          "website_url as websiteUrl",
          "approved_relay_id as approvedRelayId",
        ])
        .where("id", "=", params.id)
        .executeTakeFirst();

      if (!submission) {
        throw app.httpErrors.notFound("Submission not found");
      }

      if (body.status === "approved") {
        const relay = await resolveApprovedRelay(trx, submission);

        await trx
          .updateTable("submissions")
          .set({
            status: body.status,
            review_notes: body.reviewNotes ?? null,
            approved_relay_id: relay.id,
          })
          .where("id", "=", params.id)
          .executeTakeFirst();

        const activeRelayCredential = await trx
          .selectFrom("probe_credentials")
          .select(["id"])
          .where("relay_id", "=", relay.id)
          .where("status", "=", "active")
          .executeTakeFirst();

        if (activeRelayCredential) {
          await trx
            .updateTable("probe_credentials")
            .set({ status: "rotated" })
            .where("id", "=", activeRelayCredential.id)
            .executeTakeFirst();
        }

        const activeSubmissionCredential = await trx
          .selectFrom("probe_credentials")
          .select(["id"])
          .where("submission_id", "=", params.id)
          .where("status", "=", "active")
          .executeTakeFirst();

        if (activeSubmissionCredential) {
          await trx
            .updateTable("probe_credentials")
            .set({
              submission_id: null,
              relay_id: relay.id,
            })
            .where("id", "=", activeSubmissionCredential.id)
            .executeTakeFirst();
        }

        return;
      }

      await trx
        .updateTable("submissions")
        .set({
          status: body.status,
          review_notes: body.reviewNotes ?? null,
        })
        .where("id", "=", params.id)
        .executeTakeFirst();

      await trx
        .updateTable("probe_credentials")
        .set({ status: "revoked" })
        .where("submission_id", "=", params.id)
        .where("status", "=", "active")
        .execute();
    });

    return { ok: true };
  });

  app.get("/admin/sponsors", async () => {
    const rows = await app.db
      .selectFrom("sponsors as s")
      .leftJoin("relays as r", "r.id", "s.relay_id")
      .select([
        "s.id",
        "s.name",
        "s.placement",
        "s.status",
        "s.start_at as startAt",
        "s.end_at as endAt",
        "r.slug as relaySlug",
        "r.name as relayName",
      ])
      .orderBy("s.start_at", "desc")
      .execute();

    return adminSponsorsResponseSchema.parse({
      rows: rows.map((row) => ({
        id: row.id,
        name: row.name,
        placement: row.placement,
        status: row.status,
        startAt: row.startAt,
        endAt: row.endAt,
        relay:
          row.relaySlug && row.relayName
            ? {
                slug: row.relaySlug,
                name: row.relayName,
              }
            : null,
      })),
    });
  });

  app.post("/admin/sponsors", async (request, reply) => {
    const body = adminSponsorUpsertSchema.parse(request.body ?? {});
    const row = await app.db
      .insertInto("sponsors")
      .values({
        relay_id: body.relayId ?? null,
        name: body.name,
        placement: body.placement,
        status: body.status,
        start_at: body.startAt,
        end_at: body.endAt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returning(["id"])
      .executeTakeFirstOrThrow();

    await refreshPublicData(app.db);
    reply.code(201);
    return { ok: true, id: row.id };
  });

  app.patch("/admin/sponsors/:id", async (request) => {
    const params = request.params as { id: string };
    const body = adminSponsorUpsertSchema.parse(request.body ?? {});
    await app.db
      .updateTable("sponsors")
      .set({
        relay_id: body.relayId ?? null,
        name: body.name,
        placement: body.placement,
        status: body.status,
        start_at: body.startAt,
        end_at: body.endAt,
      })
      .where("id", "=", params.id)
      .executeTakeFirst();

    await refreshPublicData(app.db);
    return { ok: true };
  });

  app.get("/admin/prices", async () => {
    const rows = await app.db
      .selectFrom("relay_prices as rp")
      .innerJoin("relays as r", "r.id", "rp.relay_id")
      .innerJoin("models as m", "m.id", "rp.model_id")
      .select([
        "rp.id",
        "r.slug",
        "r.name",
        "m.key as modelKey",
        "m.name as modelName",
        "rp.currency",
        "rp.input_price_per_1m as inputPricePer1M",
        "rp.output_price_per_1m as outputPricePer1M",
        "rp.source",
        "rp.effective_from as effectiveFrom",
      ])
      .orderBy("rp.effective_from", "desc")
      .execute();

    return adminPricesResponseSchema.parse({
      rows: rows.map((row) => ({
        id: row.id,
        relay: {
          slug: row.slug,
          name: row.name,
        },
        modelKey: row.modelKey,
        modelName: row.modelName,
        currency: row.currency,
        inputPricePer1M: row.inputPricePer1M,
        outputPricePer1M: row.outputPricePer1M,
        source: row.source,
        effectiveFrom: row.effectiveFrom,
      })),
    });
  });

  app.post("/admin/prices", async (request, reply) => {
    const body = adminPriceCreateSchema.parse(request.body ?? {});
    const row = await app.db
      .insertInto("relay_prices")
      .values({
        relay_id: body.relayId,
        model_id: body.modelId,
        currency: body.currency,
        input_price_per_1m: body.inputPricePer1M ?? null,
        output_price_per_1m: body.outputPricePer1M ?? null,
        cache_read_price_per_1m: null,
        cache_write_price_per_1m: null,
        effective_from: body.effectiveFrom,
        source: body.source,
        captured_at: new Date().toISOString(),
      })
      .returning(["id"])
      .executeTakeFirstOrThrow();

    await refreshPublicData(app.db);
    reply.code(201);
    return { ok: true, id: row.id };
  });

  app.post("/admin/refresh-public", async () => {
    const result = await refreshPublicData(app.db);
    return { ok: true, measuredAt: result.measuredAt };
  });
}
