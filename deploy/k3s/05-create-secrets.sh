#!/usr/bin/env bash
# Create the `demos-secrets` Kubernetes secret from a local env file.
# Idempotent — re-running replaces the secret.
#
# Usage:
#   cp secrets.local.env.example secrets.local.env
#   edit secrets.local.env with real values (NEVER commit this file)
#   ./05-create-secrets.sh
set -euo pipefail

export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"
NAMESPACE="${NAMESPACE:-holo-demos}"
SECRET_NAME="${SECRET_NAME:-demos-secrets}"
ENV_FILE="${ENV_FILE:-$(dirname "$0")/secrets.local.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file $ENV_FILE not found." >&2
  echo "Copy secrets.local.env.example to secrets.local.env and fill it in." >&2
  exit 1
fi

echo "Creating/updating secret $SECRET_NAME in namespace $NAMESPACE from $ENV_FILE…"
k3s kubectl -n "$NAMESPACE" create secret generic "$SECRET_NAME" \
  --from-env-file="$ENV_FILE" \
  --dry-run=client -o yaml | k3s kubectl apply -f -

echo "Secret ready:"
k3s kubectl -n "$NAMESPACE" get secret "$SECRET_NAME"
