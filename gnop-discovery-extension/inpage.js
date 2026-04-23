(function initInpageCapture() {
  const SOURCE = "GNOP_DISCOVERY_INPAGE";
  const PAGE_META_SOURCE = "GNOP_DISCOVERY_PAGE_META";

  function postPayload(payload) {
    window.postMessage(
      {
        source: SOURCE,
        payload
      },
      "*"
    );
  }

  function readHeaders(headersLike) {
    const out = {};
    if (!headersLike) {
      return out;
    }

    try {
      if (headersLike instanceof Headers) {
        headersLike.forEach((value, key) => {
          out[key] = value;
        });
        return out;
      }

      if (Array.isArray(headersLike)) {
        for (const pair of headersLike) {
          if (!Array.isArray(pair) || pair.length < 2) {
            continue;
          }
          out[String(pair[0]).toLowerCase()] = String(pair[1]);
        }
        return out;
      }

      if (typeof headersLike === "object") {
        for (const [key, value] of Object.entries(headersLike)) {
          out[String(key).toLowerCase()] = String(value);
        }
      }
    } catch (_error) {
      return out;
    }

    return out;
  }

  function parseMaybeJson(text) {
    if (typeof text !== "string") {
      return null;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      return null;
    }
    const first = trimmed[0];
    if (first !== "{" && first !== "[") {
      return null;
    }
    try {
      return JSON.parse(trimmed);
    } catch (_error) {
      return null;
    }
  }

  function serializeBody(body) {
    if (body == null) {
      return null;
    }

    if (typeof body === "string") {
      return body;
    }

    if (body instanceof URLSearchParams) {
      return body.toString();
    }

    if (body instanceof FormData) {
      const entries = [];
      for (const [key, value] of body.entries()) {
        if (typeof value === "string") {
          entries.push([key, value]);
        } else {
          entries.push([key, "[binary]"]);
        }
      }
      return { formData: entries };
    }

    if (body instanceof Blob) {
      return "[blob]";
    }

    if (body instanceof ArrayBuffer) {
      return "[arrayBuffer]";
    }

    try {
      if (typeof body === "object") {
        return JSON.parse(JSON.stringify(body));
      }
      return String(body);
    } catch (_error) {
      return "[unserializable-body]";
    }
  }

  function shouldInspectUrl(urlText) {
    if (!urlText) {
      return false;
    }

    try {
      const absolute = new URL(urlText, window.location.href);
      if (absolute.hostname !== "gnop.nebula.gogoro.com") {
        return false;
      }
      const path = absolute.pathname || "";
      return (
        path.includes("/api/v1/reports/gs-statistic/") ||
        path.includes("/api/v1/gostation/site/search")
      );
    } catch (_error) {
      return false;
    }
  }

  function sendPageMeta() {
    window.postMessage(
      {
        source: PAGE_META_SOURCE,
        payload: {
          pageUrl: window.location.href,
          documentTitle: document.title || "",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
          timezoneOffsetMinutes: new Date().getTimezoneOffset()
        }
      },
      "*"
    );
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = async function patchedFetch(input, init) {
    const startedAt = Date.now();

    let method = "GET";
    let url = "";
    let requestHeaders = {};
    let requestBody = null;

    if (typeof input === "string") {
      url = input;
    } else if (input && typeof input === "object") {
      url = input.url || "";
      method = input.method || method;
      requestHeaders = readHeaders(input.headers);
      requestBody = serializeBody(input.body);
    }

    if (init && typeof init === "object") {
      method = init.method || method;
      if (init.headers) {
        requestHeaders = { ...requestHeaders, ...readHeaders(init.headers) };
      }
      if (init.body != null) {
        requestBody = serializeBody(init.body);
      }
    }

    let response;
    try {
      response = await originalFetch(input, init);
    } catch (error) {
      if (shouldInspectUrl(url)) {
        postPayload({
          transport: "fetch",
          startedAt,
          finishedAt: Date.now(),
          documentTitle: document.title || "",
          pageUrl: window.location.href,
          request: {
            method,
            url,
            headers: requestHeaders,
            body: requestBody
          },
          response: null,
          error: String(error)
        });
      }
      throw error;
    }

    if (!shouldInspectUrl(url)) {
      return response;
    }

    const responseClone = response.clone();
    const responseHeaders = readHeaders(responseClone.headers);

    let responseText = "";
    try {
      responseText = await responseClone.text();
    } catch (_error) {
      responseText = "";
    }

    postPayload({
      transport: "fetch",
      startedAt,
      finishedAt: Date.now(),
      documentTitle: document.title || "",
      pageUrl: window.location.href,
      request: {
        method,
        url,
        headers: requestHeaders,
        body: requestBody
      },
      response: {
        status: response.status,
        ok: response.ok,
        headers: responseHeaders,
        json: parseMaybeJson(responseText),
        text: responseText
      },
      error: null
    });

    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.open = function patchedOpen(method, url, async, user, password) {
    this.__gnopDiscovery = {
      method: method ? String(method).toUpperCase() : "GET",
      url: url ? String(url) : "",
      headers: {},
      body: null,
      startedAt: Date.now()
    };
    return originalOpen.call(this, method, url, async, user, password);
  };

  XMLHttpRequest.prototype.setRequestHeader = function patchedSetRequestHeader(header, value) {
    if (this.__gnopDiscovery && header) {
      this.__gnopDiscovery.headers[String(header).toLowerCase()] = String(value);
    }
    return originalSetRequestHeader.call(this, header, value);
  };

  XMLHttpRequest.prototype.send = function patchedSend(body) {
    if (this.__gnopDiscovery) {
      this.__gnopDiscovery.body = serializeBody(body);
      this.__gnopDiscovery.startedAt = Date.now();
    }

    this.addEventListener("loadend", function onLoadEnd() {
      const meta = this.__gnopDiscovery;
      if (!meta || !shouldInspectUrl(meta.url)) {
        return;
      }

      const responseHeadersRaw = this.getAllResponseHeaders() || "";
      const responseHeaders = {};
      responseHeadersRaw.split("\r\n").forEach((line) => {
        if (!line) {
          return;
        }
        const idx = line.indexOf(":");
        if (idx < 0) {
          return;
        }
        const key = line.slice(0, idx).trim().toLowerCase();
        const value = line.slice(idx + 1).trim();
        responseHeaders[key] = value;
      });

      const responseText = typeof this.responseText === "string" ? this.responseText : "";
      postPayload({
        transport: "xhr",
        startedAt: meta.startedAt,
        finishedAt: Date.now(),
        documentTitle: document.title || "",
        pageUrl: window.location.href,
        request: {
          method: meta.method,
          url: meta.url,
          headers: meta.headers,
          body: meta.body
        },
        response: {
          status: this.status,
          ok: this.status >= 200 && this.status < 300,
          headers: responseHeaders,
          json: parseMaybeJson(responseText),
          text: responseText
        },
        error: null
      });
    });

    return originalSend.call(this, body);
  };

  sendPageMeta();
  window.addEventListener("focus", sendPageMeta);
  window.addEventListener("popstate", sendPageMeta);
  window.addEventListener("hashchange", sendPageMeta);
})();
