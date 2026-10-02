#!/bin/bash
set -euo pipefail
CONF=/etc/nginx/conf.d/workforce.alterlabs.in.conf
test -s "$CONF"
test "$(getent ahostsv4 workforce.alterlabs.in | awk '{print $1}' | sort -u)" = '13.207.247.22'
LIVE=/etc/letsencrypt/live/workforce.alterlabs.in
if [ ! -d "$LIVE" ]; then
  certbot certonly --webroot -w /var/www/letsencrypt -d workforce.alterlabs.in --cert-name workforce.alterlabs.in --key-type ecdsa --non-interactive
fi
openssl x509 -in "$LIVE/fullchain.pem" -noout -subject -enddate -ext subjectAltName
BACKUP="/var/www/workforce-releases/http-stage-$(date -u +%Y%m%dT%H%M%SZ).conf"
cp -p "$CONF" "$BACKUP"
cat > "$CONF" <<'NGINX'
server {
    listen 80;
    server_name workforce.alterlabs.in;
    location ^~ /.well-known/acme-challenge/ { root /var/www/letsencrypt; }
    location / { return 301 https://workforce.alterlabs.in$request_uri; }
}
server {
    listen 443 ssl;
    http2 on;
    server_name workforce.alterlabs.in;
    ssl_certificate /etc/letsencrypt/live/workforce.alterlabs.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/workforce.alterlabs.in/privkey.pem;
    root /var/www/workforce;
    index index.html;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    location / { try_files $uri $uri/ =404; }
    location ~ /\. { deny all; }
    location ~* \.(css|js|woff2?|png|svg)$ { try_files $uri =404; expires 7d; }
    error_page 404 /404.html;
    location = /404.html { internal; }
}
NGINX
if ! nginx -t; then cp -p "$BACKUP" "$CONF"; nginx -t; exit 3; fi
systemctl reload nginx
curl --fail --silent --show-error --resolve workforce.alterlabs.in:443:127.0.0.1 https://workforce.alterlabs.in/ -o /tmp/workforce-https-probe.html
grep -q 'https://workforce.alterlabs.in/' /tmp/workforce-https-probe.html
echo WORKFORCE_HTTPS_VERIFIED
