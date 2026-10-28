# Static origin migration

GitHub remains the source of truth. CI builds and tests `.pages-artifact` once;
the Cloudflare job downloads that same immutable artifact. No Worker script,
database, binding or bot runtime is deployed by this configuration.

Before enabling production:

1. Wait for every required check on the migration revision to pass. The owner
   chose zero required third-party approvals; preserve all required CI checks.
2. Download `vozen-static-<sha>` from the successful CI run. Install this directory's
   locked CLI with `npm ci --ignore-scripts`. Set the owner's account ID privately
   and authenticate with a token restricted to that account (Workers Scripts Edit)
   and `vozen.org` (Workers Routes Edit, Zone Read). Never put a token in Git or an argument.
3. Copy `_headers` into the downloaded `.pages-artifact` and run
   `wrangler deploy --config deploy/cloudflare/wrangler.jsonc --env preview`.
   This environment has no domain routes. Verify HTTPS, content, clean URLs,
   redirects, 404 responses, desktop/mobile navigation and security headers.
   Do not widen production OAuth origins for the preview hostname.
4. Inspect the existing `www` to apex redirect and preserve it at the zone layer.
   Store `CLOUDFLARE_API_TOKEN` in the `cloudflare-production` GitHub environment,
   set `CLOUDFLARE_ACCOUNT_ID` and, only after preview acceptance, set repository
   variable `CLOUDFLARE_SITE_PUBLISH=true`. Run the workflow on the validated main revision.
5. Verify both public hosts and real owner login at the original site origin.
   API hosts, tunnel, bot services, data and backups must remain untouched.

GitHub Pages publishing stays available as fallback. To undo routing, first disable
`CLOUDFLARE_SITE_PUBLISH`, then remove only the two routes belonging to `vozen-site`.
The previous Pages certificate problem still applies to this fallback; do not
claim that rollback restores a valid Pages origin certificate.
