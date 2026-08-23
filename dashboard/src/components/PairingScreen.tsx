import { useState, type FormEvent } from "react";
import { useAuth } from "@/context/authContext";

/** Shown instead of the dashboard shell whenever there is no valid session. */
export default function PairingScreen() {
  const { isPairing, pairError, pair } = useAuth();
  const [code, setCode] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
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
            // Codes are 8 uppercase characters (docs/api.md); normalising
            // here means a pasted lowercase code doesn't fail validation.
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            maxLength={8}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="Enter pairing code here"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-center text-sm uppercase tracking-widest text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent-subtle"
          />
          <button
            type="submit"
            disabled={isPairing || !code}
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
