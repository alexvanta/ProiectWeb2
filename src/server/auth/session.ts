import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

export const SESSION_COOKIE_NAME = "p19_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  teamId: string | null;
  playerId: string | null;
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET environment variable must be set in production.");
  }
  return "p19-local-dev-session-secret-change-me";
}

export function signSessionToken(rawToken: string): string {
  const sig = crypto
    .createHmac("sha256", getSessionSecret())
    .update(rawToken)
    .digest("hex");
  return `${rawToken}.${sig}`;
}

export function verifySignedSessionToken(cookieValue: string): string | null {
  const dotIdx = cookieValue.lastIndexOf(".");
  if (dotIdx <= 0) return null;
  const rawToken = cookieValue.slice(0, dotIdx);
  const sigHex = cookieValue.slice(dotIdx + 1);
  if (!rawToken || !sigHex) return null;

  const expectedHex = crypto
    .createHmac("sha256", getSessionSecret())
    .update(rawToken)
    .digest("hex");

  const a = Buffer.from(sigHex, "hex");
  const b = Buffer.from(expectedHex, "hex");
  if (a.length !== b.length) return null;

  return crypto.timingSafeEqual(a, b) ? rawToken : null;
}

export function hashSessionToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export async function createSession(
  userId: string,
): Promise<{ cookieValue: string; expiresAt: Date }> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      tokenHash,
      userId,
      expiresAt,
    },
  });

  return {
    cookieValue: signSessionToken(rawToken),
    expiresAt,
  };
}

export async function getSessionUserFromCookie(
  cookieValue: string | undefined,
): Promise<SessionUser | null> {
  if (!cookieValue) return null;
  const rawToken = verifySignedSessionToken(cookieValue);
  if (!rawToken) return null;

  const tokenHash = hashSessionToken(rawToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          teamId: true,
          playerId: true,
        },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.user;
}

export async function destroySession(cookieValue: string | undefined): Promise<void> {
  if (!cookieValue) return;
  const rawToken = verifySignedSessionToken(cookieValue);
  if (!rawToken) return;
  const tokenHash = hashSessionToken(rawToken);
  await prisma.session.deleteMany({ where: { tokenHash } });
}
