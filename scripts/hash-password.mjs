// Usage: node scripts/hash-password.mjs '<password>'
// Prints a value for ADMIN_PASSWORD_HASH.
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error("Provide a password of at least 12 characters.");
  process.exit(1);
}

const N = 2 ** 15, r = 8, p = 1;
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64, { N, r, p, maxmem: 256 * 1024 * 1024 });
console.log(`scrypt:${N}:${r}:${p}:${salt.toString("base64")}:${hash.toString("base64")}`);
