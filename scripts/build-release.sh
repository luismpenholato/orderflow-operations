#!/usr/bin/env bash
# OrderFlow Operations — Build release tarball
# Usage: bash scripts/build-release.sh [VERSION]
# Output: orderflow-operations-vX.Y.Z.tar.gz (+ .sha256)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

VERSION="${1:-$(node -p "require('./package.json').version")}"
RELEASE_NAME="orderflow-operations-v${VERSION}"
STAGING_DIR="${ROOT_DIR}/dist/${RELEASE_NAME}"
ARCHIVE="${ROOT_DIR}/dist/${RELEASE_NAME}.tar.gz"

echo "==> Building OrderFlow Operations v${VERSION}"

# Clean staging
rm -rf "${STAGING_DIR}"
mkdir -p "${STAGING_DIR}"

# Install and build
npm ci
npm run build

# Copy root files
cp package.json package-lock.json "${STAGING_DIR}/"
cp -r scripts "${STAGING_DIR}/"
cp -r deploy "${STAGING_DIR}/"

# Copy packages (built dist + package.json)
mkdir -p "${STAGING_DIR}/packages/contracts"
cp packages/contracts/package.json "${STAGING_DIR}/packages/contracts/"
cp -r packages/contracts/dist "${STAGING_DIR}/packages/contracts/"

# Copy apps (built dist + package.json + node_modules via npm ci in staging)
for app in api erp-mock web; do
  mkdir -p "${STAGING_DIR}/apps/${app}"
  cp "apps/${app}/package.json" "${STAGING_DIR}/apps/${app}/"
  cp -r "apps/${app}/dist" "${STAGING_DIR}/apps/${app}/"
done

# Production dependencies only
echo "==> Installing production dependencies in staging..."
cd "${STAGING_DIR}"
npm ci --omit=dev

# Create tarball
cd "${ROOT_DIR}/dist"
tar -czf "${ARCHIVE}" "${RELEASE_NAME}"

# SHA256 checksum
if command -v sha256sum &>/dev/null; then
  sha256sum "${RELEASE_NAME}.tar.gz" > "${RELEASE_NAME}.tar.gz.sha256"
elif command -v shasum &>/dev/null; then
  shasum -a 256 "${RELEASE_NAME}.tar.gz" > "${RELEASE_NAME}.tar.gz.sha256"
else
  echo "WARNING: neither sha256sum nor shasum found; skipping checksum"
fi

echo "==> Release artifact: ${ARCHIVE}"
echo "==> Checksum: ${ARCHIVE}.sha256"
ls -lh "${ARCHIVE}"
