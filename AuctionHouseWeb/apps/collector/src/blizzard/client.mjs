import { region } from '../config.mjs';

const maxAttempts = 5;

export async function getAccessToken() {
  const credentials = Buffer.from(
    `${process.env.BLIZZARD_CLIENT_ID}:${process.env.BLIZZARD_CLIENT_SECRET}`,
  ).toString('base64');
  const response = await fetch(`https://${region}.battle.net/oauth/token`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${credentials}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) throw new Error(`OAuth failed: ${response.status}`);
  return (await response.json()).access_token;
}

export async function blizzardApi(path, accessToken) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(`https://${region}.api.blizzard.com${path}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });

    if (response.ok) return response.json();
    if ((response.status === 429 || response.status >= 500) && attempt < maxAttempts - 1) {
      const retryAfter = Number(response.headers.get('retry-after'));
      const delayMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : (attempt + 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }

    throw new Error(`Blizzard API failed: ${response.status} for ${path}`);
  }

  throw new Error(`Blizzard API retries exhausted for ${path}`);
}

export function connectedRealmId(reference) {
  const href = typeof reference === 'string' ? reference : reference?.href ?? reference?.key?.href;
  if (typeof href !== 'string') return null;
  const id = Number(href.match(/connected-realm\/(\d+)/)?.[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function localizedName(value, fallback) {
  if (typeof value === 'string' && value.trim()) return value;
  if (value && typeof value === 'object') {
    return value.en_US
      ?? value.en_GB
      ?? Object.values(value).find((entry) => typeof entry === 'string')
      ?? fallback;
  }
  return fallback;
}

export async function blizzardApiHref(href, accessToken) {
  const url = new URL(href);
  return blizzardApi(`${url.pathname}${url.search}`, accessToken);
}
