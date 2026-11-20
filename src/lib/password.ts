import crypto from "crypto";

const KEY_LEN = 64;

/**
 * Hashes a plaintext password using Node's built-in scrypt with a random 16-byte salt.
 * Format: scrypt$<saltHex>$<derivedKeyHex>
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, KEY_LEN).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

/**
 * Verifies a plaintext password against a stored scrypt hash using timing-safe comparison.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, keyHex] = parts;
  if (!salt || !keyHex) return false;

  const expected = Buffer.from(keyHex, "hex");
  const actual = crypto.scryptSync(password, salt, expected.length);
  if (expected.length !== actual.length) return false;

  return crypto.timingSafeEqual(expected, actual);
}
