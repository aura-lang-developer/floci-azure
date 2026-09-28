#!/usr/bin/env bash
# ==============================================================================
# Floci-Azure Quick Launcher
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

PORT=${1:-10000}

echo "Starting Floci-Azure local Microsoft Azure emulator on port :${PORT}..."
cd "${PROJECT_DIR}"
AZURE_PORT=${PORT} aurac run server.aura
