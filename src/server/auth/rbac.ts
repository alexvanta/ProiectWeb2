import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { UserRole } from "@prisma/client";
import {
  getSessionUserFromCookie,
  SESSION_COOKIE_NAME,
  type SessionUser,
} from "./session";

export type AppRole = "VISITOR" | UserRole;

export class AuthError extends Error {
  readonly status: 401 | 403;
  constructor(status: 401 | 403, message: string) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export class DomainValidationError extends Error {
  readonly status: 400 | 404 | 422;
  readonly details?: Record<string, unknown>;
  constructor(
    status: 400 | 404 | 422,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DomainValidationError";
    this.status = status;
    this.details = details;
  }
}

/**
 * Pure server-side RBAC check.
 * Rejects unauthenticated visitors with 401 and unauthorized roles with 403.
 */
export function assertAuthorized(
  user: SessionUser | null,
  allowedRoles: readonly UserRole[],
): SessionUser {
  if (!user) {
    throw new AuthError(401, "Autentificare necesară pentru această acțiune.");
  }
  if (!allowedRoles.includes(user.role)) {
    throw new AuthError(
      403,
      "Nu ai permisiunea necesară pentru a accesa această resursă.",
    );
  }
  return user;
}

/**
 * Enforces that a Captain can only act on their own team (Admin bypasses).
 */
export function assertCaptainOfTeam(
  user: SessionUser | null,
  teamId: string,
): SessionUser {
  const authed = assertAuthorized(user, ["CAPTAIN", "ADMIN"]);
  if (authed.role === "CAPTAIN" && authed.teamId !== teamId) {
    throw new AuthError(
      403,
      "Căpitanul poate depune foaia de meci doar pentru propria echipă.",
    );
  }
  return authed;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return getSessionUserFromCookie(token);
}

export async function requireRole(
  allowedRoles: readonly UserRole[],
): Promise<SessionUser> {
  const user = await getCurrentUser();
  return assertAuthorized(user, allowedRoles);
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof DomainValidationError) {
    return NextResponse.json(
      { error: err.message, ...(err.details ? { details: err.details } : {}) },
      { status: err.status },
    );
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Date de intrare invalide.",
        issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 400 },
    );
  }
  console.error("[API Error]", err);
  return NextResponse.json(
    { error: "Eroare internă de server." },
    { status: 500 },
  );
}
