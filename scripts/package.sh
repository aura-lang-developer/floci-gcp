#!/usr/bin/env bash
# ==============================================================================
# Aura GCP: Local Distribution Packaging Helper
# ==============================================================================
set -e

VERSION="${1:-$(git describe --tags --always 2>/dev/null || echo "v0.1.0")}"
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "${ARCH}" in
  x86_64) ARCH_LABEL="x86_64" ;;
  arm64|aarch64) ARCH_LABEL="arm64" ;;
  *) ARCH_LABEL="${ARCH}" ;;
esac

PLATFORM="${OS}-${ARCH_LABEL}"
DIST_NAME="aura-gcp-${VERSION}-${PLATFORM}"
DIST_DIR="dist/${DIST_NAME}"

echo "=================================================================="
echo "📦 Packaging Aura GCP: ${DIST_NAME}"
echo "=================================================================="

rm -rf "${DIST_DIR}" "dist/${DIST_NAME}.tar.gz"
mkdir -p "${DIST_DIR}/bin"

# Copy launcher scripts
cp bin/aura-gcp* "${DIST_DIR}/bin/" 2>/dev/null || true
chmod +x "${DIST_DIR}/bin/"* 2>/dev/null || true

# Copy aurac binary if locally available
if command -v aurac >/dev/null 2>&1; then
  AURAC_PATH="$(command -v aurac)"
  echo "✓ Bundling aurac compiler binary from: ${AURAC_PATH}"
  cp "${AURAC_PATH}" "${DIST_DIR}/bin/aurac"
  chmod +x "${DIST_DIR}/bin/aurac"
else
  echo "⚠️  'aurac' not found in PATH; bundle will rely on host-installed aurac."
fi

# Copy core files
echo "✓ Bundling Aura application sources and assets..."
cp server.aura "${DIST_DIR}/"
cp -r services "${DIST_DIR}/"
cp -r ui "${DIST_DIR}/"
cp -r website "${DIST_DIR}/"
cp -r scripts "${DIST_DIR}/"
cp README.md "${DIST_DIR}/"
cp Dockerfile "${DIST_DIR}/"

# Clean any temporary compiler output inside package
rm -f "${DIST_DIR}/services/"*.mjs* 2>/dev/null || true
rm -f "${DIST_DIR}/"*.mjs* 2>/dev/null || true
rm -f "${DIST_DIR}/"*.__aura_tmp.* 2>/dev/null || true

# Create archive
echo "✓ Creating tarball..."
cd dist
tar -czvf "${DIST_NAME}.tar.gz" "${DIST_NAME}" > /dev/null

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "${DIST_NAME}.tar.gz" > "${DIST_NAME}.tar.gz.sha256"
elif command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "${DIST_NAME}.tar.gz" > "${DIST_NAME}.tar.gz.sha256"
fi

cd ..

echo "=================================================================="
echo "🎉 PACKAGE COMPLETE:"
echo "👉 Archive: dist/${DIST_NAME}.tar.gz"
if [ -f "dist/${DIST_NAME}.tar.gz.sha256" ]; then
  echo "👉 SHA256:  $(cat "dist/${DIST_NAME}.tar.gz.sha256")"
fi
echo "=================================================================="
