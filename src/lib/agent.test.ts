import { describe, expect, it } from "vite-plus/test";
import { describeAgent } from "./agent";

describe("describeAgent", () => {
  it("reads a normal desktop browser as a human", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36";
    expect(describeAgent(ua)).toEqual({ bot: false, browser: "Chrome", os: "macOS" });
  });

  it("reads mobile Safari as a human", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1";
    expect(describeAgent(ua)).toEqual({ bot: false, browser: "Safari", os: "iOS" });
  });

  it("flags headless Chrome, crawlers and automation", () => {
    expect(
      describeAgent("Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/158.0.0.0 Safari/537.36"),
    ).toEqual({
      bot: true,
      browser: "Headless Chrome",
      os: "Linux",
    });
    expect(
      describeAgent("Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)").bot,
    ).toBe(true);
    expect(describeAgent("curl/8.7.1")).toEqual({ bot: true, browser: "curl", os: "Unknown OS" });
    expect(
      describeAgent("Mozilla/5.0 (Windows NT 10.0) Chrome/158.0 Safari/537.36", true).bot,
    ).toBe(true);
  });
});
