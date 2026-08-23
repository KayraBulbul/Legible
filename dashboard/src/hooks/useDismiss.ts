import { useEffect, type RefObject } from "react";

/**
 * Closes a transient surface (menu, dialog) on Escape or on a pointer press
 * outside `ref`. Both listeners are attached only while `active`, so a closed
 * surface costs nothing.
 *
 * `mousedown` rather than `click`: a menu must close before the press lands on
 * whatever is underneath, otherwise the item behind it gets activated too.
 */
export function useDismiss(
  active: boolean,
  ref: RefObject<HTMLElement | null>,
  onDismiss: () => void,
): void {
  useEffect(() => {
    if (!active) return;

    function handlePointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) onDismiss();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onDismiss();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [active, ref, onDismiss]);
}
