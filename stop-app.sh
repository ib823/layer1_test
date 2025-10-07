#!/bin/bash

###############################################################################
# SAP MVP Framework - Application Stop Script
# Description: Stops all running services
###############################################################################

PROJECT_ROOT="/workspaces/layer1_test"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

echo "=============================================================================="
log_info "Stopping SAP MVP Framework services..."
echo "=============================================================================="

# Stop Backend API
if [ -f "$PROJECT_ROOT/logs/api.pid" ]; then
    API_PID=$(cat "$PROJECT_ROOT/logs/api.pid")
    if kill -0 $API_PID 2>/dev/null; then
        kill $API_PID
        log_success "Backend API stopped (PID: $API_PID)"
    fi
    rm "$PROJECT_ROOT/logs/api.pid"
fi

# Stop Frontend
if [ -f "$PROJECT_ROOT/logs/web.pid" ]; then
    WEB_PID=$(cat "$PROJECT_ROOT/logs/web.pid")
    if kill -0 $WEB_PID 2>/dev/null; then
        kill $WEB_PID
        log_success "Frontend stopped (PID: $WEB_PID)"
    fi
    rm "$PROJECT_ROOT/logs/web.pid"
fi

# Kill any remaining node processes for this project
pkill -f "packages/api" || true
pkill -f "packages/web" || true
pkill -f "next dev" || true

log_success "All services stopped"

echo ""
echo "To restart, run: ./start-app.sh"
echo ""
