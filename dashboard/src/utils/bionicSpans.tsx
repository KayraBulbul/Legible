import type { ReactNode } from "react";

export default function bionicSpans(text: string): ReactNode[] {
  return text.split(/(\s+)/).map((part, i) => {
    if (!part.trim()) return part;
    const boldLen = part.length <= 3 ? 1 : Math.ceil(part.length * 0.5);
    return (
      <span key={i}>
        <b className="font-bold">{part.slice(0, boldLen)}</b>
        {part.slice(boldLen)}
      </span>
    );
  });
}
