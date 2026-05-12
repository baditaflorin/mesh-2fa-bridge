# mesh-2fa-bridge

[![pages](https://img.shields.io/badge/live-baditaflorin.github.io%2Fmesh-2fa-bridge-ffb74a)](https://baditaflorin.github.io/mesh-2fa-bridge/)
[![version](https://img.shields.io/badge/version-0.1.0-blue)](https://github.com/baditaflorin/mesh-2fa-bridge/blob/main/package.json)
[![license](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

> Type a 2FA code on your phone, copy it on your laptop in one click — your devices only

Live: **https://baditaflorin.github.io/mesh-2fa-bridge/**

Source: **https://github.com/baditaflorin/mesh-2fa-bridge**

Tip the dev: **https://www.paypal.com/paypalme/florinbadita**

---

## What it is

Peer-to-peer browser app, no backend of its own beyond the self-hosted WebRTC stack listed below. Built on `@baditaflorin/mesh-common`, hosted on GitHub Pages from `docs/`.

## Quickstart (local)

```bash
git clone https://github.com/baditaflorin/mesh-common
git clone https://github.com/baditaflorin/mesh-2fa-bridge
cd mesh-2fa-bridge
npm install
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

## License

MIT — see `LICENSE`.
