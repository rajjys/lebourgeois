#!/usr/bin/env bash
# O-13: copy the production database to another Postgres, then compare every table.
#
#   scripts/move-database.sh             preview: checks both databases, writes nothing
#   scripts/move-database.sh --apply     dump the source, restore it into the (empty) target, compare
#   scripts/move-database.sh --compare   row counts of every table on both sides, nothing else
#
# Addresses come from .env (or $ENV_FILE) and are never printed (only their host):
#   --from=VAR   the source, default DATABASE_URL (Prisma Postgres until the move)
#   --to=VAR     the target, default SUPABASE_SESSION_URL (a session connection: port 5432)
#
# The dump is kept in ~/.lebourgeois/backups. The restore is one transaction: it lands whole or not
# at all. It refuses a target that already has tables. Prisma Postgres' own extension and the
# `public` schema itself are skipped (the target has its own). On Supabase, the tables are then
# closed to its public API roles (anon, authenticated) and get row-level security with no policy:
# only the owner, the role the app connects as, reads and writes them.
set -euo pipefail
cd "$(dirname "$0")/.."

MODE=preview FROM=DATABASE_URL TO=SUPABASE_SESSION_URL
for arg in "$@"; do
  case "$arg" in
    --apply) MODE=apply ;;
    --compare) MODE=compare ;;
    --from=*) FROM="${arg#--from=}" ;;
    --to=*) TO="${arg#--to=}" ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

val() { grep -E "^$1=" "${ENV_FILE:-.env}" | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"; }
host() { sed -E 's#^[a-z+]+://([^@]*@)?##; s#[:/?].*##' <<<"$1"; }
SRC="$(val "$FROM")"
DST="$(val "$TO")"
[[ -n "$SRC" ]] || { echo "$FROM is not set in .env" >&2; exit 1; }
[[ -n "$DST" ]] || { echo "$TO is not set in .env" >&2; exit 1; }
[[ "$SRC" != "$DST" ]] || { echo "$FROM and $TO are the same address" >&2; exit 1; }
for tool in pg_dump pg_restore psql; do command -v "$tool" >/dev/null || { echo "$tool not found" >&2; exit 1; }; done

q() { psql "$1" -XqAt -v ON_ERROR_STOP=1 -c "$2"; }

# Every table's row count in one statement (Prisma Postgres bills per statement).
COUNTS="select table_name || '|' || (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text
        from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1"

compare() {
  local a b
  a="$(q "$SRC" "$COUNTS")"
  b="$(q "$DST" "$COUNTS")"
  echo
  printf '%-22s %10s %10s\n' table source target
  local bad=0
  while IFS='|' read -r t n; do
    m="$(grep -E "^$t\|" <<<"$b" | cut -d'|' -f2 || true)"
    flag=""; [[ "$n" == "$m" ]] || { flag="  <- differs"; bad=1; }
    printf '%-22s %10s %10s%s\n' "$t" "$n" "${m:-missing}" "$flag"
  done <<<"$a"
  echo
  if [[ $bad -eq 0 ]]; then echo "Every table matches."; else echo "Some tables differ." >&2; return 1; fi
}

echo "Source ($FROM): $(host "$SRC"), $(q "$SRC" "show server_version")"
echo "Target ($TO): $(host "$DST"), $(q "$DST" "show server_version")"
TARGET_TABLES="$(q "$DST" "select count(*) from pg_tables where schemaname = 'public'")"
echo "Tables already in the target's public schema: $TARGET_TABLES"

if [[ $MODE == compare ]]; then compare; exit $?; fi

if [[ $MODE == preview ]]; then
  echo
  echo "Preview only. With --apply: dump the source to ~/.lebourgeois/backups, restore into the target in one"
  echo "transaction, close the tables to Supabase's API roles, then compare every table's row count."
  [[ "$TARGET_TABLES" == 0 ]] || echo "The target is not empty: --apply would refuse." >&2
  exit 0
fi

[[ "$TARGET_TABLES" == 0 ]] || { echo "The target already has tables in public; refusing to restore over them." >&2; exit 1; }

mkdir -p ~/.lebourgeois/backups
STAMP="$(date +%Y%m%d-%H%M%S)"
DUMP=~/.lebourgeois/backups/move-$STAMP.dump
LIST="$(mktemp)"
trap 'rm -f "$LIST"' EXIT

echo
echo "Dumping the source to $DUMP"
pg_dump "$SRC" -Fc --no-owner --no-privileges -f "$DUMP"
# Skip the provider's own objects: the public schema (exists on the target) and Prisma Postgres' extension.
pg_restore --list "$DUMP" | grep -vE " SCHEMA - public | EXTENSION - | COMMENT - (SCHEMA public|EXTENSION) " >"$LIST"
echo "Restoring $(grep -c "TABLE DATA" "$LIST") tables into the target"
pg_restore -d "$DST" --no-owner --no-privileges --single-transaction --exit-on-error -L "$LIST" "$DUMP"

# The app must own the tables, or row-level security would hide them from it.
OWNERS="$(q "$DST" "select string_agg(distinct tableowner, ',') from pg_tables where schemaname = 'public'")"
ME="$(q "$DST" "select current_user")"
[[ "$OWNERS" == "$ME" ]] || { echo "Tables are owned by '$OWNERS', not '$ME'. Stopping before locking them." >&2; exit 1; }

if [[ "$(q "$DST" "select count(*) from pg_roles where rolname in ('anon', 'authenticated')")" == 2 ]]; then
  echo "Supabase: closing the tables to the anon and authenticated roles"
  psql "$DST" -Xq -v ON_ERROR_STOP=1 <<'SQL'
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
SQL
fi

compare
echo "Backup kept: $DUMP"
