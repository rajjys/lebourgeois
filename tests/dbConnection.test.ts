/** How database clients connect (O-15, lib/dbConnection.ts). No network: addresses only. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { X509Certificate } from "node:crypto";
import { pgConfig, SUPABASE_ROOT_CA } from "../lib/dbConnection";

const POOLER = "postgresql://postgres.abcdefghijklmnopqrst:p%40ss%23w%2Frd%3F@aws-1-eu-west-1.pooler.supabase.com:6543/postgres";

test("the pinned root is Supabase Root 2021 CA, with the fingerprint recorded in the code", () => {
  const cert = new X509Certificate(SUPABASE_ROOT_CA);
  assert.match(cert.subject, /CN=Supabase Root 2021 CA/);
  assert.equal(cert.subject, cert.issuer);
  assert.equal(
    cert.fingerprint256,
    "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA",
  );
});

test("Supabase: the address loses its TLS settings and Supabase's root is trusted", () => {
  const config = pgConfig(`${POOLER}?uselibpqcompat=true&sslmode=require`);
  assert.equal(config.ssl?.ca, SUPABASE_ROOT_CA);
  const url = new URL(config.connectionString);
  for (const p of ["ssl", "sslmode", "uselibpqcompat", "sslrootcert", "sslcert", "sslkey"]) assert.equal(url.searchParams.has(p), false, p);
  assert.equal(url.hostname, "aws-1-eu-west-1.pooler.supabase.com");
  assert.equal(url.port, "6543");
});

test("Supabase: the encoded password and other parameters survive", () => {
  const config = pgConfig(`${POOLER}?sslmode=no-verify&application_name=clerikaa`);
  assert.equal(decodeURIComponent(new URL(config.connectionString).password), "p@ss#w/rd?");
  assert.equal(new URL(config.connectionString).searchParams.get("application_name"), "clerikaa");
  assert.ok(config.connectionString.startsWith("postgresql://postgres.abcdefghijklmnopqrst:p%40ss%23w%2Frd%3F@"));
});

test("Supabase without TLS settings in the address still gets the check", () => {
  assert.equal(pgConfig(POOLER).ssl?.ca, SUPABASE_ROOT_CA);
  assert.equal(pgConfig(POOLER.replace(".supabase.com", ".supabase.co")).ssl?.ca, SUPABASE_ROOT_CA);
});

test("other hosts are left exactly as their address says", () => {
  for (const address of [
    "postgresql://postgres@localhost:5433/lebourgeois_dev",
    "postgres://user:secret@db.prisma.io:5432/postgres?sslmode=require",
    "postgresql://u:p@supabase.com.evil.example:5432/db?sslmode=require",
    "not a url",
  ]) {
    assert.deepEqual(pgConfig(address), { connectionString: address });
  }
});
