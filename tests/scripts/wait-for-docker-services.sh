#!/usr/bin/env bash
# set -x

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <Mina Daemon GraphQL port>"
  exit 1
fi

START=$(date +%s)
CURRENT_DIR="$(pwd)"

MINA_DAEMON_GRAPHQL_PORT=${1}
MINA_DAEMON_GRAPHQL_URL="http://localhost:${MINA_DAEMON_GRAPHQL_PORT}/graphql"
QUERY='{"query": "{ syncStatus }"}'
MAX_ATTEMPTS=60
SLEEP_DURATION=10
attempt=1
synced=false

while ! nc -z localhost ${MINA_DAEMON_GRAPHQL_PORT}; do
  sleep 1
done

echo ""
echo "Mina Daemon GraphQL port is ready."
echo "Waiting for network to sync..."
echo ""

while [ $attempt -le $MAX_ATTEMPTS ] && [ "$synced" = false ]; do
  response=$(curl -s -X POST -H "Content-Type: application/json" -d "$QUERY" "$MINA_DAEMON_GRAPHQL_URL")

  if [[ -z "$response" ]]; then
    echo "Empty response received. Retrying in $SLEEP_DURATION seconds..."
    sleep $SLEEP_DURATION
  elif [[ $response == *"\"syncStatus\":\"SYNCED\""* ]]; then
    synced=true
    echo "Network is synced."
  else
    echo "Network is not synced. Retrying in $SLEEP_DURATION seconds..."
    sleep $SLEEP_DURATION
  fi

  attempt=$((attempt + 1))
done

if [ "$synced" = false ]; then
  echo ""
  echo "Maximum number of attempts reached. Network is not synced."
else
  echo ""
  echo "Network is ready to use."
fi

END=$(date +%s)
cd ${CURRENT_DIR}
RUNTIME=$(($(date +%s) - START))

echo ""
echo "[INFO] Done. Runtime: ${RUNTIME} seconds"
echo ""
