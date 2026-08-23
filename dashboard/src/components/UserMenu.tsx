import { useCallback, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { useDismiss } from "@/hooks/useDismiss";
import { useAuth } from "@/context/authContext";

/** Guests have no name to initial, so this falls back to a fixed mark. */
function initialsFor(displayName: string | null): string {
  if (!displayName) return "A";
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const letters =
    parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return letters.map((part) => part[0]!.toUpperCase()).join("") || "A";
}

/** Avatar button in the topbar that opens a menu for signing out. */
export default function UserMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useDismiss(open, containerRef, close);

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }, [signOut]);

  const label = user?.displayName ?? "Account";

  return (
    <div ref={containerRef} className="relative ml-auto inline-block">
      <button
        ref={triggerRef}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${label}`}
        className="flex h-8 w-8 select-none items-center justify-center rounded-full bg-warning text-xs font-bold text-text-inverse"
      >
        {initialsFor(user?.displayName ?? null)}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
        >
          <button
            role="menuitem"
            onClick={() => {
              close();
              void handleSignOut();
            }}
            disabled={isSigningOut}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-danger hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut size={13} aria-hidden="true" />
            {isSigningOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
