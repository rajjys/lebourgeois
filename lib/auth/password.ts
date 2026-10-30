import "server-only";
import { scrypt, timingSafeEqual } from "node:crypto";

/**
 * Hash format (produced by scripts/hash-password.mjs):
 *   scrypt:<N>:<r>:<p>:<saltBase64>:<hashBase64>
 */
export async function verifyPassword(password: string, stored: string | undefined): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, n, r, p, saltB64, hashB64] = parts;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const options = { N: Number(n), r: Number(r), p: Number(p), maxmem: 256 * 1024 * 1024 };

  const derived = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, expected.length, options, (err, key) => (err ? reject(err) : resolve(key)));
  });

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
