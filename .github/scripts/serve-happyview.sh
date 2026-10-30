#!/bin/sh
# Boots the HappyView a project pins, on SQLite, as an instance to deploy to,
# and seeds one API key holding only the given permissions.
#
# Usage: serve-happyview.sh PROJECT_DIR STATE_DIR PERMISSIONS_JSON
#
# The binary is the one `hpy happyview check` downloaded into HPY_CACHE_DIR.
# The key is written to STATE_DIR/key; on GitHub Actions it is also masked.
# The instance listens on 127.0.0.1:${HAPPYVIEW_PORT:-3999} and reaches no
# relay or Jetstream.
set -eu

project=$1
state=$2
permissions=$3
port=${HAPPYVIEW_PORT:-3999}
url="http://127.0.0.1:$port"

version=$(sed -n '/^\[happyview\]/,/^\[/s/^version = "\(.*\)"$/\1/p' "$project/happyview.lock" | head -n 1)
binary="$HPY_CACHE_DIR/happyview/$version/happyview"
if [ ! -x "$binary" ]; then
  echo "no HappyView $version at $binary; run hpy happyview check first" >&2
  exit 1
fi
superadmin=$(sed -n 's/^superadmin = "\(.*\)"$/\1/p' "$project/happyview.toml")

mkdir -p "$state"
DATABASE_URL="sqlite://$state/happyview.db?mode=rwc" \
  PUBLIC_URL="$url" HOST=127.0.0.1 PORT="$port" \
  SUPERADMIN_DID="$superadmin" \
  PLUGIN_DIR="$state/plugins" PLUGIN_CACHE_DIR="$state/plugin-cache" \
  JETSTREAM_URL=ws://127.0.0.1:9 RELAY_URL=http://127.0.0.1:9 \
  "$binary" > "$state/happyview.log" 2>&1 &
echo $! > "$state/pid"

i=0
until curl -fsS "$url/health" > /dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -ge 60 ]; then
    tail -n 50 "$state/happyview.log" >&2
    exit 1
  fi
  sleep 1
done

# HappyView stores a key as the SHA-256 of its text and bounds it by its own
# permission list, even when its user is a superadmin.
key="hv_$(head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n')"
if command -v sha256sum > /dev/null; then
  hash=$(printf %s "$key" | sha256sum | cut -d' ' -f1)
else
  hash=$(printf %s "$key" | shasum -a 256 | cut -d' ' -f1)
fi
sqlite3 "$state/happyview.db" "INSERT INTO happyview_api_keys
  (id, user_id, name, key_hash, key_prefix, permissions, created_at)
  SELECT 'ci', id, 'ci', '$hash', '$(printf %s "$key" | cut -c1-11)', '$permissions',
         strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
  FROM happyview_users WHERE did = '$superadmin'"
if [ "$(sqlite3 "$state/happyview.db" "SELECT count(*) FROM happyview_api_keys")" != 1 ]; then
  echo "could not seed the API key: no user $superadmin" >&2
  exit 1
fi

if [ -n "${GITHUB_ACTIONS:-}" ]; then
  echo "::add-mask::$key"
fi
printf %s "$key" > "$state/key"
echo "HappyView $version at $url"
