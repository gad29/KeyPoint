import {
  env,
  hasAiReviewConfig,
  hasAirtableConfig,
  hasEmailConfig,
  hasGoogleConfig,
  hasLiveAppBaseUrl,
  hasN8nConfig,
  hasOcrConfig,
  hasOfficeAlertsConfig,
  hasPortalInviteSecret,
  hasSmsConfig,
  hasWhatsappConfig,
  isLocalUploadMode,
  looksLikePlaceholder,
} from '@/lib/env';

type Status = 'good' | 'warn' | 'danger';

type Check = {
  label: string;
  status: Status;
  value: string;
  note: string;
};

function StatusBadge({ status, text }: { status: Status; text: string }) {
  return <span className={`badge ${status}`}>{text}</span>;
}

function maskSecret(value?: string | null) {
  if (!value) return 'Missing';
  if (value.length <= 8) return 'Configured';
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function hostLabel(value?: string | null) {
  if (!value) return 'Missing';
  try {
    return new URL(value).host;
  } catch {
    return value;
  }
}

function buildChecks(): Array<{ title: string; items: Check[] }> {
  return [
    {
      title: 'Core app',
      items: [
        {
          label: 'App base URL',
          status: hasLiveAppBaseUrl() ? 'good' : 'warn',
          value: env.appBaseUrl,
          note: hasLiveAppBaseUrl() ? 'Looks production-ready.' : 'Still points to localhost or a non-live URL.',
        },
        {
          label: 'Portal invite secret',
          status: hasPortalInviteSecret() ? 'good' : 'danger',
          value: maskSecret(env.portalInviteSecret),
          note: hasPortalInviteSecret() ? 'Invite signing secret is configured.' : 'Replace the default secret before live rollout.',
        },
      ],
    },
    {
      title: 'System of record + automation',
      items: [
        {
          label: 'Airtable',
          status: hasAirtableConfig() ? 'good' : 'danger',
          value: hasAirtableConfig() ? 'Configured' : 'Missing',
          note: hasAirtableConfig() ? 'Live case creation/loading is available.' : 'Cases cannot be created live until Airtable is configured.',
        },
        {
          label: 'n8n',
          status: hasN8nConfig() ? 'good' : 'warn',
          value: hostLabel(env.n8nWebhookBaseUrl),
          note: hasN8nConfig() ? 'Automation bridge looks wired.' : 'n8n base URL is placeholder or missing.',
        },
        {
          label: 'Office alerts',
          status: hasOfficeAlertsConfig() ? 'good' : 'warn',
          value: hostLabel(env.officeAlertWebhookUrl),
          note: hasOfficeAlertsConfig() ? 'Staff alert path is configured.' : 'Office alerts are not wired yet.',
        },
      ],
    },
    {
      title: 'Client messaging',
      items: [
        {
          label: 'WhatsApp',
          status: hasWhatsappConfig() ? 'good' : 'warn',
          value: hasWhatsappConfig() ? 'Configured' : 'Not ready',
          note: hasWhatsappConfig() ? 'Webhook or Twilio-based WhatsApp path exists.' : 'No confirmed outbound WhatsApp path yet.',
        },
        {
          label: 'SMS',
          status: hasSmsConfig() ? 'good' : 'warn',
          value: hasSmsConfig() ? 'Configured' : 'Optional / missing',
          note: hasSmsConfig() ? 'SMS fallback path exists.' : 'SMS is optional, but fallback is not fully wired.',
        },
        {
          label: 'Email',
          status: hasEmailConfig() ? 'good' : 'warn',
          value: hasEmailConfig() ? 'Configured' : 'Optional / missing',
          note: hasEmailConfig() ? 'Email fallback looks available.' : 'Email fallback is not fully wired.',
        },
      ],
    },
    {
      title: 'Documents + enrichment',
      items: [
        {
          label: 'Upload storage mode',
          status: isLocalUploadMode() ? 'warn' : 'good',
          value: isLocalUploadMode() ? 'Local disk' : 'External/public path',
          note: isLocalUploadMode()
            ? 'Fine for MVP testing, but not ideal for production/serverless durability.'
            : 'Upload references can resolve outside local disk.',
        },
        {
          label: 'OCR',
          status: hasOcrConfig() ? 'good' : 'warn',
          value: hostLabel(env.documentOcrWebhookUrl),
          note: hasOcrConfig() ? 'OCR handoff endpoint is configured.' : 'Upload-review OCR step is still missing or placeholder.',
        },
        {
          label: 'AI review',
          status: hasAiReviewConfig() ? 'good' : 'warn',
          value: hostLabel(env.aiReviewWebhookUrl),
          note: hasAiReviewConfig() ? 'AI review handoff endpoint is configured.' : 'AI review endpoint is still missing or placeholder.',
        },
        {
          label: 'Google integrations',
          status: hasGoogleConfig() ? 'good' : 'warn',
          value: hasGoogleConfig() ? 'Configured' : 'Optional / missing',
          note: hasGoogleConfig() ? 'Service account credentials exist.' : 'Drive/Sheets automation is not wired yet.',
        },
      ],
    },
  ];
}

export default function ConnectionsPage() {
  const groups = buildChecks();
  const flat = groups.flatMap((group) => group.items);
  const readyCount = flat.filter((item) => item.status === 'good').length;
  const warnCount = flat.filter((item) => item.status === 'warn').length;
  const dangerCount = flat.filter((item) => item.status === 'danger').length;
  const likelyGoLiveReady = hasAirtableConfig() && hasPortalInviteSecret() && hasN8nConfig() && hasWhatsappConfig();

  return (
    <div className="grid">
      <section className="hero">
        <div>
          <p className="eyebrow">Connection status</p>
          <h2>{likelyGoLiveReady ? 'KeyPoint is close to a live rollout.' : 'KeyPoint still needs a few connection gaps closed.'}</h2>
          <p className="muted">
            This screen summarizes whether the current environment looks production-ready without exposing raw secrets.
          </p>
        </div>
        <div className="hero-actions">
          <StatusBadge status="good" text={`${readyCount} ready`} />
          <StatusBadge status="warn" text={`${warnCount} review`} />
          <StatusBadge status="danger" text={`${dangerCount} blockers`} />
        </div>
      </section>

      <div className="grid cols-3">
        <section className="card stat-card">
          <p className="eyebrow">Go-live posture</p>
          <h3>{likelyGoLiveReady ? 'Near-ready' : 'Not ready'}</h3>
          <p className="muted">Minimum live bar here is Airtable, n8n, invite secret, and a real outbound client notification path.</p>
        </section>
        <section className="card stat-card">
          <p className="eyebrow">Production domain</p>
          <h3>{looksLikePlaceholder(env.appBaseUrl) ? 'Check URL' : hostLabel(env.appBaseUrl)}</h3>
          <p className="muted">Expected public host is the main KeyPoint deployment target.</p>
        </section>
        <section className="card stat-card">
          <p className="eyebrow">Upload durability</p>
          <h3>{isLocalUploadMode() ? 'Local only' : 'Externalized'}</h3>
          <p className="muted">Local uploads are okay for testing, but they are the next thing to harden for production.</p>
        </section>
      </div>

      {groups.map((group) => (
        <section key={group.title} className="card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Setup group</p>
              <h3>{group.title}</h3>
            </div>
          </div>
          <div className="connection-grid">
            {group.items.map((item) => (
              <article key={item.label} className="connection-card">
                <div className="split connection-topline">
                  <strong>{item.label}</strong>
                  <StatusBadge status={item.status} text={item.status === 'good' ? 'Ready' : item.status === 'warn' ? 'Needs review' : 'Blocking'} />
                </div>
                <p className="connection-value">{item.value}</p>
                <p className="muted">{item.note}</p>
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className="card">
        <p className="eyebrow">Recommended next moves</p>
        <ul className="list">
          {!hasN8nConfig() ? <li>Replace the placeholder n8n base URL with the real webhook host and re-run settings generation.</li> : null}
          {isLocalUploadMode() ? <li>Choose a durable upload path before live launch so document URLs survive redeploys.</li> : null}
          {!hasWhatsappConfig() ? <li>Decide the real outbound WhatsApp path so status updates and workflow notifications can actually send.</li> : null}
          {!hasOfficeAlertsConfig() ? <li>Wire the office alert endpoint so the team gets notified when new cases or events arrive.</li> : null}
          {!hasOcrConfig() ? <li>Pick the OCR endpoint if document extraction is part of the MVP scope for launch.</li> : null}
          {!hasAiReviewConfig() ? <li>Leave AI review disabled for MVP or choose the handoff endpoint and test it before enabling workflow 6.</li> : null}
        </ul>
      </section>
    </div>
  );
}
