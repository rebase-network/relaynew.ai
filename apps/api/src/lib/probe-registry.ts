import {
  type ProbeCompatibilityMode,
  type ProbeResolvedCompatibilityMode,
  type PublicProbeRequest,
} from "@relaynews/shared";

export type ProbeModelFamily = "openai" | "anthropic" | "generic";

export type ProbeAttempt = {
  mode: ProbeResolvedCompatibilityMode;
  method: "POST";
  url: URL;
  body: string;
  headers?: Record<string, string>;
};

export type ProbeAttemptResult = {
  attempt: ProbeAttempt;
  response: Response;
  latencyMs: number;
  body: string;
  contentType: string;
};

export type ProbeAdapter = {
  key: ProbeResolvedCompatibilityMode;
  label: string;
  buildAttempts: (targetUrl: URL, request: PublicProbeRequest) => ProbeAttempt[];
  matches: (result: ProbeAttemptResult) => boolean;
};

const OPENAI_RESPONSES = "openai-responses" as const;
const OPENAI_CHAT = "openai-chat-completions" as const;
const ANTHROPIC_MESSAGES = "anthropic-messages" as const;

export const probeCompatibilityModeLabels: Record<ProbeResolvedCompatibilityMode, string> = {
  [OPENAI_RESPONSES]: "OpenAI Responses",
  [OPENAI_CHAT]: "OpenAI Chat Completions",
  [ANTHROPIC_MESSAGES]: "Anthropic Messages",
};

function joinPath(basePath: string, suffix: string) {
  const normalizedBase = basePath === "/" ? "" : basePath.replace(/\/$/, "");
  const normalizedSuffix = suffix.startsWith("/") ? suffix : `/${suffix}`;
  return normalizedBase ? `${normalizedBase}${normalizedSuffix}` : normalizedSuffix;
}

function buildPathVariants(targetUrl: URL) {
  const basePath = targetUrl.pathname === "/" ? "" : targetUrl.pathname.replace(/\/$/, "");
  const variants = new Set<string>();

  if (basePath.endsWith("/v1")) {
    variants.add(basePath);
    variants.add(basePath.slice(0, -3) || "");
  } else {
    variants.add(joinPath(basePath, "/v1"));
    variants.add(basePath);
  }

  return [...variants];
}

function withPath(targetUrl: URL, pathname: string) {
  const nextUrl = new URL(targetUrl.toString());
  nextUrl.pathname = pathname || "/";
  return nextUrl;
}

function asJsonRecord(body: string) {
  if (!body.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(body) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

function hasJsonContentType(contentType: string) {
  return contentType.toLowerCase().includes("application/json");
}

function hasEventStreamContentType(contentType: string) {
  return contentType.toLowerCase().includes("text/event-stream");
}

function buildOpenAiResponsesBody(model: string) {
  return JSON.stringify({
    model,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "ping",
          },
        ],
      },
    ],
    stream: true,
    max_output_tokens: 1,
  });
}

function buildOpenAiChatBody(model: string) {
  return JSON.stringify({
    model,
    messages: [
      {
        role: "user",
        content: "ping",
      },
    ],
    stream: true,
    max_tokens: 1,
  });
}

function buildAnthropicMessagesBody(model: string) {
  return JSON.stringify({
    model,
    max_tokens: 1,
    stream: true,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "ping",
          },
        ],
      },
    ],
  });
}

function matchOpenAiResponses(result: ProbeAttemptResult) {
  if (!result.response.ok) {
    return false;
  }

  const record = asJsonRecord(result.body);
  if (record?.object === "response") {
    return true;
  }

  if (hasEventStreamContentType(result.contentType)) {
    return result.body.includes("response.created") || result.body.includes('"object":"response"');
  }

  if (hasJsonContentType(result.contentType)) {
    return result.body.includes('"object":"response"');
  }

  return false;
}

function matchOpenAiChatCompletions(result: ProbeAttemptResult) {
  if (!result.response.ok) {
    return false;
  }

  const record = asJsonRecord(result.body);
  if (record?.object === "chat.completion" || Array.isArray(record?.choices)) {
    return true;
  }

  if (hasEventStreamContentType(result.contentType)) {
    return result.body.includes('"object":"chat.completion.chunk"') || result.body.includes('"choices"');
  }

  if (hasJsonContentType(result.contentType)) {
    return result.body.includes('"choices"');
  }

  return false;
}

