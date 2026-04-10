#!/usr/bin/env bash
# Install cert-manager so Let's Encrypt certificates are auto-provisioned
# and renewed for the bots' ingress hosts. Idempotent.
set -euo pipefail

export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

echo "Adding jetstack helm repo…"
helm repo add jetstack https://charts.jetstack.io >/dev/null 2>&1 || true
helm repo update jetstack >/dev/null

echo "Installing cert-manager (with CRDs)…"
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true

echo
echo "Waiting for cert-manager to be ready…"
k3s kubectl -n cert-manager rollout status deployment/cert-manager --timeout=120s
k3s kubectl -n cert-manager rollout status deployment/cert-manager-webhook --timeout=120s
k3s kubectl -n cert-manager rollout status deployment/cert-manager-cainjector --timeout=120s

echo
echo "Applying ClusterIssuer (03-cluster-issuer.yaml)…"
if [[ -z "${LETSENCRYPT_EMAIL:-}" ]]; then
  echo "LETSENCRYPT_EMAIL is not set — export it before running this script." >&2
  echo "Example:  LETSENCRYPT_EMAIL=you@example.com $0" >&2
  exit 1
fi

# Render the email into the cluster issuer template on the fly.
sed "s#__LETSENCRYPT_EMAIL__#${LETSENCRYPT_EMAIL}#g" \
  "$(dirname "$0")/03-cluster-issuer.yaml" | k3s kubectl apply -f -

echo "Done."
