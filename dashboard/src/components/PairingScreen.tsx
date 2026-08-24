import { useState, type FormEvent } from "react";
import { useAuth } from "@/context/authContext";
import {
  PAIRING_CODE_LENGTH,
  isCompletePairingCode,
  normalizePairingCode,
} from "@/utils/pairingCode";

/** Shown instead of the dashboard shell whenever there is no valid session. */
export default function PairingScreen() {
  const { isPairing, pairError, pair } = useAuth();
  const [code, setCode] = useState("");

  const isComplete = isCompletePairingCode(code);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isComplete) return;
    pair(code).catch(() => {});
  }

  return (
    <div className="flex h-full min-h-[720px] w-full items-center justify-center bg-bg p-8">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-lg font-bold text-text-primary">
          Pair this dashboard
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Open the extension, create a pairing code, and enter it here to load
          your saved pages.
        </p>

        <form className="mt-6 flex flex-col gap-3" onSubmit={handleSubmit}>
          <label htmlFor="pairing-code" className="sr-only">
            Pairing code
          </label>
          <input
            id="pairing-code"
            type="text"
            value={code}
            // The backend takes eight characters from a restricted alphabet
            // and normalises nothing (docs/api.md), so lower case, spaces, and
            // the dashes people add when copying a code off another screen all
            // have to be stripped here. Doing it on every keystroke rather
            // than at submit keeps what is on screen the same as what is sent.
            onChange={(event) =>
              setCode(normalizePairingCode(event.target.value))
            }
            maxLength={PAIRING_CODE_LENGTH}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="Enter pairing code here"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-center text-sm uppercase tracking-widest text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent-subtle"
          />
          <button
            type="submit"
            disabled={isPairing || !isComplete}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-text-inverse hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPairing ? "Pairing…" : "Pair"}
          </button>

          {pairError && (
            <p role="alert" className="text-sm text-danger">
              {pairError}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
