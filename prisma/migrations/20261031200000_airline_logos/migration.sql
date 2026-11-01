-- Airline logos served by the site (owner, 2026-10-31: "use logos"). Data only.
-- Replaces empty values and links to the old image host (graphassets.com, left from an earlier
-- version of the app); a logo chosen in the back office since is kept.
UPDATE "Airline" SET "logo" = '/logos/airlines/caa.svg'
WHERE "code" = 'BU' AND ("logo" IS NULL OR "logo" = '' OR "logo" LIKE '%graphassets.com%');

UPDATE "Airline" SET "logo" = '/logos/airlines/air-congo.jpg'
WHERE "code" = '4H' AND ("logo" IS NULL OR "logo" = '' OR "logo" LIKE '%graphassets.com%');
