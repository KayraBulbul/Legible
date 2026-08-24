import { useEffect, useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import Modal from "@/components/Modal";
import { usePairingCode } from "@/hooks/usePairingCode";
import {
  PAIRING_CODE_LENGTH,
  describeCountdown,
  formatCountdown,
} from "@/utils/pairingCode";

/** Below this the countdown turns urgent, to prompt a fresh code in good time. */
const URGENT_MS = 60 * 1000;

const RING_RADIUS = 13;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Drains clockwise as the code ages. Decorative: the same information is in
 * the text beside it, which is what a screen reader announces.
 */
function ExpiryRing({
  elapsedFraction,
  urgent,
}: {
  elapsedFraction: number;
  urgent: boolean;
}) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle
        cx="16"
        cy="16"
        r={RING_RADIUS}
        fill="none"
        strokeWidth="3"
        className="stroke-border"
      />
      <circle
        cx="16"
        cy="16"
        r={RING_RADIUS}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={RING_CIRCUMFERENCE * elapsedFraction}
        transform="rotate(-90 16 16)"
        className={urgent ? "stroke-danger" : "stroke-accent"}
      />
    </svg>
  );
}

/**
 * Lets an already-paired dashboard link a further client — another browser, or
 * another extension install — to the same anonymous user.
 *
 * The copy is explicit that pairing joins sessions rather than copying pages
 * anywhere, because "link my devices" usually means sync elsewhere. Both
 * clients resolve to one `user.id` and so read one library; signing out of
 * either revokes only that session.
 */
export default function LinkDeviceModal({ onClose }: { onClose: () => void }) {
  // Mounted only while open (see UserMenu), so every open starts with no code,
  // which is what you want — a code left over from an earlier visit has almost
  // certainly lapsed.
  const { requestStatus, code, remainingMs, elapsedFraction, error, request } =
    usePairingCode();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Clipboard permission can be denied outright; the code is on screen.
      setCopied(false);
    }
  }

  const isLive = code !== null && remainingMs > 0;
  const urgent = remainingMs <= URGENT_MS;
  const isRequesting = requestStatus === "requesting";

  return (
    <Modal title="Link another device" onClose={onClose}>
      <p className="text-xs leading-relaxed text-text-secondary">
        Enter this code in the extension on the other device. Both then share
        this one library — nothing is copied across, and signing out of one
        device leaves the other signed in.
      </p>

      {code !== null && (
        <div className="mt-4 rounded-xl border border-border bg-bg p-4 text-center">
          <output
            className={`block font-display text-2xl font-bold tracking-[0.3em] ${
              isLive ? "text-text-primary" : "text-text-secondary line-through"
            }`}
          >
            {code}
          </output>

          {isLive ? (
            <div className="mt-3 flex items-center justify-center gap-2">
              <ExpiryRing elapsedFraction={elapsedFraction} urgent={urgent} />
              <span
                aria-hidden="true"
                className={`font-display text-sm font-semibold tabular-nums ${
                  urgent ? "text-danger" : "text-text-primary"
                }`}
              >
                {formatCountdown(remainingMs)}
              </span>
              <span className="text-xs text-text-secondary">left</span>
            </div>
          ) : (
            <p className="mt-3 text-xs font-medium text-danger">
              This code expired. Create a new one.
            </p>
          )}

          {/* Announced on whole minutes only. A live region updating four
              times a second would talk over everything else in the dialog. */}
          <span role="status" className="sr-only">
            {!isLive || Math.ceil(remainingMs / 1000) % 60 === 0
              ? describeCountdown(remainingMs)
              : ""}
          </span>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-xs text-danger">
          {error}
          {isLive && " The code above still works."}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={request}
          disabled={isRequesting}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-text-inverse hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLive && !isRequesting && <RefreshCw size={13} aria-hidden="true" />}
          {isRequesting
            ? "Creating…"
            : code === null
              ? "Create a code"
              : isLive
                ? "Replace this code"
                : "Create a new code"}
        </button>

        {isLive && (
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="flex items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold text-text-primary hover:bg-surface-hover"
          >
            {copied ? (
              <Check size={13} aria-hidden="true" />
            ) : (
              <Copy size={13} aria-hidden="true" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-text-secondary">
        Codes are {PAIRING_CODE_LENGTH} characters, work once, and expire after
        ten minutes. Creating a new one immediately retires the previous code.
      </p>
    </Modal>
  );
}
