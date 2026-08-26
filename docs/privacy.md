# Privacy — Code Relay

## Threat model

Code Relay is a peer-to-peer shared-room relay, not a one-to-one private messenger or secret vault. Any data shared via Yjs (the CRDT) or awareness is **visible to every other peer in the same room**. Treat the contents of a mesh room as semi-public among the people you share the room ID with.

The app asks every live participant to remove a code from the shared Yjs array after 90 seconds. That limits the room's active state; it cannot retract a code that another person copied, photographed, inspected in developer tools, or otherwise retained.

### What other peers can see

- Active Code Relay entries: code digits, optional label, timestamp, and transient peer ID. Every room participant can read these while the entry is active.
- Per-peer awareness state: ephemeral presence info (cursor, mood, ms-precision clock pings) for the duration of the connection.
- Your peer ID, a transient WebRTC client ID. Not tied to a user account.

### What the self-hosted infra can see

- The signaling server (`wss://turn.0docker.com/ws`) sees connection metadata: IP address, room ID hash, time of connection. It does **not** see message contents carried over the WebRTC data channel.
- The TURN relay (`turn:turn.0docker.com:3479`) is only used when direct peer connection fails (strict NATs). When relayed, traffic flows through the TURN box but remains end-to-end encrypted (DTLS-SRTP).

### What stays local

- Settings: signaling/TURN overrides, room ID — all in localStorage.
- Nothing is persisted server-side by Code Relay. When all peers leave the room, its in-memory CRDT state evaporates.

## No accounts, no analytics

No login. No tracking pixels. No third-party analytics. No service worker error beacons.

## If you want stronger anonymity

This app does not use Semaphore-style commit-reveal for anonymity within the mesh. If anonymity matters for your use case, see the `mesh-mafia` reference app for the commit-reveal pattern.
