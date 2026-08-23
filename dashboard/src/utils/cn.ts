import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines and merges Tailwind CSS class names.
 * Resolves conflicts by ensuring the last class takes precedence.
 */
export default function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
