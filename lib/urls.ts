// Validation for links the admin saves. They're rendered as links and images
// on the public site, so only real web URLs get through — never javascript:,
// data: and the like. No Node imports: safe anywhere.

// The admin panel shows API errors as-is — same text as SocialEditor's own check
export const INVALID_URL_MESSAGE = 'بەستەرێکی دروست بنووسە (https://...)';

function parseUrl(value: unknown): URL | null {
  if (typeof value !== 'string') return null;
  try {
    return new URL(value.trim());
  } catch {
    return null;
  }
}

export function isHttpsUrl(value: unknown): value is string {
  return parseUrl(value)?.protocol === 'https:';
}

export function isWebUrl(value: unknown): value is string {
  const protocol = parseUrl(value)?.protocol;
  return protocol === 'https:' || protocol === 'http:';
}

// For optional link fields: '' or null clears the field (null), a link typed
// without a scheme gets https://, and http:// is upgraded. Returns undefined
// when the value isn't a usable https link.
export function normalizeHttpsUrl(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return undefined;
  const s = value.trim();
  if (!s) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s.replace(/^http:\/\//i, 'https://') : `https://${s}`;
  return isHttpsUrl(withScheme) ? withScheme : undefined;
}
