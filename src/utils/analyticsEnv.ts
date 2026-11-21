export type AppEnv = "production" | "preview" | "development";

export const PRODUCTION_HOSTS = new Set(["repota.app", "www.repota.app", "repota.vercel.app"]);

const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function isPrivateOrLoopbackIPv4(host: string): boolean {
  const match = IPV4_REGEX.exec(host);
  if (!match) return false;

  const octets = match.slice(1).map(Number);
  if (octets.some((octet) => octet < 0 || octet > 255)) return false;

  const [a, b] = octets;
  if (a === 10 || a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

/**
 * Returns true for loopback, mDNS `.local`, and RFC1918 LAN development hostnames.
 */
export function isLocalHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!host) return true;

  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "[::1]" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.endsWith(".localhost")
  ) {
    return true;
  }

  return isPrivateOrLoopbackIPv4(host);
}

export interface ResolveAppEnvOptions {
  hostname?: string;
  vercelEnv?: string;
  isDevBuild?: boolean;
}

/**
 * Resolves the runtime analytics environment.
 * Localhost/LAN always resolves to `development`, Vercel preview deployments to `preview`,
 * and live deployments (`repota.app`, `www.repota.app`, and `repota.vercel.app`) to `production`.
 */
export function resolveAppEnv(options?: ResolveAppEnvOptions): AppEnv {
  const rawHostname =
    options?.hostname ?? (typeof window !== "undefined" ? window.location.hostname : "");
  const normalizedHost = rawHostname.trim().toLowerCase().replace(/\.$/, "");

  const vercelEnv = (
    options?.vercelEnv ?? (typeof __VERCEL_ENV__ !== "undefined" ? __VERCEL_ENV__ : "")
  )
    .trim()
    .toLowerCase();

  const isDevBuild = options?.isDevBuild ?? Boolean(import.meta.env.DEV);

  if (isLocalHostname(normalizedHost)) {
    return "development";
  }

  if (vercelEnv === "preview") {
    return "preview";
  }
  if (vercelEnv === "development") {
    return "development";
  }
  if (normalizedHost.endsWith(".vercel.app") && !PRODUCTION_HOSTS.has(normalizedHost)) {
    return "preview";
  }
  if (vercelEnv === "production") {
    return "production";
  }

  if (PRODUCTION_HOSTS.has(normalizedHost)) {
    return "production";
  }

  return isDevBuild ? "development" : "production";
}

/**
 * Analytics and session replay are only sent in live production.
 */
export function shouldSendAnalytics(appEnv: AppEnv = resolveAppEnv()): boolean {
  return appEnv === "production";
}
