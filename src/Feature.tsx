import { useEffect, useMemo, useState } from "react";
import {
  MeshLiveRegion,
  type MeshConfig,
  type YRoom,
  useClipboard,
} from "@baditaflorin/mesh-common";

type Props = { room: YRoom | null; config: MeshConfig };

type Code = {
  id: string;
  digits: string;
  label?: string;
  fromPeer: string;
  ts: number;
};

const TTL_MS = 90_000;

function normalizeCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

function formatCode(value: string) {
  return normalizeCode(value).replace(/(\d{3})(?=\d)/g, "$1 ");
}

function shortPeerId(id: string) {
  return id.slice(0, 6);
}

function remainingSeconds(code: Code) {
  return Math.max(0, Math.ceil((TTL_MS - (Date.now() - code.ts)) / 1000));
}

function sourceLabel(code: Code, peerId: string) {
  return code.fromPeer === peerId
    ? "Sent from this device"
    : `Received from device ${shortPeerId(code.fromPeer)}`;
}

export function Feature({ room, config }: Props) {
  const [draft, setDraft] = useState("");
  const [label, setLabel] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [version, rerender] = useState(0);
  const clipboard = useClipboard({ copiedDurationMs: 1_600 });

  // Test-only handle: expose the live Yjs doc so a second browser can make a
  // real shared-room write without adding a production-only transport path.
  useEffect(() => {
    (window as unknown as { __tfaRoom?: typeof room }).__tfaRoom = room;
    return () => {
      delete (window as unknown as { __tfaRoom?: typeof room }).__tfaRoom;
    };
  }, [room]);

  useEffect(() => {
    if (!room) return;
    const codes = room.doc.getArray<Code>("codes");
    const onChange = () => rerender((current) => current + 1);
    codes.observe(onChange);
    rerender((current) => current + 1);
    return () => codes.unobserve(onChange);
  }, [room]);

  // Expiry is a shared state transition, not just a visual filter. Any live
  // participant prunes expired entries, so the room does not retain old codes
  // in its Yjs array once their 90-second window closes.
  useEffect(() => {
    if (!room) return;
    const tick = () => {
      const codesArray = room.doc.getArray<Code>("codes");
      const now = Date.now();
      const staleIndexes = codesArray
        .toArray()
        .map((code, index) => (now - code.ts >= TTL_MS ? index : -1))
        .filter((index) => index >= 0)
        .reverse();
      if (staleIndexes.length > 0) {
        room.doc.transact(() => {
          for (const index of staleIndexes) codesArray.delete(index, 1);
        });
      }
      rerender((current) => current + 1);
    };
    tick();
    const interval = window.setInterval(tick, 1_000);
    return () => window.clearInterval(interval);
  }, [room]);

  const codes = useMemo(() => {
    if (!room) return [] as Code[];
    const now = Date.now();
    return [...room.doc.getArray<Code>("codes").toArray()]
      .filter((code) => now - code.ts < TTL_MS)
      .reverse();
  }, [room, version]);

  const canSend = draft.length >= 4;

  const send = () => {
    if (!room || !canSend) return;
    room.doc.getArray<Code>("codes").push([
      {
        id: crypto.randomUUID(),
        digits: draft,
        label: label.trim() || undefined,
        fromPeer: room.peerId,
        ts: Date.now(),
      },
    ]);
    setDraft("");
    setLabel("");
    setNotice("Code sent to the room. Every participant can view it for up to 90 seconds.");
  };

  const copy = async (code: Code) => {
    const copied = await clipboard.write(code.digits);
    if (copied) {
      setCopiedId(code.id);
      setNotice("Code copied to this device.");
      return;
    }
    setNotice("Copy is unavailable in this browser. Select the code and copy it manually.");
  };

  const clear = () => {
    if (!room) return;
    const codesArray = room.doc.getArray<Code>("codes");
    codesArray.delete(0, codesArray.length);
    setNotice("Current codes were removed from the room.");
  };

  if (!room) {
    return (
      <main className="relay-screen relay-screen--connecting" aria-busy="true">
        <div className="relay-connect-card">
          <span className="relay-kicker">Short-lived room handoff</span>
          <h1>{config.displayName}</h1>
          <p>Preparing this shared room…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relay-screen">
      <MeshLiveRegion message={notice} />
      <section className="relay-hero" aria-labelledby="relay-title">
        <div className="relay-hero-copy">
          <span className="relay-kicker">Short-lived room handoff</span>
          <h1 id="relay-title">{config.displayName}</h1>
          <p>
            Move a one-time code to a device already in this room, then copy it there in one action.
          </p>
        </div>
        <div className="relay-room-state" aria-label="Room-visible handoff">
          <span className="relay-room-state-mark" aria-hidden="true">
            ↗
          </span>
          <span>Room-visible handoff</span>
        </div>
      </section>

      <section className="relay-send-panel" aria-labelledby="send-code-title">
        <div className="relay-panel-heading">
          <div>
            <span className="relay-section-index" aria-hidden="true">
              01
            </span>
            <h2 id="send-code-title">Send a code</h2>
          </div>
          <span className="relay-ttl">Visible for 90 seconds</span>
        </div>

        <form
          className="relay-send-form"
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <label className="relay-code-field" htmlFor="relay-code">
            <span>One-time code</span>
            <input
              id="relay-code"
              className="tfa-digits"
              value={formatCode(draft)}
              onChange={(event) => setDraft(normalizeCode(event.target.value))}
              placeholder="123 456"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
              autoFocus
            />
          </label>
          <label className="relay-label-field" htmlFor="relay-label">
            <span>
              Label <em>(optional)</em>
            </span>
            <input
              id="relay-label"
              className="tfa-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="e.g. email sign-in"
              maxLength={32}
            />
          </label>
          <button className="relay-send-button" type="submit" disabled={!canSend}>
            Send code to room
          </button>
        </form>
        <p className="relay-boundary-note">
          This is a shared room feed: every participant can view a sent code. Use a room you
          control; do not send passwords, recovery codes, or other long-lived secrets.
        </p>
      </section>

      <section className="relay-inbox" aria-labelledby="room-codes-title">
        <div className="relay-panel-heading relay-inbox-heading">
          <div>
            <span className="relay-section-index" aria-hidden="true">
              02
            </span>
            <h2 id="room-codes-title">Current room codes</h2>
          </div>
          {codes.length > 0 ? (
            <button className="relay-clear-button" type="button" onClick={clear}>
              Clear room
            </button>
          ) : null}
        </div>

        {codes.length === 0 ? (
          <div className="relay-empty" role="status">
            <span className="relay-empty-mark" aria-hidden="true">
              —
            </span>
            <p>No active codes</p>
            <span>Send the first one from this device or another room participant.</span>
          </div>
        ) : (
          <ul className="tfa-list" aria-label="Current room relay history">
            {codes.map((code) => {
              const remaining = remainingSeconds(code);
              const age = Math.max(0, Math.floor((Date.now() - code.ts) / 1_000));
              const isCopied = copiedId === code.id && clipboard.copied;
              return (
                <li key={code.id} className="tfa-code">
                  <button
                    type="button"
                    className="tfa-code-btn"
                    onClick={() => void copy(code)}
                    aria-label={`Copy code ${formatCode(code.digits)}`}
                  >
                    <span className="tfa-code-content">
                      <span className="tfa-digits-display">{formatCode(code.digits)}</span>
                      <span className="tfa-code-status">
                        {isCopied ? "Copied to this device" : "Copy to this device"}
                      </span>
                    </span>
                    <span className="tfa-copy-glyph" aria-hidden="true">
                      {isCopied ? "✓" : "⎘"}
                    </span>
                  </button>
                  <div className="tfa-code-meta">
                    <span>{code.label ?? sourceLabel(code, room.peerId)}</span>
                    <span title={`${age} seconds ago`}>{remaining}s left</span>
                  </div>
                  {code.label ? (
                    <span className="tfa-code-source">{sourceLabel(code, room.peerId)}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
