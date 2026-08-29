#!/usr/bin/env bash
# OrderFlow Operations — Update script
# Usage: sudo bash deploy/update.sh [VERSION]
set -euo pipefail

VERSION="${1:?Usage: update.sh VERSION (e.g. 0.2.0)}"
APP_USER="orderflow"
APP_ROOT="/opt/orderflow"
RELEASE_DIR="${APP_ROOT}/orderflow-operations-v${VERSION}"
ARCHIVE="orderflow-operations-v${VERSION}.tar.gz"
REPO="luismpenholato/orderflow-operations"

echo "==> OrderFlow Operations update to v${VERSION}"

# Backup database (if DATABASE_URL is set)
if [[ -f "${APP_ROOT}/.env" ]]; then
  # shellcheck disable=SC1091
  set -a && source "${APP_ROOT}/.env" && set +a
  if [[ -n "${DATABASE_URL:-}" ]]; then
    BACKUP_FILE="${APP_ROOT}/backups/pre-update-v${VERSION}-$(date +%Y%m%d%H%M%S).sql"
    echo "==> Backing up database to ${BACKUP_FILE}..."
    pg_dump "${DATABASE_URL}" > "${BACKUP_FILE}"
    chown "${APP_USER}:${APP_USER}" "${BACKUP_FILE}"
  fi
fi

# Download and verify
echo "==> Downloading release..."
curl -fsSL \
  "https://github.com/${REPO}/releases/download/v${VERSION}/${ARCHIVE}" \
  -o "/tmp/${ARCHIVE}"
curl -fsSL \
  "https://github.com/${REPO}/releases/download/v${VERSION}/${ARCHIVE}.sha256" \
  -o "/tmp/${ARCHIVE}.sha256"
cd /tmp && sha256sum -c "${ARCHIVE}.sha256"

# Extract
echo "==> Extracting to ${RELEASE_DIR}..."
mkdir -p "${RELEASE_DIR}"
tar -xzf "/tmp/${ARCHIVE}" -C "${RELEASE_DIR}" --strip-components=1
chown -R "${APP_USER}:${APP_USER}" "${RELEASE_DIR}"

# Switch symlink
ln -sfn "${RELEASE_DIR}" "${APP_ROOT}/current"

# Run migrations
echo "==> Running database migrations..."
sudo -u "${APP_USER}" bash -c "
  cd ${APP_ROOT}/current
  set -a && source ${APP_ROOT}/.env && set +a
  npm run db:migrate
"

# Restart services
echo "==> Restarting services..."
systemctl restart orderflow-api orderflow-erp-mock

# Health check
sleep 3
if curl -sf http://localhost:3000/health > /dev/null; then
  echo "==> Update to v${VERSION} complete. Health check passed."
else
  echo "ERROR: Health check failed after update!"
  echo "To rollback: sudo ln -sfn ${APP_ROOT}/orderflow-operations-vPREVIOUS ${APP_ROOT}/current"
  echo "             sudo systemctl restart orderflow-api orderflow-erp-mock"
  exit 1
fi
