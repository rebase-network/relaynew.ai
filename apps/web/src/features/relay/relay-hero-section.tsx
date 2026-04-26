import * as Shared from "../../shared";

function getRelayWebsiteLabel(value: string) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "";
    return `${host}${path}`;
  } catch {
    return value;
  }
}

export function RelayHeroSection({
  overview,
}: {
  overview: Shared.RelayOverviewResponse;
}) {
  return (
    <section className="panel relay-hero-panel bg-[linear-gradient(135deg,rgba(255,240,194,1),rgba(255,184,62,0.75))]">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(15rem,18rem)] xl:items-start">
        <div className="space-y-3.5 xl:col-span-2">
          <div>
            <h1 className="text-[2.85rem] leading-[0.94] tracking-[-0.05em] md:text-[3.7rem]">{overview.relay.name}</h1>
            {overview.relay.description ? (
              <p
                className="relay-hero-description mt-3 max-w-3xl text-sm leading-6 text-black/72"
                title={overview.relay.description}
              >
                {overview.relay.description}
              </p>
            ) : null}
          </div>
          {overview.relay.contactInfo || overview.relay.websiteUrl ? (
            <div className="relay-hero-meta-strip">
              {overview.relay.websiteUrl ? (
                <a
                  className="relay-hero-meta-item relay-hero-meta-link"
                  href={overview.relay.websiteUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="relay-hero-meta-label">官网</span>
                  <span className="relay-hero-meta-value">{getRelayWebsiteLabel(overview.relay.websiteUrl)}</span>
                </a>
              ) : null}
              {overview.relay.contactInfo ? (
                <div className="relay-hero-meta-item">
                  <span className="relay-hero-meta-label">联系</span>
                  <span className="relay-hero-meta-value break-words">{overview.relay.contactInfo}</span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
