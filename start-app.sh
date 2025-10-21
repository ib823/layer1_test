#!/bin/bash

###############################################################################
# SAP MVP Framework - Application Startup Script
# Description: Starts all services (Database, Backend API, Frontend)
# Usage: ./start-app.sh [--dev|--prod|--stub]
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MODE="${1:-dev}"
PROJECT_ROOT="/workspaces/layer1_test"
API_PORT="${PORT:-3001}"
WEB_PORT="3000"
DB_PORT="5432"
DB_NAME="sapframework"
DB_USER="postgres"
DB_PASSWORD="postgres"

###############################################################################
# Helper Functions
###############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

separator() {
    echo "=============================================================================="
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 is not installed. Please install it first."
        return 1
    fi
    return 0
}

###############################################################################
# Prerequisites Check
###############################################################################

check_prerequisites() {
    separator
    log_info "Checking prerequisites..."
    separator

    local missing=0

    # Check Node.js
    if check_command node; then
        NODE_VERSION=$(node --version)
        log_success "Node.js: $NODE_VERSION"
    else
        missing=1
    fi

    # Check pnpm
    if check_command pnpm; then
        PNPM_VERSION=$(pnpm --version)
        log_success "pnpm: $PNPM_VERSION"
    else
        missing=1
    fi

    # Check Docker (optional)
    if check_command docker; then
        log_success "Docker: Available"
    else
        log_warning "Docker not found (optional for local PostgreSQL)"
    fi

    # Check psql (optional)
    if check_command psql; then
        log_success "PostgreSQL client: Available"
    else
        log_warning "psql not found (optional)"
    fi

    if [ $missing -eq 1 ]; then
        log_error "Missing required dependencies. Please install them first."
        exit 1
    fi

    echo ""
}

###############################################################################
# Database Setup
###############################################################################

setup_database() {
    separator
    log_info "Setting up PostgreSQL database..."
    separator

    # Check if PostgreSQL is running on port
    if nc -z localhost $DB_PORT 2>/dev/null; then
        log_success "PostgreSQL is already running on port $DB_PORT"
    else
        log_info "Starting PostgreSQL with Docker..."

        # Check if container exists
        if docker ps -a --format '{{.Names}}' | grep -q "^sap-framework-db$"; then
            log_info "Starting existing container..."
            docker start sap-framework-db
        else
            log_info "Creating new PostgreSQL container..."
            docker run -d \
                --name sap-framework-db \
                -e POSTGRES_PASSWORD=$DB_PASSWORD \
                -e POSTGRES_DB=$DB_NAME \
                -p $DB_PORT:5432 \
                postgres:15
        fi

        # Wait for PostgreSQL to be ready
        log_info "Waiting for PostgreSQL to be ready..."
        sleep 5

        for i in {1..30}; do
            if nc -z localhost $DB_PORT 2>/dev/null; then
                log_success "PostgreSQL is ready!"
                break
            fi
            echo -n "."
            sleep 1
        done
        echo ""
    fi

    # Apply schema if needed
    if command -v psql &> /dev/null; then
        log_info "Checking database schema..."
        if psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1 FROM tenants LIMIT 1" 2>/dev/null; then
            log_success "Database schema already exists"
        else
            log_info "Applying database schema..."
            PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -f "$PROJECT_ROOT/infrastructure/database/schema.sql"
            log_success "Database schema applied"
        fi
    fi

    echo ""
}

###############################################################################
# Environment Setup
###############################################################################

setup_environment() {
    separator
    log_info "Setting up environment variables..."
    separator

    cd "$PROJECT_ROOT/packages/api"

    # Create .env if it doesn't exist
    if [ ! -f .env ]; then
        log_info "Creating .env file..."
        cat > .env <<EOF
# Server Configuration
PORT=$API_PORT
NODE_ENV=development

# Database
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:$DB_PORT/$DB_NAME

# Authentication (Disabled for dev mode)
AUTH_ENABLED=false
# XSUAA_URL=https://your-xsuaa.authentication.sap.hana.ondemand.com
# XSUAA_CLIENT_ID=your_client_id
# XSUAA_CLIENT_SECRET=your_client_secret

# SAP S/4HANA (Optional - for testing connectors)
# SAP_BASE_URL=https://your-sap-system.com
# SAP_CLIENT=100
# SAP_AUTH_TYPE=OAUTH
# SAP_CLIENT_ID=your_client_id
# SAP_CLIENT_SECRET=your_client_secret

# Ariba Stub Mode (Enable for offline testing)
ARIBA_STUB_MODE=true

# SuccessFactors Stub Mode (Enable for offline testing)
SF_STUB_MODE=true

# Redis (Optional - for rate limiting)
# REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGIN=http://localhost:$WEB_PORT

# Feature Flags
SOD_ENFORCEMENT_ENABLED=false
AUDIT_LOG_ENABLED=true
DATA_RESIDENCY_ENABLED=false
ENCRYPTION_AT_REST_REQUIRED=false
GDPR_PII_MASKING_ENABLED=true
EOF
        log_success ".env file created"
    else
        log_success ".env file already exists"
    fi

    echo ""
}

