#!/usr/bin/env bash
set -euo pipefail

if [[ "${RUN_DATABASE_MIGRATIONS:-false}" != "true" ]]; then
  echo "Database migrations are disabled; skipping."
  exit 0
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "PostgreSQL client is unavailable in the runtime image." >&2
  exit 69
fi

resolve_database_url() {
  if [[ -n "${DATABASE_URL:-}" ]]; then
    printf '%s' "${DATABASE_URL}"
    return 0
  fi

  if [[ -n "${SUPABASE_DB_PASSWORD:-}" && -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ]]; then
    node --input-type=module -e '
      const publicUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
      const projectRef = publicUrl.hostname.split(".")[0];
      const password = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);
      process.stdout.write(`postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`);
    '
    return 0
  fi

  return 1
}

if ! database_url="$(resolve_database_url)"; then
  echo "RUN_DATABASE_MIGRATIONS=true requires DATABASE_URL or SUPABASE_DB_PASSWORD." >&2
  exit 64
fi

export PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-20}"
export PGAPPNAME="${PGAPPNAME:-moataz-ai-railway-migrations}"

psql "${database_url}" -X -q -v ON_ERROR_STOP=1 <<'SQL'
create table if not exists public.app_schema_migrations (
  version text primary key,
  checksum text not null,
  applied_at timestamptz not null default now()
);
revoke all on table public.app_schema_migrations from anon, authenticated;
SQL

shopt -s nullglob
migration_files=(supabase/migrations/*.sql)

if (( ${#migration_files[@]} == 0 )); then
  echo "No Supabase migrations were found."
  exit 0
fi

for migration_file in "${migration_files[@]}"; do
  version="$(basename "${migration_file}" .sql)"
  checksum="$(sha256sum "${migration_file}" | awk '{print $1}')"

  existing_checksum="$(
    psql "${database_url}" -X -qAt -v ON_ERROR_STOP=1 \
      -v version="${version}" \
      -c "select checksum from public.app_schema_migrations where version = :'version';"
  )"

  if [[ -n "${existing_checksum}" ]]; then
    if [[ "${existing_checksum}" != "${checksum}" ]]; then
      echo "Migration ${version} was already applied with a different checksum." >&2
      exit 65
    fi
    echo "Migration ${version} already applied."
    continue
  fi

  echo "Applying migration ${version}..."
  psql "${database_url}" -X -q -v ON_ERROR_STOP=1 -f "${migration_file}"
  psql "${database_url}" -X -q -v ON_ERROR_STOP=1 \
    -v version="${version}" \
    -v checksum="${checksum}" <<'SQL'
insert into public.app_schema_migrations(version, checksum)
values (:'version', :'checksum');
SQL
  echo "Migration ${version} applied."
done

echo "Database migrations completed successfully."
