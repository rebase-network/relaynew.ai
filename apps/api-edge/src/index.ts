interface VpcNetworkBinding {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface Env {
  API_TUNNEL: VpcNetworkBinding;
}

function buildUpstreamUrl(request: Request) {
  const incomingUrl = new URL(request.url);
  return new URL(`${incomingUrl.pathname}${incomingUrl.search}`, "http://api:8787");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const incomingUrl = new URL(request.url);
    const upstreamUrl = buildUpstreamUrl(request);
    const headers = new Headers(request.headers);

    headers.set("x-forwarded-host", incomingUrl.host);
    headers.set("x-forwarded-proto", incomingUrl.protocol.replace(":", ""));

    const upstreamRequest = new Request(upstreamUrl.toString(), {
      method: request.method,
      headers,
      body: request.body,
      redirect: "manual",
    });

    return env.API_TUNNEL.fetch(upstreamRequest);
  },
};
