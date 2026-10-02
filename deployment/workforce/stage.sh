#!/bin/bash
# Stage only the new static subdomain. Primary-site integration is a separate guarded operation.
set -euo pipefail
ARCHIVE_URL="$1"
EXPECTED_SHA="$2"
RELEASE="$3"
[[ "$RELEASE" =~ ^workforce-[a-z0-9-]+$ ]] || exit 2
BASE=/var/www/workforce-releases
DEST="$BASE/$RELEASE"
CONF=/etc/nginx/conf.d/workforce.alterlabs.in.conf
test ! -e "$DEST"
test ! -e "$CONF"
test ! -e /var/www/workforce
mkdir -p "$DEST"
aws s3 cp "$ARCHIVE_URL" "$DEST/package.tar.gz" --region ap-south-1 --only-show-errors
printf '%s  %s\n' "$EXPECTED_SHA" "$DEST/package.tar.gz" | sha256sum -c -
tar -xzf "$DEST/package.tar.gz" -C "$DEST"
test -s "$DEST/workforce/index.html"
test -s "$DEST/workforce/sitemap.xml"
find "$DEST/workforce" -type d -exec chmod 755 {} +
find "$DEST/workforce" -type f -exec chmod 644 {} +
ln -s "$DEST/workforce" /var/www/workforce
cat > "$CONF" <<'NGINX'
server {
    listen 80;
    server_name workforce.alterlabs.in;
    root /var/www/workforce;
    index index.html;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    location ^~ /.well-known/acme-challenge/ { root /var/www/letsencrypt; }
    location / { try_files $uri $uri/ =404; }
    location ~ /\. { deny all; }
    error_page 404 /404.html;
    location = /404.html { internal; }
}
NGINX
if ! nginx -t; then
  rm -f "$CONF" /var/www/workforce
  echo 'Stage rolled back: nginx validation failed.'
  exit 3
fi
systemctl reload nginx
for route in / /virtual-content-creator/ /virtual-engineer/ /virtual-operations-manager/ /virtual-team-leader/ /virtual-sales-agent-chat/ /virtual-support-agent-chat/ /virtual-sales-agent-voice/ /virtual-support-agent-voice/ /robots.txt /sitemap.xml; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: workforce.alterlabs.in' "http://127.0.0.1$route")
  test "$code" = 200
  echo "$code $route"
done
echo "STAGED $DEST"
