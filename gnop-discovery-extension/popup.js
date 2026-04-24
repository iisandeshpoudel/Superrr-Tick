const DEFAULT_TIMEZONE = "+05:45";
const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;
let exportInProgress = false;
let selectedPresetScale = "month";
let workspaceActive = false;

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      resolve(response);
    });
  });
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = text;
  }
}

function getValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : "";
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.value = value;
  }
}

function setPresetScale(scale) {
  selectedPresetScale = scale || "day";
  const buttons = document.querySelectorAll(".scale-btn");
  buttons.forEach((button) => {
    button.classList.toggle("active", button.dataset.scale === scale);
  });
}

function normalizePresetScale(scale) {
  const value = String(scale || "day").toLowerCase();
  if (value === "hours" || value === "hour") return "day";
  if (value === "week") return "week";
  if (value === "month") return "month";
  return "day";
}

function todayDateText() {
  const d = new Date(Date.now() + NEPAL_OFFSET_MS);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isTargetReportUrl(urlText) {
  try {
    const url = new URL(urlText);
    return url.hostname === "gnop.nebula.gogoro.com" && url.pathname.startsWith("/report/gs-statistic/swap-summary/");
  } catch (_error) {
    return false;
  }
}

function parseReportUrl(urlText) {
  try {
    const url = new URL(urlText);
    return {
      timeScale: url.searchParams.get("timeScale") || "day",
      fromDate: url.searchParams.get("fromDate") || "",
      endDate: url.searchParams.get("endDate") || ""
    };
  } catch (_error) {
    return { timeScale: "day", fromDate: "", endDate: "" };
  }
}

function epochToDateText(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "";
  }
  const ms = numeric > 1e12 ? numeric : numeric * 1000;
  const date = new Date(ms + NEPAL_OFFSET_MS);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeReportDate(value, fallback) {
  const text = String(value || "").trim();
  if (/^\d{10,13}$/.test(text)) {
    const converted = epochToDateText(text);
    if (converted) {
      return converted;
    }
  }
  return String(fallback || text || "").trim();
}

async function getActiveReportContext() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs && tabs.length > 0 ? tabs[0] : null;
  const url = activeTab?.url || "";
  return {
    active: isTargetReportUrl(url),
    ...parseReportUrl(url)
  };
}

function setMode(mode) {
  const presetBtn = document.getElementById("presetModeBtn");
  const customBtn = document.getElementById("customModeBtn");
  const presetPanel = document.getElementById("presetPanel");
  const customPanel = document.getElementById("customPanel");

  if (mode === "custom") {
    presetBtn?.classList.remove("active");
    customBtn?.classList.add("active");
    presetPanel?.classList.add("hidden");
    customPanel?.classList.remove("hidden");
  } else {
    presetBtn?.classList.add("active");
    customBtn?.classList.remove("active");
    presetPanel?.classList.remove("hidden");
    customPanel?.classList.add("hidden");
  }
}

function setProgress(stage, percent, message) {
  const fill = document.getElementById("progressFill");
  const stageEl = document.getElementById("progressStage");
  const percentEl = document.getElementById("progressPercent");
  const labelEl = document.getElementById("progressLabel");

  if (fill) fill.style.width = `${Math.max(0, Math.min(100, percent || 0))}%`;
  if (stageEl) stageEl.textContent = message || stage || "Working";
  if (percentEl) percentEl.textContent = `${Math.max(0, Math.min(100, percent || 0))}%`;
  if (labelEl) labelEl.textContent = stage || "working";
}

function setBusy(busy) {
  exportInProgress = busy;
  updateWorkspaceUiState();
}

