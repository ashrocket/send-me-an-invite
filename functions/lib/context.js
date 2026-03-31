/**
 * Build request context from Cloudflare Pages Function context.
 * Resolves the host from subdomain or defaults to config for self-hosted.
 */
export async function buildContext(cfContext) {
  const { env, request } = cfContext;
  const url = new URL(request.url);

  // For hosted tier: extract subdomain from Host header
  // For self-hosted: use 'default' host
  const hostname = url.hostname;
  let hostId = 'default';

  if (hostname.endsWith('.agentical.com')) {
    hostId = hostname.replace('.agentical.com', '');
  }

  // Load host config from D1
  const host = await env.DB.prepare('SELECT * FROM hosts WHERE id = ?')
    .bind(hostId)
    .first();

  if (!host) {
    return { error: 'Host not found', hostId };
  }

  return {
    hostId,
    host: {
      ...host,
      calendar_ids: JSON.parse(host.calendar_ids),
      meeting_types: JSON.parse(host.meeting_types),
      availability: JSON.parse(host.availability),
    },
    db: env.DB,
    kv: env.CACHE,
    env,
    request,
    url,
  };
}

/**
 * Get meeting types as a lookup object { id: { name, duration } }
 */
export function getMeetingTypesMap(host) {
  const map = {};
  for (const t of host.meeting_types) {
    map[t.id] = { name: t.name, duration: t.duration, description: t.description || '' };
  }
  return map;
}
