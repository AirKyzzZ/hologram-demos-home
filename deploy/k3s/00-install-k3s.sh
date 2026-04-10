#!/usr/bin/env bash
# Install k3s (lightweight Kubernetes) on the home server.
# Idempotent — safe to re-run. Writes kubeconfig to /etc/rancher/k3s/k3s.yaml.
set -euo pipefail

if command -v k3s >/dev/null 2>&1; then
  echo "k3s already installed: $(k3s --version | head -1)"
else
  echo "Installing k3s…"
  # --disable traefik: we install ingress-nginx ourselves in step 01.
  # --write-kubeconfig-mode 644: lets non-root read kubeconfig for tooling.
  curl -sfL https://get.k3s.io | \
    INSTALL_K3S_EXEC="--disable traefik --write-kubeconfig-mode 644" \
    sh -
fi

echo
echo "Waiting for node to report Ready…"
for _ in $(seq 1 30); do
  if k3s kubectl get nodes 2>/dev/null | grep -q " Ready "; then
    k3s kubectl get nodes
    echo
    echo "k3s is ready."
    exit 0
  fi
  sleep 2
done

echo "Timed out waiting for k3s node to become Ready." >&2
k3s kubectl get nodes || true
exit 1
