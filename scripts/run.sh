#!/usr/bin/env bash
# ==============================================================================
# Aura-GCP Quick Launcher
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

PORT=${1:-8080}

echo "Starting Aura-GCP local Google Cloud emulator on port :${PORT}..."
cd "${PROJECT_DIR}"
GCP_PORT=${PORT} aurac run server.aura
