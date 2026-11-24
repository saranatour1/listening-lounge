export type Agent = { bot: boolean; browser: string; os: string };

// shortcut: classifies from the browser's own user-agent, so a bot that fakes a normal one passes as
// human; check the User-Agent header in a Convex HTTP action if that ever matters.
export function describeAgent(ua: string, webdriver = false): Agent {
  const bot =
    webdriver ||
    /bot|crawl|spider|slurp|headless|lighthouse|python|curl|wget|puppeteer|playwright|phantom/i.test(
      ua,
    );
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /HeadlessChrome/.test(ua)
          ? "Headless Chrome"
          : /Chrome\//.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : (ua.match(/^[\w-]+/)?.[0] ?? "Unknown");
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown OS";
  return { bot, browser: browser.slice(0, 40), os };
}
