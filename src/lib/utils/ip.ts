import { NextRequest } from "next/server";

/**
 * 클라이언트 IP 주소 추출
 * Vercel, Cloudflare, nginx 등 프록시 환경 지원
 */
export function getClientIP(req: NextRequest): string | null {
  // Vercel
  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    // x-forwarded-for can be comma-separated list, take first
    return xForwardedFor.split(",")[0].trim();
  }

  // Cloudflare
  const cfConnectingIP = req.headers.get("cf-connecting-ip");
  if (cfConnectingIP) return cfConnectingIP;

  // Standard
  const xRealIP = req.headers.get("x-real-ip");
  if (xRealIP) return xRealIP;

  // Vercel specific
  const vercelIP = req.headers.get("x-vercel-forwarded-for");
  if (vercelIP) return vercelIP.split(",")[0].trim();

  return null;
}
