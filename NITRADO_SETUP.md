# Nitrado Live Server Status Setup

The website reads Nitrado credentials only from Railway environment variables. Never add a token to GitHub, HTML, JavaScript, or a public Discord message.

## Railway variables

Open the website service in Railway, select **Variables**, and add:

```text
NITRADO_TOKEN=your_private_nitrado_api_token
NITRADO_SERVER_LABELS=Chernarus,Livonia
```

- The token must include permission to read **Services**.
- The website automatically discovers the DayZ game-server services available to that token.
- `NITRADO_SERVER_LABELS` is optional. Labels follow the service order returned by Nitrado.
- You may optionally set `NITRADO_SERVICE_IDS` to a comma-separated allowlist if you ever want to hide an accessible service.

After saving the variables, redeploy the Railway service. Do not send the token to anyone.

## Railway commands

Build command: leave blank. Railway will detect `package.json` and install Node.js automatically.

Start command:

```bash
npm start
```

## What visitors can see

- Public server label and server name
- Operational status
- Current players and maximum slots
- Current map when Nitrado returns it
- Last successful refresh

The API token and full Nitrado response are never sent to the browser. Responses are cached for 30 seconds to limit API traffic.
