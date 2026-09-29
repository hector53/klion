import Conf from 'conf';

interface KlionConfig {
  apiUrl: string;
  accessToken: string | null;
  serviceKey: string | null;
  user: {
    id: string;
    email: string;
    name: string;
  } | null;
}

const config = new Conf<KlionConfig>({
  projectName: 'klion',
  defaults: {
    apiUrl: 'http://localhost:3001/api',
    accessToken: null,
    serviceKey: null,
    user: null,
  },
});

export function getApiUrl(): string {
  return (
    process.env.KLION_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    config.get('apiUrl')
  );
}

export function setApiUrl(url: string): void {
  config.set('apiUrl', url);
}

export function getAccessToken(): string | null {
  return config.get('accessToken');
}

/**
 * Service key for headless auth (X-Service-Key). Resolved as:
 *   KLION_SERVICE_KEY env var  →  the conf store  →  null
 *
 * The conf-store fallback is what makes this tool-agnostic: set it once with
 * `klion config --service-key <key>` and every host that spawns this binary
 * (Claude Code, Codex, Cursor, a bare shell) picks it up, without each host
 * having to inject the env var in its own MCP config. When present it takes
 * precedence over the JWT — the `klion login` token expires in 7 days, the
 * wrong lifetime for an unattended agent.
 */
export function getServiceKey(): string | null {
  return process.env.KLION_SERVICE_KEY || config.get('serviceKey') || null;
}

export function setServiceKey(key: string): void {
  config.set('serviceKey', key);
}

export function clearServiceKey(): void {
  config.set('serviceKey', null);
}

export function setAccessToken(token: string): void {
  config.set('accessToken', token);
}

export function clearAccessToken(): void {
  config.set('accessToken', null);
  config.set('user', null);
}

export function getUser(): KlionConfig['user'] {
  return config.get('user');
}

export function setUser(user: KlionConfig['user']): void {
  config.set('user', user);
}

export function isAuthenticated(): boolean {
  return config.get('accessToken') !== null;
}

export function getConfigPath(): string {
  return config.path;
}

export default config;
