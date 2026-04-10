#!/usr/bin/env bash
# Install nginx ingress controller into the k3s cluster.
# Idempotent — helm upgrade --install.
set -euo pipefail

export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

if ! command -v helm >/dev/null 2>&1; then
  echo "helm not found — installing…"
  curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
fi

echo "Adding ingress-nginx helm repo…"
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx >/dev/null 2>&1 || true
helm repo update ingress-nginx >/dev/null

echo "Installing ingress-nginx…"
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer \
  --set controller.publishService.enabled=true \
  --set controller.metrics.enabled=false

echo
echo "Waiting for ingress-nginx controller pod…"
k3s kubectl -n ingress-nginx rollout status deployment/ingress-nginx-controller --timeout=120s
k3s kubectl -n ingress-nginx get svc ingress-nginx-controller
