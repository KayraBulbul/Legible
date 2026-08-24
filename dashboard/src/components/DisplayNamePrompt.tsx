import { useState, type FormEvent } from "react";
import { useAuth } from "@/context/authContext";

/**
 * Shown once, right after pairing, whenever `user.displayName` is still
 * `null` — a freshly created guest has no name yet (docs/api.md,
 * `GuestSessionResponse`), and every paired session shares the same one, so
 * whichever client asks first is enough for both.
 */
export default function DisplayNamePrompt() {
  const { setDisplayName } = useAuth();
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setIsSaving(true);
    setError(null);
    setDisplayName(trimmed).catch(() => {
      setError("Could not save that name. Try again.");
      setIsSaving(false);
    });
  }

  return (
    <div className="flex h-full min-h-[720px] w-full items-center justify-center bg-bg p-8">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-lg font-bold text-text-primary">
          What should we call you?
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          This name shows up wherever this account appears. You can change it
          later.
        </p>

        <form className="mt-6 flex flex-col gap-3" onSubmit={handleSubmit}>
          <label htmlFor="display-name" className="sr-only">
            Display name
          </label>
          <input
            id="display-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            autoComplete="name"
            autoFocus
            placeholder="Enter your name"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-center text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent-subtle"
          />
          <button
            type="submit"
            disabled={isSaving || !name.trim()}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-text-inverse hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Continue"}
          </button>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
