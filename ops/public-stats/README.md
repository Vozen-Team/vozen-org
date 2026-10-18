# Live public TTS server count

Release verification is recorded in the adjacent deployment receipt.

`tools/export-public-stats.mjs` reads the bot's authoritative SQLite database in
read-only mode every 15 seconds. It counts TTS lifecycle rows with no departure,
matching the current installed-server definition in `vozen-store::growth_overview`
(with an explicit TTS product filter). It does not count configured or recently
active servers, Top.gg reports, or Helper servers. There is no Discord login,
bot process, new database table, or credential in the public website.

Only `{product:"tts",guilds:NUMBER,observedAt:ISO_TIMESTAMP}` is written atomically.
Failures leave the previous file intact. The browser fetches every 15 seconds,
pauses when hidden, refreshes on return, and removes readings older than 90 seconds.
The collection and browser intervals mean changes can take about 30 seconds to
appear, plus request time. This is automatic polling, not a push/WebSocket feed.
The initial count-up still runs once over 1.6 seconds; later counts replace it
directly, including decreases. Without JavaScript or a valid sample, it shows `—`.

## Installation preflight (operator required)

1. Confirm the deployed runtime revision, lifecycle schema and **actual active**
   SQLite file (including its WAL). Do not assume an old checkout or snapshot is
   current. Compare the aggregate to the private panel's current TTS inventory.
2. Confirm Node 22.22.1 or newer with `node:sqlite`, and read permission for `vozen`.
   Never copy private database data into the public directory. Only `stats.json`
   belongs there; the collector needs no tokens or network access.
3. Install the script in a versioned `/opt/vozen-public-stats/releases/<digest>/tools/`
   directory and point `current` to it. Preserve a rollback release.
4. Set `/etc/vozen/public-stats.env` with `VOZEN_STATS_DATABASE` pointing to the
   verified absolute SQLite path and
   `VOZEN_STATS_OUTPUT=/var/lib/vozen-public-stats/public/stats.json`.
   Test `--once` as `vozen` with a temporary output directory, then validate the
   JSON and confirm the bot database was not modified. Test while WAL is active.
5. Validate the unit with `systemd-analyze verify`, install and enable
   `vozen-public-stats.service`. Confirm consecutive timestamps and a count that
   matches the private panel. Do not restart the bot or modify its data.
6. Insert **only** `stats-route.caddy` into the current live Caddy JSON, preserving
   guards, proxy configuration and the status history route. For the existing
   patch helper, supply `/api/public/stats vozen_public_stats` as the last two
   arguments. Back up live JSON, guard its source hash against concurrent changes,
   validate and reload the candidate JSON. Never reload the stale Caddyfile.
7. Verify public GET/HEAD, no-store, canonical-origin CORS, rejected writes,
   direct-origin guards, existing health/history, and absence of private fields.
   Only then publish the website and verify the real value in the browser.

Rollback: stop/disable only this exporter, retain the previous JSON, and restore
the backed-up live Caddy JSON after validation if removing the route. Do not
alter the existing status collector or bot. The browser expires old observations.