function updateWorkspaceUiState() {
  const btn = document.getElementById("downloadWorkbookBtn");
  if (!btn) {
    return;
  }
  btn.disabled = exportInProgress || !workspaceActive;
  btn.textContent = !workspaceActive
    ? "Open GNOP report page first"
    : exportInProgress
      ? "Generating workbook..."
      : "Download Excel workbook";
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function refreshStatus() {
  const result = await sendMessage({ type: "GNOP_DISCOVERY_GET_STATUS" });
  if (!result || !result.ok) {
    throw new Error((result && result.error) || "Failed to fetch status");
  }

  const status = result.status || {};
  setText("captureState", status.enabled ? "running" : "paused");
  setText("totalEvents", String(status.totalEvents || 0));
  setText("requestScopeSummary", JSON.stringify(status.requestScopeSummary || {}, null, 2));
  setText("lastCapturedAt", status.lastCapturedAt || "-");
  setText("latestPageMeta", JSON.stringify(status.latestPageMeta || {}, null, 2));

  const toggleBtn = document.getElementById("toggleBtn");
  if (toggleBtn) {
    toggleBtn.textContent = status.enabled ? "Pause capture" : "Resume capture";
  }

  setValue("timezoneHeader", DEFAULT_TIMEZONE);
  updateWorkspaceUiState();
}

async function preloadRangeFromActiveTab() {
  const ctx = await getActiveReportContext();
  workspaceActive = Boolean(ctx.active);
  if (workspaceActive) {
    if (ctx.fromDate) {
      setValue("startDate", epochToDateText(ctx.fromDate));
    }
    if (ctx.endDate) {
      setValue("endDate", epochToDateText(ctx.endDate));
    }
  } else {
    setText("captureState", "Open the GNOP swap-summary page to enable export");
  }
  updateWorkspaceUiState();
}

async function handleProgressMessage(message) {
  if (message?.type !== "GNOP_EXPORT_PROGRESS") {
    return;
  }
  const payload = message.payload || {};
  setProgress(payload.stage || "working", Number(payload.percent || 0), payload.message || "Working");
}

async function toggleCapture() {
  const current = await sendMessage({ type: "GNOP_DISCOVERY_GET_STATUS" });
  const currentEnabled = Boolean(current?.status?.enabled);
  const next = await sendMessage({ type: "GNOP_DISCOVERY_SET_ENABLED", enabled: !currentEnabled });
  if (!next || !next.ok) {
    throw new Error((next && next.error) || "Failed to toggle capture");
  }
  await refreshStatus();
}

async function clearCaptures() {
  const result = await sendMessage({ type: "GNOP_DISCOVERY_CLEAR" });
  if (!result || !result.ok) {
    throw new Error((result && result.error) || "Failed to clear captures");
  }
  await refreshStatus();
}

async function downloadCaptureJson() {
  const result = await sendMessage({ type: "GNOP_DISCOVERY_GET_EXPORT" });
  if (!result || !result.ok) {
    throw new Error((result && result.error) || "Failed to build export payload");
  }

  const exportData = result.exportData || {};
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const filename = `gnop-capture-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

  await chrome.downloads.download({ url: objectUrl, filename, saveAs: true });
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
}

async function downloadWorkbook() {
  if (exportInProgress) {
    return;
  }

  const mode = document.getElementById("customPanel")?.classList.contains("hidden") ? "preset" : "custom";
  const startDate = getValue("startDate");
  const endDate = getValue("endDate");
  const timezoneHeader = DEFAULT_TIMEZONE;

  const activeContext = await getActiveReportContext();
  if (!activeContext.active) {
    throw new Error("Open the GNOP swap-summary page first");
  }

  const selectedTimeScale = mode === "custom" ? "custom" : normalizePresetScale(selectedPresetScale || activeContext.timeScale || "day");
  const reportFromDate = mode === "custom" ? startDate : normalizeReportDate(activeContext.fromDate, startDate);
  const reportEndDate = mode === "custom" ? endDate : normalizeReportDate(activeContext.endDate, endDate);
  setBusy(true);
  setProgress("starting", 1, "Starting export");

  try {
    const result = await sendMessage({
      type: "GNOP_DISCOVERY_BUILD_WORKBOOK",
      payload: { timeScale: selectedTimeScale, startDate: reportFromDate, endDate: reportEndDate, timezoneHeader }
    });

    if (!result || !result.ok) {
      throw new Error((result && result.error) || "Failed to build workbook");
    }

    setProgress("assembling", 96, "Assembling workbook file");
    await nextFrame();

    const workbookModel = result.workbookModel || {};
    const writer = globalThis.GNOPWorkbookWriter;
    if (!writer) {
      throw new Error("Workbook writer is unavailable");
    }

    const blob = writer.buildXlsxBlob({
      sheets: workbookModel.sheets || [],
      creator: "GNOP Workbook Export",
      title: "GNOP Workbook Export",
      description: `GNOP export for ${workbookModel.timeScale || "day"} range`,
      createdAt: workbookModel.generatedAt ? new Date(workbookModel.generatedAt) : new Date()
    });

    setProgress("saving", 99, "Saving .xlsx file");
    await nextFrame();
    const objectUrl = URL.createObjectURL(blob);
    const filename = `gnop-workbook-${new Date().toISOString().replace(/[:.]/g, "-")}.xlsx`;
    try {
      await chrome.downloads.download({ url: objectUrl, filename, saveAs: true });
    } finally {
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
    }

    setProgress("done", 100, `Workbook ready${result.warnings?.length ? `, ${result.warnings.length} warnings` : ""}`);
  } finally {
    setBusy(false);
  }
}

function wireEvents() {
  document.getElementById("refreshBtn")?.addEventListener("click", () => {
    refreshStatus().catch((error) => setText("captureState", `error: ${String(error.message || error)}`));
  });

  document.getElementById("toggleBtn")?.addEventListener("click", () => {
    toggleCapture().catch((error) => setText("captureState", `error: ${String(error.message || error)}`));
  });

  document.getElementById("clearBtn")?.addEventListener("click", () => {
    clearCaptures().catch((error) => setText("captureState", `error: ${String(error.message || error)}`));
  });

  document.getElementById("downloadCaptureBtn")?.addEventListener("click", () => {
    downloadCaptureJson().catch((error) => setText("captureState", `error: ${String(error.message || error)}`));
  });

  document.getElementById("downloadWorkbookBtn")?.addEventListener("click", () => {
    downloadWorkbook().catch((error) => setText("captureState", `error: ${String(error.message || error)}`));
  });

  document.getElementById("timeScaleGroup")?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const scale = target.dataset?.scale;
    if (!scale) {
      return;
    }
    setPresetScale(scale);
    setMode("preset");
  });

  document.getElementById("presetModeBtn")?.addEventListener("click", () => setMode("preset"));
  document.getElementById("customModeBtn")?.addEventListener("click", () => {
    setMode("custom");
    if (!getValue("startDate")) setValue("startDate", todayDateText());
    if (!getValue("endDate")) setValue("endDate", todayDateText());
  });
}

function initDefaults() {
  setMode("preset");
  setPresetScale("month");
  setValue("startDate", todayDateText());
  setValue("endDate", todayDateText());
  setValue("timezoneHeader", DEFAULT_TIMEZONE);
  setProgress("idle", 0, "Idle");
  updateWorkspaceUiState();
}

initDefaults();
wireEvents();
preloadRangeFromActiveTab().catch(() => {});
refreshStatus().catch((error) => setText("captureState", `error: ${String(error.message || error)}`));

chrome.runtime.onMessage.addListener((message) => {
  handleProgressMessage(message).catch(() => {});
});