###############################################################################
# Build Application
###############################################################################

build_application() {
    separator
    log_info "Building application..."
    separator

    cd "$PROJECT_ROOT"

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies (this may take a few minutes)..."
        pnpm install
        log_success "Dependencies installed"
    else
        log_success "Dependencies already installed"
    fi

    # Build all packages
    log_info "Building packages..."
    pnpm build
    log_success "Build complete"

    echo ""
}

###############################################################################
# Start Services
###############################################################################

start_services() {
    separator
    log_info "Starting services..."
    separator

    # Create logs directory
    mkdir -p "$PROJECT_ROOT/logs"

    # Start Backend API
    log_info "Starting Backend API on port $API_PORT..."
    cd "$PROJECT_ROOT/packages/api"
    PORT=$API_PORT pnpm dev > "$PROJECT_ROOT/logs/api.log" 2>&1 &
    API_PID=$!
    echo $API_PID > "$PROJECT_ROOT/logs/api.pid"

    # Wait for API to start
    sleep 5
    if kill -0 $API_PID 2>/dev/null; then
        log_success "Backend API started (PID: $API_PID)"
    else
        log_error "Failed to start Backend API"
        cat "$PROJECT_ROOT/logs/api.log"
        exit 1
    fi

    # Start Frontend
    log_info "Starting Frontend on port $WEB_PORT..."
    cd "$PROJECT_ROOT/packages/web"
    pnpm dev > "$PROJECT_ROOT/logs/web.log" 2>&1 &
    WEB_PID=$!
    echo $WEB_PID > "$PROJECT_ROOT/logs/web.pid"

    # Wait for frontend to start
    sleep 5
    if kill -0 $WEB_PID 2>/dev/null; then
        log_success "Frontend started (PID: $WEB_PID)"
    else
        log_error "Failed to start Frontend"
        cat "$PROJECT_ROOT/logs/web.log"
        exit 1
    fi

    echo ""
}

###############################################################################
# Display Information
###############################################################################

display_info() {
    separator
    log_success "🚀 SAP MVP Framework is running!"
    separator
    echo ""
    echo -e "${GREEN}📍 Access URLs:${NC}"
    echo -e "   Frontend:     ${BLUE}http://localhost:$WEB_PORT${NC}"
    echo -e "   Backend API:  ${BLUE}http://localhost:$API_PORT/api${NC}"
    echo -e "   API Health:   ${BLUE}http://localhost:$API_PORT/api/health${NC}"
    echo -e "   API Version:  ${BLUE}http://localhost:$API_PORT/api/version${NC}"
    echo ""
    echo -e "${GREEN}👤 Dev Mode User:${NC}"
    echo -e "   Email:   dev@example.com"
    echo -e "   Role:    admin"
    echo -e "   Tenant:  dev-tenant"
    echo ""
    echo -e "${GREEN}📊 Available Pages:${NC}"
    echo -e "   Dashboard:       http://localhost:$WEB_PORT/"
    echo -e "   Admin Panel:     http://localhost:$WEB_PORT/admin"
    echo -e "   SoD Analysis:    http://localhost:$WEB_PORT/modules/sod"
    echo -e "   Violations:      http://localhost:$WEB_PORT/violations"
    echo -e "   Analytics:       http://localhost:$WEB_PORT/analytics"
    echo ""
    echo -e "${GREEN}📝 Logs:${NC}"
    echo -e "   API Log:  tail -f $PROJECT_ROOT/logs/api.log"
    echo -e "   Web Log:  tail -f $PROJECT_ROOT/logs/web.log"
    echo ""
    echo -e "${YELLOW}⚠️  Note: Authentication is DISABLED (dev mode)${NC}"
    echo -e "   To enable: Set AUTH_ENABLED=true in packages/api/.env"
    echo ""
    separator
    echo -e "${GREEN}To stop services, run:${NC}"
    echo -e "   ./stop-app.sh"
    echo ""
    separator
}

###############################################################################
# Main
###############################################################################

main() {
    clear
    separator
    echo -e "${BLUE}SAP MVP Framework - Application Startup${NC}"
    separator
    echo ""

    check_prerequisites
    setup_database
    setup_environment
    build_application
    start_services
    display_info

    # Keep script running
    log_info "Press Ctrl+C to stop all services"
    echo ""

    # Trap Ctrl+C
    trap 'log_info "Stopping services..."; ./stop-app.sh; exit 0' INT

    # Follow logs
    tail -f "$PROJECT_ROOT/logs/api.log" "$PROJECT_ROOT/logs/web.log"
}

main
