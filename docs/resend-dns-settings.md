DNS records for domain verification of clerikaa.com on Resend

Add the following DNS records at your domain provider for clerikaa.com:

DKIM
  Type: TXT
  Name: resend._domainkey
  Value: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDlnWiPOxZnYcNQUD/mFFPmdXvK+g0ZdRe4X8spcfzv89RUfgZinjw74H+hdKlHA+9YU64LxV7gy3stgSakjBEyVDtaU6kIRyZXPHPIuoGYDOi8maR2DuW3MyoNcL66stEUaLmuL2WqnZquCLNHNxGMvUAL087MnCdaYUfcDVVIkQIDAQAB
  TTL: Auto

SPF
  Type: CNAME
  Name: rsend
  Value: rsend-euw1.forge.rmta.net
  TTL: Auto

  Type: CNAME
  Name: send
  Value: send.forge.rmta.net
  TTL: Auto

DMARC (recommended)
  Type: TXT
  Name: _dmarc
  Value: v=DMARC1; p=none;
  TTL: Auto

After adding these records, return to Resend to verify.
Docs: https://resend.com/docs/dashboard/domains/introduction