import { describe, expect, it } from "vitest";
import sanitizeHtml from "@/utils/sanitizeHtml";

describe("sanitizeHtml", () => {
  it("removes executable content and hardens retained links and images", () => {
    const sanitized = sanitizeHtml(`
      <article onclick="steal()" style="position: fixed">
        <script>steal()</script>
        <a id="unsafe" href="javascript:steal()">Unsafe</a>
        <a id="safe" href="https://example.test/article">Safe</a>
        <img id="image" src="https://images.example.test/photo.jpg" onerror="steal()">
      </article>
    `);
    const document = new DOMParser().parseFromString(sanitized, "text/html");

    expect(document.querySelector("script")).toBeNull();
    expect(document.querySelector("article")?.hasAttribute("onclick")).toBe(false);
    expect(document.querySelector("article")?.hasAttribute("style")).toBe(false);
    expect(document.querySelector("#unsafe")?.hasAttribute("href")).toBe(false);

    const safeLink = document.querySelector("#safe");
    expect(safeLink?.getAttribute("target")).toBe("_blank");
    expect(safeLink?.getAttribute("rel")).toBe("noopener noreferrer");

    const image = document.querySelector("#image");
    expect(image?.hasAttribute("onerror")).toBe(false);
    expect(image?.getAttribute("referrerpolicy")).toBe("no-referrer");
    expect(image?.getAttribute("loading")).toBe("lazy");
  });
});
