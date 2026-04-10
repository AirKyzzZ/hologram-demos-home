# Deploy runbook

Bootstrap a fresh home server to run hologram VS agents 24/7.

## Phase 0 — prerequisites

- **SSH access:** `ssh home-server` must already work.
- **OS:** tested on Debian 12 / Ubuntu 22.04+. Other distros should work but aren't covered here.
- **Open ports:** your router must forward `80/tcp` and `443/tcp` to the home server so Let's Encrypt HTTP-01 challenges succeed.
- **Public DNS:** a domain pointing at your home server's public IP. A wildcard record (`*.home.yourdomain.tld`) is strongly preferred so each bot only needs two hosts (`<bot>.home.yourdomain.tld` and `dm.<bot>.home.yourdomain.tld`) without creating them manually.
- **Email:** a real email address for Let's Encrypt account registration.
- **Docker Hub / GHCR:** account + token for publishing your bot images in the `cd.yml` workflow.

## Phase 1 — cluster bootstrap

```bash
ssh home-server
git clone https://github.com/AirKyzzZ/hologram-demos-home.git
cd hologram-demos-home/deploy/k3s

# 1. install k3s (installs curl/helm deps, no traefik, writable kubeconfig)
sudo ./00-install-k3s.sh
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

# 2. install nginx ingress controller
./01-install-ingress-nginx.sh

# 3. install cert-manager + create letsencrypt ClusterIssuers
LETSENCRYPT_EMAIL=you@example.com ./02-install-cert-manager.sh

# 4. create the `holo-demos` namespace
./04-create-namespace.sh

# 5. create the shared secret from your local env file
cp secrets.local.env.example secrets.local.env
# edit secrets.local.env — fill in wallet keys, API keys, Twitter creds
./05-create-secrets.sh
```

Verify:

```bash
kubectl get nodes
kubectl -n cert-manager get clusterissuer
kubectl -n holo-demos get secret demos-secrets
```

## Phase 2 — deploy the Twitter bot (smoke test)

This is the first real deploy. It proves the whole stack works end-to-end before you spend time writing new bots.

```bash
# From the repo root on the home server:
cd ~/hologram-demos-home

# Edit the host in deploy/charts/twitter-bot-values.yaml to match your domain:
#   global.domain: home.yourdomain.tld
#   chatbot.ingress.host: twitter.home.yourdomain.tld
#   vs-agent-chart.ingress.host: dm.twitter.home.yourdomain.tld

helm upgrade --install twitter-bot \
  oci://registry-1.docker.io/airkyzzz/hologram-generic-ai-agent-chart \
  --version 1.3.2 \
  -f deploy/charts/twitter-bot-values.yaml \
  -n holo-demos

# Watch pods come up
kubectl -n holo-demos get pods -w

# Watch certificate get issued (should reach READY=True within ~60s)
kubectl -n holo-demos get certificate -w

# Tail logs if anything looks off
kubectl -n holo-demos logs -l app.kubernetes.io/name=twitter-bot -f
```

## Phase 3 — verify 24/7 availability

1. **HTTPS loads:** `curl -I https://twitter.home.yourdomain.tld/health` returns 200.
2. **Certificate valid:** browsers show a valid Let's Encrypt cert.
3. **DIDComm endpoint:** `curl -I https://dm.twitter.home.yourdomain.tld/` returns a response.
4. **QR code flow:** open the Hologram app → scan the invitation QR at the chatbot URL → connection established → send "ping" → receive "pong".
5. **Self-healing:** `kubectl delete pod -l app.kubernetes.io/name=twitter-bot` — pod should come back Ready within ~30s.
6. **Certificate auto-renewal:** cert-manager handles it automatically; the cert renews ~30 days before expiry without intervention.

## Phase 4 — adding more bots

See [`../docs/ADDING_A_BOT.md`](../docs/ADDING_A_BOT.md). Short version:

```bash
cp -r apps/_template-vs apps/my-bot-vs
# edit source, package.json, agent-packs/
cp deploy/charts/twitter-bot-values.yaml deploy/charts/my-bot-values.yaml
# edit name, image, ingress host
# build + push Docker image (see .github/workflows/cd.yml)
helm upgrade --install my-bot <chart-source> \
  -f deploy/charts/my-bot-values.yaml \
  -n holo-demos
```

## Troubleshooting

| Symptom | Check |
|---|---|
| Pod stuck in `CrashLoopBackOff` | `kubectl logs <pod>` — usually a missing secret or wrong env var |
| Certificate stuck `READY=False` | `kubectl describe certificate …` — usually DNS not pointing at your IP or port 80 blocked |
| `502 Bad Gateway` at the ingress | Bot pod not Ready yet, or `APP_PORT` mismatch between values.yaml and service |
| Hologram app can't connect | `dm.*` ingress missing or cert not valid — check both hosts are resolvable and TLS is green |
| Hung under load | Increase `chatbot.resources.limits.memory` in values; check `kubectl top pod` |

## Operating 24/7

- **Backups:** the Postgres PVC holds session and post history. Back it up with `kubectl exec … -- pg_dumpall > backup.sql` on a schedule.
- **Updates:** when the upstream twitter bot image is bumped, update `image.tag` in `twitter-bot-values.yaml` and run the `helm upgrade` command again. Rolling update is automatic.
- **Monitoring:** minimum viable — `kubectl top pods -n holo-demos` in a cron loop, alert if a pod is not Ready. For a real setup, install Prometheus + Alertmanager later.
- **Router:** keep UPnP off. Keep port-forwards scoped to exactly 80/443. Nothing else should be exposed from the home server.
