/**
 * How every database client connects (O-15): the app (lib/prisma.ts), the scripts and the seed.
 *
 * Supabase signs its servers with its own certificate authority, which Node does not trust, so
 * `sslmode=require` fails and the address carries `uselibpqcompat=true&sslmode=require`:
 * encrypted, but any certificate accepted. For a Supabase host, `pgConfig` removes the address's
 * TLS settings (node-postgres lets them override explicit ones) and trusts Supabase's root only,
 * with the host name checked: a server without a certificate from Supabase's chain for that name
 * is refused. Other hosts (the local database) are left exactly as their address says.
 *
 * Not covered: `prisma migrate` on Vercel builds. The Prisma 7 CLI connected with a wrong
 * certificate given as `sslcert`, `sslrootcert` or `sslmode=verify-full` (tested 2026-11-19),
 * so that connection stays encrypted but unchecked.
 */

/**
 * "Supabase Root 2021 CA", self-signed, valid until 2031-04-26.
 * SHA-256 80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA
 * Taken from the chain the pooler presented on 2026-11-19 (pooler certificate *.pooler.supabase.com,
 * issued by "Supabase Intermediate 2021 CA"). Supabase's dashboard offers the same file under
 * Project Settings > Database > SSL Configuration; its fingerprint must match the one above.
 */
export const SUPABASE_ROOT_CA = `-----BEGIN CERTIFICATE-----
MIIDxDCCAqygAwIBAgIUbLxMod62P2ktCiAkxnKJwtE9VPYwDQYJKoZIhvcNAQEL
BQAwazELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5l
dyBDYXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJh
c2UgUm9vdCAyMDIxIENBMB4XDTIxMDQyODEwNTY1M1oXDTMxMDQyNjEwNTY1M1ow
azELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5ldyBD
YXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJhc2Ug
Um9vdCAyMDIxIENBMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqQXW
QyHOB+qR2GJobCq/CBmQ40G0oDmCC3mzVnn8sv4XNeWtE5XcEL0uVih7Jo4Dkx1Q
DmGHBH1zDfgs2qXiLb6xpw/CKQPypZW1JssOTMIfQppNQ87K75Ya0p25Y3ePS2t2
GtvHxNjUV6kjOZjEn2yWEcBdpOVCUYBVFBNMB4YBHkNRDa/+S4uywAoaTWnCJLUi
cvTlHmMw6xSQQn1UfRQHk50DMCEJ7Cy1RxrZJrkXXRP3LqQL2ijJ6F4yMfh+Gyb4
O4XajoVj/+R4GwywKYrrS8PrSNtwxr5StlQO8zIQUSMiq26wM8mgELFlS/32Uclt
NaQ1xBRizkzpZct9DwIDAQABo2AwXjALBgNVHQ8EBAMCAQYwHQYDVR0OBBYEFKjX
uXY32CztkhImng4yJNUtaUYsMB8GA1UdIwQYMBaAFKjXuXY32CztkhImng4yJNUt
aUYsMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAB8spzNn+4VU
tVxbdMaX+39Z50sc7uATmus16jmmHjhIHz+l/9GlJ5KqAMOx26mPZgfzG7oneL2b
VW+WgYUkTT3XEPFWnTp2RJwQao8/tYPXWEJDc0WVQHrpmnWOFKU/d3MqBgBm5y+6
jB81TU/RG2rVerPDWP+1MMcNNy0491CTL5XQZ7JfDJJ9CCmXSdtTl4uUQnSuv/Qx
Cea13BX2ZgJc7Au30vihLhub52De4P/4gonKsNHYdbWjg7OWKwNv/zitGDVDB9Y2
CMTyZKG3XEu5Ghl1LEnI3QmEKsqaCLv12BnVjbkSeZsMnevJPs1Ye6TjjJwdik5P
o/bKiIz+Fq8=
-----END CERTIFICATE-----
`;

const SUPABASE_HOST = /\.supabase\.(com|co)$/i;
/** node-postgres reads these from the address and lets them override the explicit `ssl` option. */
const ADDRESS_TLS_PARAMS = ["ssl", "sslmode", "uselibpqcompat", "sslrootcert", "sslcert", "sslkey"];

export type PgConfig = { connectionString: string; ssl?: { ca: string } };

/** The node-postgres settings for a database address. */
export function pgConfig(connectionString: string): PgConfig {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    return { connectionString };
  }
  if (!SUPABASE_HOST.test(url.hostname)) return { connectionString };
  for (const param of ADDRESS_TLS_PARAMS) url.searchParams.delete(param);
  return { connectionString: url.toString(), ssl: { ca: SUPABASE_ROOT_CA } };
}
