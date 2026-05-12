import { useEffect, useMemo, useState } from "react";
import type { MeshConfig, YRoom } from "@baditaflorin/mesh-common";

type Props = { room: YRoom | null; config: MeshConfig };

type Code = {
  id: string;
  digits: string;
  label?: string;
  fromPeer: string;
  ts: number;
};

const TTL_MS = 90_000; // codes are short-lived; auto-expire after 90s

function fmt6(s: string) {
  const d = s.replace(/\D/g, "").slice(0, 6);
  return d.length >= 4 ? `${d.slice(0, 3)} ${d.slice(3)}` : d;
}

function shortFrom(id: string) {
  return id.slice(0, 4);
}

export function Feature({ room, config }: Props) {
  void config;
  const [draft, setDraft] = useState("");
  const [label, setLabel] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [, rerender] = useState(0);

  useEffect(() => {
    if (!room) return;
    const arr = room.doc.getArray<Code>("codes");
    const onChange = () => rerender((n) => n + 1);
    arr.observe(onChange);
    return () => arr.unobserve(onChange);
  }, [room]);

  // Periodically tick to recompute "age" / TTL so old codes hide.
  useEffect(() => {
    const t = setInterval(() => rerender((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const codes = useMemo(() => {
    if (!room) return [] as Code[];
    const now = Date.now();
    return [...room.doc.getArray<Code>("codes").toArray()]
      .filter((c) => now - c.ts < TTL_MS)
      .reverse();
  }, [room]);

  if (!room) {
    return (
      <div className="tfa-screen">
        <h1>2fa bridge</h1>
        <p className="tfa-status">Connecting…</p>
      </div>
    );
  }

  const send = () => {
    const digits = draft.replace(/\D/g, "");
    if (digits.length < 4) return;
    const arr = room.doc.getArray<Code>("codes");
    arr.push([
      {
        id: crypto.randomUUID(),
        digits,
        label: label.trim() || undefined,
        fromPeer: room.peerId,
        ts: Date.now(),
      },
    ]);
    setDraft("");
    setLabel("");
  };

  const copy = async (c: Code) => {
    try {
      await navigator.clipboard.writeText(c.digits);
      setCopiedId(c.id);
      setTimeout(() => setCopiedId((id) => (id === c.id ? null : id)), 1500);
    } catch {
      // fall through
    }
  };

  const clear = () => {
    const arr = room.doc.getArray<Code>("codes");
    arr.delete(0, arr.length);
  };

  return (
    <div className="tfa-screen">
      <header className="tfa-header">
        <h1>2fa bridge</h1>
        <p className="tfa-status">
          {room.peerCount + 1} device{room.peerCount === 0 ? "" : "s"} · codes auto-expire after 90
          s
        </p>
        <p className="tfa-warn">
          Only join this room from <strong>your own</strong> devices. Anyone in the room sees the
          codes. Treat the room ID like a shared secret.
        </p>
      </header>

      <form
        className="tfa-send"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          className="tfa-digits"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="123 456"
          inputMode="numeric"
          maxLength={8}
          autoFocus
        />
        <input
          className="tfa-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="label (optional)"
          maxLength={32}
        />
        <button type="submit" disabled={draft.replace(/\D/g, "").length < 4}>
          send
        </button>
      </form>

      <ul className="tfa-list">
        {codes.map((c) => {
          const mine = c.fromPeer === room.peerId;
          const age = Math.max(0, Math.floor((Date.now() - c.ts) / 1000));
          const remaining = Math.max(0, Math.ceil((TTL_MS - (Date.now() - c.ts)) / 1000));
          return (
            <li key={c.id} className={`tfa-code ${mine ? "is-mine" : ""}`}>
              <button type="button" className="tfa-code-btn" onClick={() => copy(c)}>
                <span className="tfa-digits-display">{fmt6(c.digits)}</span>
                <span className="tfa-code-status">
                  {copiedId === c.id ? "✓ copied" : "tap to copy"}
                </span>
              </button>
              <div className="tfa-code-meta">
                <span>{c.label ?? (mine ? "you sent" : `from peer-${shortFrom(c.fromPeer)}`)}</span>
                <span>
                  {age}s ago · {remaining}s left
                </span>
              </div>
            </li>
          );
        })}
        {codes.length === 0 && <li className="tfa-empty">no codes — send one above</li>}
      </ul>

      {codes.length > 0 && (
        <button type="button" className="tfa-clear" onClick={clear}>
          clear all
        </button>
      )}
    </div>
  );
}
