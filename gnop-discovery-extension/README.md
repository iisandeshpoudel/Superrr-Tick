# GNOP Discovery Extension

This extension is for discovery only. It captures real GNOP dashboard request/response payloads so we can lock the exact backend behavior before building the production extraction pipeline.

## What it captures
- `gostation/site/search`
- `reports/gs-statistic/*` (including `swap-count`, `swap-summary`, and if present `swap-memory`)
- Both request and response payloads
- Page URL context to infer scope:
  - `total` when no `_siteList` in URL
  - `site` when `_siteList` is present

## Install
1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select folder: `gnop-discovery-extension`.

## Capture workflow (important)
1. Login normally in GNOP (same browser session).
2. Open report page you already use.
3. Keep dashboard default date (do not manually change date range).
4. With no site selected (total aggregate), trigger dashboard refresh/load so APIs fire.
5. Select one site, trigger refresh/load again.
6. Repeat site selection for as many sites as needed.
7. Open extension popup and click **Download capture JSON**.

## Share back
Share the downloaded JSON file. I will then:
- Parse exact request payload shape per endpoint and scope
- Confirm `swap-memory` endpoint/schema
- Confirm response array alignment and series behavior
- Update `context.md` with finalized discovery details

You can also use **Download normalized CSV** to get the current Excel-ready export.

## Notes
- This extension does not log in for you; it reuses your active authenticated session.
- It does not rely on browser DevTools being open.
- Data is stored locally in extension storage until you clear it.
- Multi-site selection exists in the UI, but the intended workflow is one total run and one site at a time.
