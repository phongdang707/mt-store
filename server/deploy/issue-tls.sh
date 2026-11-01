#!/usr/bin/env bash
# Cấp chứng chỉ cho mt-store.nhatrothongminh.click qua certbot của stack nhatro.
# Không ghi đè default.conf / https.conf của gateway.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOMAIN="mt-store.nhatrothongminh.click"
EXPECTED_IP="103.72.97.203"
NGINX_DIR="/opt/nhatro/backend/deploy/nginx"
NHATRO_DIR="/opt/nhatro/backend/deploy"
DEST="${NGINX_DIR}/mt-store.conf"

env_value() {
  local key="$1"
  local file="$2"
  [[ -f "$file" ]] || return 0
  grep -E "^${key}=" "$file" | tail -n1 | cut -d= -f2- | tr -d '"' | tr -d "'"
}

install_conf() {
  local src="$1"
  local backup
  backup="$(mktemp)"
  if [[ -f "$DEST" ]]; then
    cp -a "$DEST" "$backup"
  fi
  cp -f "$src" "$DEST"
  if ! docker exec nhatro-nginx-1 nginx -t; then
    if [[ -s "$backup" ]]; then
      cp -a "$backup" "$DEST"
    else
      rm -f "$DEST"
    fi
    rm -f "$backup"
    echo "nginx -t failed; previous ${DEST} restored" >&2
    exit 1
  fi
  rm -f "$backup"
  docker exec nhatro-nginx-1 nginx -s reload
}

RESOLVED="$(python3 -c "import socket; print(socket.gethostbyname('${DOMAIN}'))" 2>/dev/null || true)"
if [[ "${RESOLVED}" != "${EXPECTED_IP}" ]]; then
  echo "DNS ${DOMAIN} → '${RESOLVED:-none}'. Thêm bản ghi A tới ${EXPECTED_IP} (Bảo vệ: tắt)." >&2
  exit 1
fi

EMAIL="$(env_value CERTBOT_EMAIL "${NHATRO_DIR}/.env")"
if [[ -z "${EMAIL}" ]]; then
  echo "Set CERTBOT_EMAIL in ${NHATRO_DIR}/.env" >&2
  exit 1
fi

echo "Installing HTTP vhost for ${DOMAIN}"
install_conf "${ROOT}/deploy/nginx/mt-store.http.conf"

echo "Issuing Let's Encrypt cert for ${DOMAIN}"
docker compose --project-directory "${NHATRO_DIR}" --env-file "${NHATRO_DIR}/.env" --profile tls run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "${EMAIL}" \
  --agree-tos \
  --no-eff-email \
  --non-interactive \
  --keep-until-expiring \
  -d "${DOMAIN}"

echo "Enabling HTTPS for ${DOMAIN}"
install_conf "${ROOT}/deploy/nginx/mt-store.conf"
echo "HTTPS ready: https://${DOMAIN}/api/health"
