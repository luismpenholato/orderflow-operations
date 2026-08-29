#!/usr/bin/env bash
# OrderFlow Operations — First-time VPS installation script
# Usage: sudo bash deploy/install.sh [VERSION]
set -euo pipefail

VERSION="${1:-0.1.0}"
APP_USER="orderflow"
APP_ROOT="/opt/orderflow"
RELEASE_DIR="${APP_ROOT}/orderflow-operations-v${VERSION}"
ARCHIVE="orderflow-operations-v${VERSION}.tar.gz"
REPO="luismpenholato/orderflow-operations"

echo "==> OrderFlow Operations install v${VERSION}"

# Create system user
if ! id "${APP_USER}" &>/dev/null; then
  useradd --system --home "${APP_ROOT}" --shell /usr/sbin/nologin "${APP_USER}"
  echo "Created system user: ${APP_USER}"
fi

mkdir -p "${APP_ROOT}" /var/log/orderflow "${APP_ROOT}/backups"
chown "${APP_USER}:${APP_USER}" "${APP_ROOT}" /var/log/orderflow "${APP_ROOT}/backups"

# Download release if not present locally
if [[ ! -f "/tmp/${ARCHIVE}" ]]; then
  echo "==> Downloading release tarball..."
  curl -fsSL \
    "https://github.com/${REPO}/releases/download/v${VERSION}/${ARCHIVE}" \
    -o "/tmp/${ARCHIVE}"
  curl -fsSL \
    "https://github.com/${REPO}/releases/download/v${VERSION}/${ARCHIVE}.sha256" \
    -o "/tmp/${ARCHIVE}.sha256"
  cd /tmp && sha256sum -c "${ARCHIVE}.sha256"
fi

# Extract
echo "==> Extracting to ${RELEASE_DIR}..."
mkdir -p "${RELEASE_DIR}"
tar -xzf "/tmp/${ARCHIVE}" -C "${RELEASE_DIR}" --strip-components=1
chown -R "${APP_USER}:${APP_USER}" "${RELEASE_DIR}"

# Symlink
ln -sfn "${RELEASE_DIR}" "${APP_ROOT}/current"

# Environment file
if [[ ! -f "${APP_ROOT}/.env" ]]; then
  cp "${RELEASE_DIR}/deploy/.env.example" "${APP_ROOT}/.env"
  chown "${APP_USER}:${APP_USER}" "${APP_ROOT}/.env"
  chmod 600 "${APP_ROOT}/.env"
  echo "==> Created ${APP_ROOT}/.env — EDIT BEFORE STARTING SERVICES"
fi

# Install systemd units
echo "==> Installing systemd services..."
cp "${RELEASE_DIR}/deploy/systemd/orderflow-api.service" /etc/systemd/system/
cp "${RELEASE_DIR}/deploy/systemd/orderflow-erp-mock.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable orderflow-api orderflow-erp-mock

# Install nginx config
if [[ -d /etc/nginx/sites-available ]]; then
  cp "${RELEASE_DIR}/deploy/nginx/orderflow.conf" /etc/nginx/sites-available/orderflow
  ln -sf /etc/nginx/sites-available/orderflow /etc/nginx/sites-enabled/orderflow
  nginx -t && systemctl reload nginx
  echo "==> nginx configured"
fi

echo ""
echo "Installation complete. Next steps:"
echo "  1. Edit ${APP_ROOT}/.env with production values"
echo "  2. Run migrations: sudo -u ${APP_USER} bash -c 'cd ${APP_ROOT}/current && set -a && source ${APP_ROOT}/.env && set +a && npm run db:migrate'"
echo "  3. Start services: systemctl start orderflow-api orderflow-erp-mock"
echo "  4. Verify: curl http://localhost/health"
