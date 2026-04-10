#!/usr/bin/env bash
# Create the `holo-demos` namespace if it doesn't exist.
set -euo pipefail

export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"
NAMESPACE="${NAMESPACE:-holo-demos}"

if k3s kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
  echo "Namespace $NAMESPACE already exists."
else
  k3s kubectl create namespace "$NAMESPACE"
  echo "Namespace $NAMESPACE created."
fi
