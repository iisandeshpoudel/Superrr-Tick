(function initContentBridge() {
  const INPAGE_SOURCE = "GNOP_DISCOVERY_INPAGE";
  const PAGE_META_SOURCE = "GNOP_DISCOVERY_PAGE_META";

  function isTargetReportPage() {
    try {
      const url = new URL(location.href);
      return url.hostname === "gnop.nebula.gogoro.com" && url.pathname.startsWith("/report/gs-statistic/swap-summary/");
    } catch (_error) {
      return false;
    }
  }

  if (!isTargetReportPage()) {
    return;
  }

  function injectInpageScript() {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("inpage.js");
    script.type = "text/javascript";
    script.async = false;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  function forwardMessageToBackground(payload) {
    try {
      chrome.runtime.sendMessage(payload, () => {
        void chrome.runtime.lastError;
      });
    } catch (_error) {
      void _error;
    }
  }

  function sendPageMeta() {
    const payload = {
      type: "GNOP_DISCOVERY_PAGE_META",
      payload: {
        pageUrl: location.href,
        documentTitle: document.title || "",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
        timezoneOffsetMinutes: new Date().getTimezoneOffset()
      }
    };
    forwardMessageToBackground(payload);
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) {
      return;
    }

    const data = event.data;
    if (!data || typeof data !== "object") {
      return;
    }

    if (data.source === INPAGE_SOURCE) {
      forwardMessageToBackground({
        type: "GNOP_DISCOVERY_CAPTURE",
        payload: data.payload || {}
      });
      return;
    }

    if (data.source === PAGE_META_SOURCE) {
      forwardMessageToBackground({
        type: "GNOP_DISCOVERY_PAGE_META",
        payload: data.payload || {}
      });
    }
  });

  injectInpageScript();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      sendPageMeta();
    });
  } else {
    sendPageMeta();
  }

  window.addEventListener("focus", () => {
    sendPageMeta();
  });

  window.addEventListener("popstate", () => {
    sendPageMeta();
  });

  window.addEventListener("hashchange", () => {
    sendPageMeta();
  });
})();
