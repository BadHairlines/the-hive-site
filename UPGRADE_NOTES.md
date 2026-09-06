# The Hive Website — v2.0 Upgrade Notes

## Visual / UX

- Unified every public page under the same premium Hive navigation, typography, cards, footer, spacing, and mobile layout.
- Added a sticky blurred navigation bar and cleaner mobile menu.
- Reworked homepage live overview and server console.
- Added improved accessibility labels, skip links, focus-friendly controls, and semantic sections.
- Added responsive layouts for desktop, tablet, and mobile.

## Live Nitrado status

- New canonical endpoint: `/api/server-status`.
- Old `/api/server-status.php` remains as a compatibility alias.
- Browser refreshes live status every 30 seconds.
- Added manual **Refresh now** button on the Servers page.
- Homepage now shows actual live player totals and per-server rows when available.
- Hard-coded “servers online” messaging was replaced with real checking / live / partial / offline / unavailable states.
- Discovery checks additional Nitrado game identifiers and can recognize The Hive public hostname as a safe fallback.
- `NITRADO_SERVICE_IDS` is now strongly recommended for accounts with multiple Nitrado services.
- Last successful data can be returned as stale data during a temporary Nitrado failure.
- Added `/api/health` for Railway health checks.

## Raid weekend system

- Replaced the old countdown with timezone-aware raid-window logic.
- The timer now knows whether raid weekend is currently live.
- During raids it says **RAID LIVE • ENDS IN**.
- Outside raids it says **RAID OPENS IN**.
- Uses `America/New_York` and automatically handles EST/EDT changes.

## Rules

- Added instant rule search.
- Sections with no matching rules hide automatically while searching.
- Added no-results state.

## Servers

- Added live server cards with player meters.
- Added last-refreshed timestamp and manual refresh.
- Added a one-click **Copy Search** button for `50x | THE HIVE`.

## News / Events / Gallery

- Rebuilt JSON rendering to use safe DOM text instead of injecting feed content as HTML.
- News is automatically sorted newest first.
- Homepage only displays the three newest news items.
- Gallery images lazy-load and open in a keyboard-accessible lightbox.
- Better failure states if JSON feeds cannot load.

## Server hardening

- Added standard security headers.
- HTML is served with `no-cache`; static assets receive browser caching.
- HEAD requests no longer send file bodies.
- Added safer path handling and dotfile blocking.
- API responses use `no-store` so browser caching does not fight the 30-second server cache.
- Added graceful SIGTERM/SIGINT shutdown for Railway/container deploys.

## Removed

- Removed the old public `admin.html` because it exposed a client-side passcode and submitted to PHP endpoints that do not exist in the Node/Railway deployment.
