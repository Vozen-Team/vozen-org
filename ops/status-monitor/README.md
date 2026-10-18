# Daily public status history

The dedicated `vozen-status-monitor` systemd service records one public check per
UTC minute for TTS, Helper API and the website. It does not connect to Discord,
read bot databases, forward credentials, or install another bot process.

`tools/status-monitor.mjs` uses the shared browser/monitor model from
`site/js/status-history-model-v1.js`. Deploy both preserving their relative paths
under a versioned `/opt/vozen-status-monitor/releases/<digest>/` directory;
`current` points to the selected release. The unit runs as `vozen` and writes only
`/var/lib/vozen-status/public/history.json`. Writes use an atomic replacement.
Corrupt existing history causes collection to stop instead of resetting data.

Caddy exposes only that public aggregate file at
`https://api.vozen.org/api/public/status/history`. Production Caddy resumes its
JSON autosave, not the old `/etc/caddy/Caddyfile`. `patch-caddy.mjs` compiles the
`history-route.caddy` snippet and inserts only that route inside the existing API
proxy. It preserves origin guards, security headers and unrelated hosts, and
rejects an ambiguous layout. Never reload the old Caddyfile over live settings.

## Data meaning

The last 90 UTC days contain counts of operational, degraded, unavailable and
unknown observations. Past gaps are not backfilled. One check cannot establish
a complete healthy day. Availability percentages describe known recorded checks;
coverage separately shows how much of the selected period was observed. Browser
checks never write history. Failed probes with no trustworthy status are unknown.

Because the observer runs on the same VPS, a VPS outage can also stop collection;
such gaps remain unknown, not asserted healthy or offline. Independent external
monitoring would be needed to observe the VPS while it is down.

## Install and rollback

Verify unit syntax, run the candidate once into a separate temporary directory,
and verify its JSON before enabling the new service. Preserve the previous Caddy
JSON configuration, verify `caddy validate`, guard its source hash against concurrent
changes, then reload the candidate JSON (not restart Caddy). Check both
existing health endpoints, GET/HEAD/CORS on history, rejected writes, service
state and observations from two different minute buckets.

To stop collecting, disable and stop only `vozen-status-monitor.service`; retain
the data directory. Restore the saved live JSON configuration and reload Caddy after
validation if the new public route needs rollback. Do not alter bot containers,
their data volumes, or unrelated services.
