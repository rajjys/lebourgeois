-- Price and note actions in the route workspace become batches, so "Défaire" can revert them (RW-4).
-- Several enum values in one migration needs PostgreSQL 12 or later (production and local both are).
ALTER TYPE "BatchAction" ADD VALUE 'FARE_ADD';
ALTER TYPE "BatchAction" ADD VALUE 'FARE_REVIEW';
ALTER TYPE "BatchAction" ADD VALUE 'FARE_DELETE';
ALTER TYPE "BatchAction" ADD VALUE 'NOTE_EDIT';
