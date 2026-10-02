# Alter Workforce extension

Implements the Founder handoff of 3 October 2026 and AlterLabs issue 1.

The production AlterLabs domain serves the cinematic site from nginx on EC2, while this GitHub repository still contains the earlier Cosmos site. The extension therefore reuses the **actual deployed** service-page HTML shell, CSS, fonts, icons and analytics captured from `https://alterlabs.in/solutions/voice-support/`. The capture manifest records URLs, byte counts and SHA-256 digests. The legacy primary-domain source in this repository is preserved.

`workforce/` is a self-contained static document root with the homepage, eight role pages, robots and sitemap. All content and navigation are present without JavaScript. Only the existing analytics utility needs JavaScript. `assets/workforce.css` adds content spacing and wrapping for role prices and bundle buttons; it introduces no palette, typography, panel or button design.

Build and check:

```sh
npm run build:workforce
npm run validate:workforce
npm run preview:workforce
```

The checked-in shared assets are intentionally pinned. Run `node scripts/workforce/capture-live.mjs` only when refreshing against a verified production release, then re-run browser QA. The build reads the captured shell and does not depend on network access. Sitemap lastmod records the generation date in UTC.

## Primary-domain links

`primary/` contains nine public live pages with bounded additions: a homepage footer link, a native Workforce product card on the product listing, and contextual links on BNS, CRM, LMS, automation, business systems, chatbot and voice pages. No shared CSS or JavaScript changes are deployed to the primary domain.

`primary-manifest.json` describes each addition and pins the before and after hashes. `integrate.py` validates every current server page and every payload before the first write, makes a timestamped backup, and replaces each page atomically. If a peer deployment has changed a page, the operation stops for reinspection. Do not deploy this repository's legacy root over the current live site.

## Deployment

The smallest deployment uses a separate nginx document root at `/var/www/workforce`, linked to a versioned directory under `/var/www/workforce-releases`. The A record is `workforce.alterlabs.in` → `13.207.247.22`, DNS only, matching the primary-domain topology. `stage.sh` stages HTTP and checks all eleven launch resources locally; `https.sh` issues a certificate through the host's existing ACME account and enables HTTPS after DNS resolves. Both validate nginx before reload. Primary integration is applied after the subdomain passes public HTTPS checks.

Deploy through the already-authenticated AWS SSM path. The package is kept in the existing `alterlabs-prod-origin-124215944549` release bucket. Never run credential/login commands.

The EC2 instance role cannot read this release bucket. The launch used a 15-minute signed S3 download, transferred inside the SSM command and verified against the archive digest before extraction. Generate download URLs with the founder-refreshed session; keep them out of logs and repository files. Both deployment probes retry during nginx's graceful reload.

The live release is `workforce-dae5813-20261003` (archive SHA-256 `b54c2143d906c57d79564e81d69f46b0764abedd08d1e445e9bcb616069d4312`). The initial nine-page primary backup is `/var/www/workforce-releases/primary-backup-20261002T232642Z`. The certificate expires 31 December 2026 and uses the host's existing Certbot renewal timer. `live-validation.json` records the 47 public response/hash checks and genuine 404/HTTPS redirect results.

For primary-page rollback, compare each current digest with its integration manifest `after_sha256` before restoring its saved page; stop if a peer has deployed new content. Restore only the nine manifest paths, then verify their `before_sha256` values. To remove the extension route, move its dedicated nginx configuration to a backup outside `conf.d`, run `nginx -t`, and reload. Keep the release and primary backup for recovery. Do not restore this repository's legacy root over production.

The Google Search Console domain property `alterlabs.in` covers the subdomain. Submit the absolute sitemap URL and request each of the nine pages through URL Inspection. Submission is not proof of indexing. Record Google's exact responses and any quotas or blockers separately.

Launch receipt: Google accepted all nine individual URLs into its priority crawl queue. The sitemap submission was accepted twice, but its current processing status remains **Couldn't fetch / Sitemap could not be read**, with zero discovered pages. Public HTTPS GET/HEAD and a Googlebot-user-agent probe return 200 with valid XML; Google and Cloudflare public resolvers return the expected A record. The cause of Google's processing status is unverified. No page is claimed indexed. See `indexing-receipt.json` for each accepted URL and timestamp.

## Validation limits

Static checks cover titles, descriptions, canonicals, INR offers, visible FAQ/schema agreement, disclosures, crawlability and shared-asset hashes. Browser QA covers all pages at 320, 390 and 1440 CSS pixels, labels, analytics, and automated WCAG A/AA checks. Automated checks reported no violations but could not decide contrast over gradients; screenshots were manually inspected. This is not a full accessibility certification or a guarantee of Google indexing.