function matchAnthropicMessages(result: ProbeAttemptResult) {
  if (!result.response.ok) {
    return false;
  }

  const record = asJsonRecord(result.body);
  if (record?.type === "message") {
    return true;
  }

  if (hasEventStreamContentType(result.contentType)) {
    return result.body.includes("event: message_start") || result.body.includes('"type":"message_start"');
  }

  if (hasJsonContentType(result.contentType)) {
    return result.body.includes('"type":"message"');
  }

  return false;
}

function buildModeAttempts(
  mode: ProbeResolvedCompatibilityMode,
  targetUrl: URL,
  request: PublicProbeRequest,
  suffix: string,
  body: string,
  headers?: Record<string, string>,
) {
  return buildPathVariants(targetUrl).map((basePath) => {
    const attempt: ProbeAttempt = {
      mode,
      method: "POST",
      url: withPath(targetUrl, joinPath(basePath, suffix)),
      body,
    };

    if (headers) {
      attempt.headers = headers;
    }

    return attempt;
  });
}

export const probeAdapterRegistry: Record<ProbeResolvedCompatibilityMode, ProbeAdapter> = {
  [OPENAI_RESPONSES]: {
    key: OPENAI_RESPONSES,
    label: probeCompatibilityModeLabels[OPENAI_RESPONSES],
    buildAttempts: (targetUrl, request) =>
      buildModeAttempts(OPENAI_RESPONSES, targetUrl, request, "/responses", buildOpenAiResponsesBody(request.model)),
    matches: matchOpenAiResponses,
  },
  [OPENAI_CHAT]: {
    key: OPENAI_CHAT,
    label: probeCompatibilityModeLabels[OPENAI_CHAT],
    buildAttempts: (targetUrl, request) =>
      buildModeAttempts(OPENAI_CHAT, targetUrl, request, "/chat/completions", buildOpenAiChatBody(request.model)),
    matches: matchOpenAiChatCompletions,
  },
  [ANTHROPIC_MESSAGES]: {
    key: ANTHROPIC_MESSAGES,
    label: probeCompatibilityModeLabels[ANTHROPIC_MESSAGES],
    buildAttempts: (targetUrl, request) =>
      buildModeAttempts(
        ANTHROPIC_MESSAGES,
        targetUrl,
        request,
        "/messages",
        buildAnthropicMessagesBody(request.model),
        {
          "anthropic-version": "2023-06-01",
          "x-api-key": request.apiKey,
        },
      ),
    matches: matchAnthropicMessages,
  },
};

export function inferProbeModelFamily(model: string): ProbeModelFamily {
  const normalized = model.trim().toLowerCase();

  if (!normalized) {
    return "generic";
  }

  if (
    normalized.includes("claude")
    || normalized.startsWith("anthropic")
    || normalized.startsWith("haiku")
    || normalized.startsWith("sonnet")
    || normalized.startsWith("opus")
  ) {
    return "anthropic";
  }

  if (
    normalized.startsWith("gpt")
    || normalized.startsWith("o1")
    || normalized.startsWith("o3")
    || normalized.startsWith("o4")
    || normalized.includes("codex")
    || normalized.includes("openai")
  ) {
    return "openai";
  }

  return "generic";
}

export function getAutoProbeModes(model: string): ProbeResolvedCompatibilityMode[] {
  const family = inferProbeModelFamily(model);

  switch (family) {
    case "anthropic":
      return [ANTHROPIC_MESSAGES, OPENAI_CHAT, OPENAI_RESPONSES];
    case "openai":
      return [OPENAI_RESPONSES, OPENAI_CHAT, ANTHROPIC_MESSAGES];
    default:
      return [OPENAI_RESPONSES, OPENAI_CHAT, ANTHROPIC_MESSAGES];
  }
}

export function resolveProbeModes(mode: ProbeCompatibilityMode, model: string): ProbeResolvedCompatibilityMode[] {
  if (mode !== "auto") {
    return [mode];
  }

  return getAutoProbeModes(model);
}

export function buildProbeAttempts(targetUrl: URL, request: PublicProbeRequest): ProbeAttempt[] {
  return resolveProbeModes(request.compatibilityMode, request.model).flatMap((mode) =>
    probeAdapterRegistry[mode].buildAttempts(targetUrl, request),
  );
}
