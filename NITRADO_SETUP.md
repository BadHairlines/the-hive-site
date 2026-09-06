# Nitrado Live Server Status Setup

The website reads Nitrado credentials **only from Railway environment variables**. Never put a token in GitHub, HTML, JavaScript, screenshots, or a public Discord message.

## Recommended Railway variables

Open the website service in Railway → **Variables** and add:

```text
NITRADO_TOKEN=your_private_nitrado_api_token
NITRADO_SERVER_LABELS=Chernarus,Livonia
NITRADO_SERVICE_IDS=12345678,87654321
```

### What each variable does

- `NITRADO_TOKEN` — required. The token must be able to read your Nitrado services/gameservers.
- `NITRADO_SERVER_LABELS` — optional display names, in the same order as your selected service IDs.
- `NITRADO_SERVICE_IDS` — **strongly recommended** when the Nitrado account contains multiple services. It prevents unrelated services from being considered and avoids discovery problems when Nitrado does not return a recognizable DayZ game label.

If `NITRADO_SERVICE_IDS` is omitted, the website asks Nitrado for all accessible services and automatically keeps services that identify themselves as DayZ.

## Finding the service IDs

A Nitrado gameserver web-interface URL normally contains the numeric service ID. Example shape:

```text
https://webinterface.nitrado.net/12345678/wi/gameserver/
```

In that example, the service ID is `12345678`. Add only the two DayZ services you want the website to display.

## Railway deploy settings

Build command: leave blank.

Start command:

```bash
npm start
```

Railway will use the `package.json` Node engine and start `server.js`.

## Public endpoints

- `/api/server-status` — sanitized public status used by the website.
- `/api/server-status.php` — compatibility alias for older versions of the site.
- `/api/health` — simple Railway health endpoint.

The public status response contains only:

- Public server label/name
- Operational status
- Current/max players
- Current map when Nitrado provides it
- Last successful refresh time

The token, service IDs, request headers, and raw Nitrado responses are never returned to the browser.

## Refresh behavior

- Nitrado responses are cached server-side for 30 seconds.
- The browser refreshes status every 30 seconds.
- If Nitrado briefly fails after a successful request, the server can return the last successful status as stale data instead of immediately blanking the page.

## If the site says no DayZ services were found

Set `NITRADO_SERVICE_IDS` explicitly in Railway. This is the most reliable setup for an account that has multiple Nitrado products/services.
