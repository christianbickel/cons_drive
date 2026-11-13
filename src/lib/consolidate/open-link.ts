/**
 * Open Consolidate deep links in the desktop app when possible, else browser.
 *
 * Strategy:
 * 1. Ask `/api/consolidate/open` (local Windows can launch/register the app)
 * 2. Try the `consolidate://` protocol when it was registered locally
 * 3. Fall back to `https://` in a new browser tab
 */

export function toConsolidateAppProtocolUrl(webUrl: string): string | null {
  try {
    const url = new URL(webUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.protocol = "consolidate:";
    return url.toString();
  } catch {
    return null;
  }
}

function openInBrowser(webUrl: string): void {
  window.open(webUrl, "_blank", "noopener,noreferrer");
}

function tryAppProtocol(appUrl: string, timeoutMs = 1200): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (opened: boolean) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("blur", onBlur);
      window.clearTimeout(timer);
      resolve(opened);
    };

    const onBlur = () => finish(true);
    window.addEventListener("blur", onBlur);

    const timer = window.setTimeout(() => finish(false), timeoutMs);

    try {
      const anchor = document.createElement("a");
      anchor.href = appUrl;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch {
      finish(false);
    }
  });
}

const PROTOCOL_FLAG = "consolidate-drive-protocol";

function rememberProtocolRegistered(): void {
  try {
    window.localStorage.setItem(PROTOCOL_FLAG, "1");
  } catch {
    // ignore
  }
}

function wasProtocolRegistered(): boolean {
  try {
    return window.localStorage.getItem(PROTOCOL_FLAG) === "1";
  } catch {
    return false;
  }
}

export async function openConsolidateLink(webUrl: string): Promise<void> {
  const url = webUrl?.trim();
  if (!url || url === "#") return;

  let protocolRegistered = wasProtocolRegistered();

  try {
    const response = await fetch("/api/consolidate/open", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (response.ok) {
      const data = (await response.json()) as {
        ok?: boolean;
        reason?: string;
        protocolRegistered?: boolean;
      };
      if (data.protocolRegistered) {
        protocolRegistered = true;
        rememberProtocolRegistered();
      }
      if (data.ok) return;
      // App is open but cannot receive deep links yet — browser is the reliable path.
      if (
        data.reason === "already-running" ||
        data.reason === "untrusted-url"
      ) {
        openInBrowser(url);
        return;
      }
    }
  } catch {
    // API unavailable — try protocol only if previously registered on this machine.
  }

  if (protocolRegistered) {
    const appUrl = toConsolidateAppProtocolUrl(url);
    if (appUrl) {
      const opened = await tryAppProtocol(appUrl);
      if (opened) return;
    }
  }

  openInBrowser(url);
}
