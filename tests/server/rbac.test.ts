import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  assertAuthorized,
  assertCaptainOfTeam,
  AuthError,
} from "@/server/auth/rbac";
import {
  signSessionToken,
  verifySignedSessionToken,
  type SessionUser,
} from "@/server/auth/session";

const playerUser: SessionUser = {
  id: "u-player",
  email: "jucator@craiova.ro",
  name: "Jucător Demo",
  role: "PLAYER",
  teamId: "team-craiova",
  playerId: "p-1",
};

const captainUser: SessionUser = {
  id: "u-captain",
  email: "capitan@craiova.ro",
  name: "Căpitan Demo",
  role: "CAPTAIN",
  teamId: "team-craiova",
  playerId: "p-2",
};

const refereeUser: SessionUser = {
  id: "u-ref",
  email: "arbitru@superliga.ro",
  name: "Arbitru Demo",
  role: "REFEREE_ORGANIZER",
  teamId: null,
  playerId: null,
};

const adminUser: SessionUser = {
  id: "u-admin",
  email: "admin@superliga.ro",
  name: "Admin Demo",
  role: "ADMIN",
  teamId: null,
  playerId: null,
};

describe("Server-side Auth & RBAC enforcement (D-002)", () => {
  it("rejects unauthenticated visitors with 401", () => {
    expect(() => assertAuthorized(null, ["PLAYER", "ADMIN"])).toThrowError(AuthError);
    try {
      assertAuthorized(null, ["ADMIN"]);
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).status).toBe(401);
    }
  });

  it("rejects unauthorized roles with 403 across Referee and Admin boundaries", () => {
    for (const denied of [playerUser, captainUser]) {
      try {
        assertAuthorized(denied, ["REFEREE_ORGANIZER", "ADMIN"]);
        expect.unreachable("Should have thrown 403");
      } catch (err) {
        expect(err).toBeInstanceOf(AuthError);
        expect((err as AuthError).status).toBe(403);
      }
    }

    try {
      assertAuthorized(refereeUser, ["ADMIN"]);
      expect.unreachable("Referee should not access ADMIN routes");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).status).toBe(403);
    }

    expect(assertAuthorized(adminUser, ["ADMIN"])).toEqual(adminUser);
    expect(assertAuthorized(refereeUser, ["REFEREE_ORGANIZER", "ADMIN"])).toEqual(
      refereeUser,
    );
  });

  it("restricts Captain match-sheet submission strictly to their own team (Admin allowed for all)", () => {
    expect(assertCaptainOfTeam(captainUser, "team-craiova")).toEqual(captainUser);
    expect(assertCaptainOfTeam(adminUser, "team-rapid")).toEqual(adminUser);

    try {
      assertCaptainOfTeam(captainUser, "team-rapid");
      expect.unreachable("Captain should not submit sheet for another team");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).status).toBe(403);
    }
  });

  it("signs and verifies HTTP-only session tokens and rejects tampered tokens", () => {
    const signed = signSessionToken("raw-token-abc123");
    expect(verifySignedSessionToken(signed)).toBe("raw-token-abc123");
    expect(verifySignedSessionToken(`${signed}deadbeef`)).toBeNull();
    expect(verifySignedSessionToken("raw-token-abc123.0000")).toBeNull();
  });

  it("hashes and verifies passwords with scrypt", () => {
    const hashed = hashPassword("Admin123!");
    expect(hashed.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("Admin123!", hashed)).toBe(true);
    expect(verifyPassword("WrongPass!", hashed)).toBe(false);
  });
});
