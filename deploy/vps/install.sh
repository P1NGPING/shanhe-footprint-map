#!/bin/bash
set -euo pipefail
app=/opt/shanhe-footprint-map
if [ "$(id -u)" -ne 0 ]; then echo 'Run as root' >&2; exit 1; fi
if ! id shanhe >/dev/null 2>&1; then useradd --system --home-dir "$app" --shell /usr/sbin/nologin shanhe; fi
install -d -m 700 -o shanhe -g shanhe "$app/.task-tmp"
install -m 644 "$app/deploy/vps/shanhe-footprint.service" /etc/systemd/system/shanhe-footprint.service
if [ ! -f /etc/shanhe-footprint.env ]; then install -m 640 -o root -g shanhe "$app/deploy/vps/shanhe-footprint.env" /etc/shanhe-footprint.env; fi
install -m 644 "$app/deploy/vps/nginx.conf" /etc/nginx/sites-available/shanhe-footprint
ln -sfn /etc/nginx/sites-available/shanhe-footprint /etc/nginx/sites-enabled/shanhe-footprint
# This server was checked to be empty before its first deployment.
if [ -L /etc/nginx/sites-enabled/default ]; then unlink /etc/nginx/sites-enabled/default; fi
nginx -t
systemctl daemon-reload
systemctl enable --now shanhe-footprint nginx
systemctl reload nginx
systemctl is-active shanhe-footprint nginx
