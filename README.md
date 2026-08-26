# Code Relay

[![pages](https://img.shields.io/badge/live-baditaflorin.github.io%2Fmesh-2fa-bridge-ffb74a)](https://baditaflorin.github.io/mesh-2fa-bridge/)
[![version](https://img.shields.io/badge/version-0.1.1-blue)](https://github.com/baditaflorin/mesh-2fa-bridge/blob/main/package.json)
[![license](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

> A short-lived one-time-code handoff for people already in the same shared room.

Live: **https://baditaflorin.github.io/mesh-2fa-bridge/**

Source: **https://github.com/baditaflorin/mesh-2fa-bridge**

Tip the dev: **https://www.paypal.com/paypalme/florinbadita**

---

## What it is

Code Relay is a peer-to-peer browser companion for moving a one-time code between devices already joined to the same room. It has no app backend of its own beyond the self-hosted WebRTC stack listed below, is built on `@baditaflorin/mesh-common`, and is hosted on GitHub Pages from `docs/`.

It is deliberately **not** a private vault or direct-message channel. A sent code is replicated into the shared room and can be viewed by every room participant. Connected peers prune it from the shared Yjs array after 90 seconds, but the app cannot retract a code someone has copied, photographed, or inspected. Use a room you control and never send passwords, recovery codes, or long-lived secrets.

## Quickstart (local)

```bash
git clone https://github.com/baditaflorin/mesh-common
git clone https://github.com/baditaflorin/mesh-2fa-bridge
cd mesh-2fa-bridge
npm ci
npm run dev
```

`mesh-common` must sit as a **sibling** directory because `package.json` references it via `file:../mesh-common`.

## Self-hosted infrastructure

| Repo                                              | Endpoint                               | Purpose                     |
| ------------------------------------------------- | -------------------------------------- | --------------------------- |
| https://github.com/baditaflorin/signaling-server  | `wss://turn.0docker.com/ws`            | y-webrtc signaling fan-out  |
| https://github.com/baditaflorin/turn-token-server | `https://turn.0docker.com/credentials` | HMAC TURN creds, 1-hour TTL |
| https://github.com/baditaflorin/coturn-hetzner    | `turn:turn.0docker.com:3479`           | TURN relay                  |

## Settings overrides (localStorage keys)

The settings drawer lets the user override signaling and TURN endpoints. Keys:

- `mesh-2fa-bridge:signalingUrl`
- `mesh-2fa-bridge:turnTokenUrl`
- `mesh-2fa-bridge:iceServers`
- `mesh-2fa-bridge:room`

If endpoints are blank or unreachable, the app falls back to STUN-only.

## Build & deploy

GitHub Pages serves the committed `docs/` directory on the `main` branch. There is **no GitHub Actions build workflow**; the Husky pre-commit + pre-push hooks gate formatting / typecheck / smoke build locally.

```bash
npm run smoke   # build + sanity-check docs/
```

## Privacy

See `docs/privacy.md` for the threat model — what other peers in the mesh see, what the self-hosted infra sees, what stays local.

## Verification

```bash
npm run fmt:check
npm run typecheck
npm run smoke
npm run test:e2e
MESH_LEAK_DURATION_MS=5000 MESH_LEAK_NOISE_OPS=24 npm run test:leak
npm run audit:security
```

`npm run audit:security` writes a machine-readable `docs/security-audit.json` and a readable `docs/security-audit.md` for the published app.

## License

MIT — see `LICENSE`.
