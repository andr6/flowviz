#!/bin/bash

################################################################################
# ThreatFlow - Start/Stop Management Script
################################################################################
#
# This script manages the ThreatFlow application lifecycle with comprehensive
# prerequisite validation and health checks.
#
# Usage:
#   ./threatflow.sh start [mode]    # Start application (dev|prod|frontend|backend)
#   ./threatflow.sh stop [mode]     # Stop application (dev|prod|all)
#   ./threatflow.sh restart [mode]  # Restart application
#   ./threatflow.sh status          # Show application status
#   ./threatflow.sh validate        # Validate prerequisites only
#   ./threatflow.sh health          # Run health checks
#
# Modes:
#   dev       - Start both frontend and backend in development mode (default)
#   prod      - Start with PM2 for production
#   frontend  - Start frontend only
#   backend   - Start backend only
#
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
ENV_FILE="$PROJECT_DIR/.env"
FRONTEND_PORT=5173
BACKEND_PORT=3001
PID_DIR="$PROJECT_DIR/.pids"
LOG_DIR="$PROJECT_DIR/logs"

# Required versions
MIN_NODE_VERSION="18.0.0"
MIN_NPM_VERSION="9.0.0"
MIN_PG_VERSION="14.0"

################################################################################
# Utility Functions
################################################################################

print_header() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║            ThreatFlow Management Script                       ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_step() {
    echo -e "${CYAN}▶${NC} $1"
}

version_compare() {
    # Returns 0 if $1 >= $2, 1 otherwise
    printf '%s\n%s\n' "$2" "$1" | sort -V -C
}

create_directories() {
    mkdir -p "$PID_DIR"
    mkdir -p "$LOG_DIR"
}

################################################################################
# Prerequisite Validation
################################################################################

check_node() {
    print_step "Checking Node.js installation..."

    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        print_info "Install Node.js v${MIN_NODE_VERSION} or higher from https://nodejs.org"
        return 1
    fi

    local node_version=$(node --version | cut -d 'v' -f 2)
    if version_compare "$node_version" "$MIN_NODE_VERSION"; then
        print_success "Node.js $node_version (required: >= $MIN_NODE_VERSION)"
    else
        print_error "Node.js $node_version is too old (required: >= $MIN_NODE_VERSION)"
        return 1
    fi
}

check_npm() {
    print_step "Checking npm installation..."

    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        return 1
    fi

    local npm_version=$(npm --version)
    if version_compare "$npm_version" "$MIN_NPM_VERSION"; then
        print_success "npm $npm_version (required: >= $MIN_NPM_VERSION)"
    else
        print_error "npm $npm_version is too old (required: >= $MIN_NPM_VERSION)"
        return 1
    fi
}

check_postgresql() {
    print_step "Checking PostgreSQL installation..."

    if ! command -v psql &> /dev/null; then
        print_warning "PostgreSQL client (psql) is not installed"
        print_info "Install PostgreSQL: sudo apt-get install postgresql-client"
        print_info "Enterprise features require PostgreSQL database"
        return 0  # Not critical, warn only
    fi

    local pg_version=$(psql --version | grep -oP '\d+\.\d+' | head -1)
    if version_compare "$pg_version" "$MIN_PG_VERSION"; then
        print_success "PostgreSQL client $pg_version (required: >= $MIN_PG_VERSION)"
    else
        print_warning "PostgreSQL client $pg_version (recommended: >= $MIN_PG_VERSION)"
    fi

    # Check if PostgreSQL server is running
    if command -v systemctl &> /dev/null; then
        if systemctl is-active --quiet postgresql; then
            print_success "PostgreSQL server is running"
        else
            print_warning "PostgreSQL server is not running"
            print_info "Start with: sudo systemctl start postgresql"
        fi
    fi
}

check_env_file() {
    print_step "Checking environment configuration..."

    if [ ! -f "$ENV_FILE" ]; then
        print_error ".env file not found"
        print_info "Copy .env.example to .env and configure it"
        print_info "  cp .env.example .env"
        return 1
    fi

    print_success ".env file exists"

    # Check for required variables
    local required_vars=()
    local warnings=()

    # Check AI provider (at least one required)
    if ! grep -q "^ANTHROPIC_API_KEY=sk-ant-" "$ENV_FILE" && \
       ! grep -q "^OLLAMA_BASE_URL=http" "$ENV_FILE"; then
        warnings+=("No AI provider configured (ANTHROPIC_API_KEY or OLLAMA_BASE_URL)")
    fi

    # Check database URL
    if ! grep -q "^DATABASE_URL=" "$ENV_FILE"; then
        warnings+=("DATABASE_URL not set (required for enterprise features)")
    fi

    # Check JWT secrets
    if ! grep -q "^JWT_SECRET=" "$ENV_FILE" || ! grep -q "^JWT_REFRESH_SECRET=" "$ENV_FILE"; then
        warnings+=("JWT secrets not configured")
    fi

    if [ ${#warnings[@]} -gt 0 ]; then
        for warning in "${warnings[@]}"; do
            print_warning "$warning"
        done
        return 0  # Warnings, not errors
    fi

    print_success "Environment variables configured"
}

check_dependencies() {
    print_step "Checking npm dependencies..."

    if [ ! -d "$PROJECT_DIR/node_modules" ]; then
        print_error "node_modules directory not found"
        print_info "Run: npm install"
        return 1
    fi

    # Check if package-lock.json is in sync
    if [ -f "$PROJECT_DIR/package-lock.json" ]; then
        print_success "npm dependencies installed"
    else
        print_warning "package-lock.json not found"
        print_info "Run: npm install"
    fi
}

check_database_connection() {
    print_step "Checking database connectivity..."

    if [ ! -f "$ENV_FILE" ]; then
        print_warning "Cannot check database (no .env file)"
        return 0
    fi

    # Extract DATABASE_URL from .env
    local db_url=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d '=' -f 2-)

    if [ -z "$db_url" ]; then
        print_warning "DATABASE_URL not configured"
        return 0
    fi

    # Parse PostgreSQL connection string
    # Format: postgresql://user:password@host:port/database
    if [[ $db_url =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
        local db_user="${BASH_REMATCH[1]}"
        local db_pass="${BASH_REMATCH[2]}"
        local db_host="${BASH_REMATCH[3]}"
        local db_port="${BASH_REMATCH[4]}"
        local db_name="${BASH_REMATCH[5]}"

        # Test connection
        if PGPASSWORD="$db_pass" psql -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" -c "SELECT 1;" &> /dev/null; then
            print_success "Database connection successful ($db_name)"
        else
            print_warning "Cannot connect to database"
            print_info "Check DATABASE_URL in .env and ensure PostgreSQL is running"
        fi
    else
        print_warning "DATABASE_URL format not recognized"
    fi
}

check_ports_available() {
    print_step "Checking port availability..."

    local ports_in_use=()

    if lsof -i :$FRONTEND_PORT &> /dev/null; then
        ports_in_use+=("$FRONTEND_PORT (frontend)")
    fi

    if lsof -i :$BACKEND_PORT &> /dev/null; then
        ports_in_use+=("$BACKEND_PORT (backend)")
    fi

    if [ ${#ports_in_use[@]} -gt 0 ]; then
        print_warning "Ports in use: ${ports_in_use[*]}"
        print_info "Stop existing processes or they will be restarted"
    else
        print_success "Ports $FRONTEND_PORT and $BACKEND_PORT are available"
    fi
}

check_ollama() {
    print_step "Checking Ollama availability..."

    if ! grep -q "^OLLAMA_BASE_URL=" "$ENV_FILE" 2>/dev/null; then
        print_info "Ollama not configured (optional)"
        return 0
    fi

    local ollama_url=$(grep "^OLLAMA_BASE_URL=" "$ENV_FILE" | cut -d '=' -f 2-)

    if [ -z "$ollama_url" ]; then
        return 0
    fi

    if curl -s "${ollama_url}/api/tags" &> /dev/null; then
        print_success "Ollama is accessible at $ollama_url"

        # Check for required model
        local model=$(grep "^OLLAMA_MODEL=" "$ENV_FILE" | cut -d '=' -f 2- || echo "llama3.2-vision:latest")
        if curl -s "${ollama_url}/api/tags" | grep -q "$model"; then
            print_success "Ollama model '$model' is available"
        else
            print_warning "Ollama model '$model' not found"
            print_info "Pull model with: ollama pull $model"
        fi
    else
        print_warning "Ollama is not accessible at $ollama_url"
        print_info "Start Ollama with: ollama serve"
    fi
}

validate_all() {
    print_header
    echo -e "${CYAN}Validating Prerequisites...${NC}\n"

    local failed=0

    check_node || failed=1
    check_npm || failed=1
    check_postgresql
    check_env_file || failed=1
    check_dependencies || failed=1
    check_database_connection
    check_ports_available
    check_ollama

    echo ""
    if [ $failed -eq 0 ]; then
        print_success "All critical prerequisites validated"
        return 0
    else
        print_error "Prerequisite validation failed"
        print_info "Fix the errors above and try again"
        return 1
    fi
}

################################################################################
# Process Management
################################################################################

get_pid() {
    local name=$1
    local pid_file="$PID_DIR/${name}.pid"

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" &> /dev/null; then
            echo "$pid"
            return 0
        else
            rm -f "$pid_file"
        fi
    fi

    return 1
}

save_pid() {
    local name=$1
    local pid=$2
    echo "$pid" > "$PID_DIR/${name}.pid"
}

kill_process() {
    local name=$1
    local pid=$(get_pid "$name")

    if [ -n "$pid" ]; then
        print_info "Stopping $name (PID: $pid)..."
        kill "$pid" 2>/dev/null || true
        sleep 1

        # Force kill if still running
        if ps -p "$pid" &> /dev/null; then
            kill -9 "$pid" 2>/dev/null || true
        fi

        rm -f "$PID_DIR/${name}.pid"
        print_success "$name stopped"
    else
        print_info "$name is not running"
    fi
}

################################################################################
# Start Functions
################################################################################

start_frontend() {
    print_step "Starting frontend (Vite dev server)..."

    cd "$PROJECT_DIR"

    # Check if already running
    if get_pid "frontend" &> /dev/null; then
        print_warning "Frontend is already running"
        return 0
    fi

    # Start frontend
    npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
    local pid=$!
    save_pid "frontend" "$pid"

    # Wait for startup
    sleep 3

    if ps -p "$pid" &> /dev/null; then
        print_success "Frontend started on http://localhost:$FRONTEND_PORT (PID: $pid)"
        print_info "Logs: $LOG_DIR/frontend.log"
    else
        print_error "Frontend failed to start"
        print_info "Check logs: $LOG_DIR/frontend.log"
        return 1
    fi
}

start_backend() {
    print_step "Starting backend (Express server)..."

    cd "$PROJECT_DIR"

    # Check if already running
    if get_pid "backend" &> /dev/null; then
        print_warning "Backend is already running"
        return 0
    fi

    # Start backend
    npm run server > "$LOG_DIR/backend.log" 2>&1 &
    local pid=$!
    save_pid "backend" "$pid"

    # Wait for startup
    sleep 3

    if ps -p "$pid" &> /dev/null; then
        print_success "Backend started on http://localhost:$BACKEND_PORT (PID: $pid)"
        print_info "Logs: $LOG_DIR/backend.log"
    else
        print_error "Backend failed to start"
        print_info "Check logs: $LOG_DIR/backend.log"
        return 1
    fi
}

start_dev() {
    print_header
    echo -e "${CYAN}Starting ThreatFlow in Development Mode...${NC}\n"

    # Validate prerequisites
    if ! validate_all; then
        return 1
    fi

    echo ""
    print_step "Starting services..."
    echo ""

    start_backend
    start_frontend

    echo ""
    print_success "ThreatFlow started successfully!"
    echo ""
    print_info "Frontend: http://localhost:$FRONTEND_PORT"
    print_info "Backend:  http://localhost:$BACKEND_PORT"
    echo ""
    print_info "To stop: ./threatflow.sh stop"
    print_info "To view logs: tail -f $LOG_DIR/*.log"
}

start_prod() {
    print_header
    echo -e "${CYAN}Starting ThreatFlow in Production Mode (PM2)...${NC}\n"

    # Validate prerequisites
    if ! validate_all; then
        return 1
    fi

    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 is not installed"
        print_info "Install PM2: npm install -g pm2"
        return 1
    fi

    echo ""
    print_step "Building production bundle..."
    npm run build

    echo ""
    print_step "Starting with PM2..."

    # Start backend with PM2
    pm2 start server.ts --name threatflow-backend --interpreter ts-node

    # Start frontend with PM2 (serve built files)
    pm2 start npm --name threatflow-frontend -- run preview

    # Save PM2 configuration
    pm2 save

    echo ""
    print_success "ThreatFlow started in production mode!"
    echo ""
    print_info "Management commands:"
    print_info "  pm2 status              - Check status"
    print_info "  pm2 logs                - View logs"
    print_info "  pm2 restart all         - Restart all"
    print_info "  pm2 stop all            - Stop all"
    print_info "  ./threatflow.sh stop prod - Stop with this script"
}

################################################################################
# Stop Functions
################################################################################

stop_dev() {
    print_header
    echo -e "${CYAN}Stopping ThreatFlow Development Servers...${NC}\n"

    kill_process "frontend"
    kill_process "backend"

    # Also kill any orphaned processes
    print_step "Cleaning up orphaned processes..."
    pkill -f "vite" 2>/dev/null || true
    pkill -f "node.*server" 2>/dev/null || true

    echo ""
    print_success "ThreatFlow stopped"
}

stop_prod() {
    print_header
    echo -e "${CYAN}Stopping ThreatFlow Production Services (PM2)...${NC}\n"

    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 is not installed"
        return 1
    fi

    pm2 stop threatflow-frontend threatflow-backend 2>/dev/null || true
    pm2 delete threatflow-frontend threatflow-backend 2>/dev/null || true

    print_success "ThreatFlow stopped"
}

stop_all() {
    print_header
    echo -e "${CYAN}Stopping All ThreatFlow Processes...${NC}\n"

    # Stop dev processes
    kill_process "frontend"
    kill_process "backend"

    # Stop PM2 processes
    if command -v pm2 &> /dev/null; then
        pm2 stop threatflow-frontend threatflow-backend 2>/dev/null || true
        pm2 delete threatflow-frontend threatflow-backend 2>/dev/null || true
    fi

    # Kill any remaining processes
    print_step "Cleaning up all processes..."
    pkill -f "vite" 2>/dev/null || true
    pkill -f "node.*server" 2>/dev/null || true

    echo ""
    print_success "All ThreatFlow processes stopped"
}

################################################################################
# Status & Health Checks
################################################################################

show_status() {
    print_header
    echo -e "${CYAN}ThreatFlow Status${NC}\n"

    local frontend_pid=$(get_pid "frontend" 2>/dev/null || echo "")
    local backend_pid=$(get_pid "backend" 2>/dev/null || echo "")

    echo -e "${BLUE}Development Mode:${NC}"
    if [ -n "$frontend_pid" ]; then
        print_success "Frontend running (PID: $frontend_pid) - http://localhost:$FRONTEND_PORT"
    else
        print_info "Frontend not running"
    fi

    if [ -n "$backend_pid" ]; then
        print_success "Backend running (PID: $backend_pid) - http://localhost:$BACKEND_PORT"
    else
        print_info "Backend not running"
    fi

    echo ""
    echo -e "${BLUE}Production Mode (PM2):${NC}"
    if command -v pm2 &> /dev/null; then
        pm2 list | grep threatflow || print_info "No PM2 processes running"
    else
        print_info "PM2 not installed"
    fi

    echo ""
    echo -e "${BLUE}Port Status:${NC}"
    if lsof -i :$FRONTEND_PORT &> /dev/null; then
        print_info "Port $FRONTEND_PORT (frontend) in use"
    else
        print_info "Port $FRONTEND_PORT (frontend) available"
    fi

    if lsof -i :$BACKEND_PORT &> /dev/null; then
        print_info "Port $BACKEND_PORT (backend) in use"
    else
        print_info "Port $BACKEND_PORT (backend) available"
    fi
}

run_health_checks() {
    print_header
    echo -e "${CYAN}Running Health Checks...${NC}\n"

    print_step "Checking frontend..."
    if curl -s http://localhost:$FRONTEND_PORT &> /dev/null; then
        print_success "Frontend is responding"
    else
        print_error "Frontend is not responding"
    fi

    print_step "Checking backend..."
    if curl -s http://localhost:$BACKEND_PORT/api/health &> /dev/null; then
        print_success "Backend is responding"
    else
        print_error "Backend is not responding"
    fi

    print_step "Checking database..."
    if curl -s http://localhost:$BACKEND_PORT/api/health/database &> /dev/null; then
        print_success "Database connection OK"
    else
        print_warning "Database connection failed or not configured"
    fi

    print_step "Checking AI providers..."
    if curl -s http://localhost:$BACKEND_PORT/api/providers/status &> /dev/null; then
        print_success "AI provider check OK"
    else
        print_warning "AI provider check failed"
    fi

    echo ""
}

################################################################################
# Main Script
################################################################################

show_usage() {
    cat << EOF
${CYAN}ThreatFlow Management Script${NC}

Usage: $0 <command> [options]

Commands:
  start [mode]     Start ThreatFlow
                   Modes: dev (default), prod, frontend, backend

  stop [mode]      Stop ThreatFlow
                   Modes: dev (default), prod, all

  restart [mode]   Restart ThreatFlow

  status           Show current status

  health           Run health checks

  validate         Validate prerequisites only

  logs [service]   Show logs
                   Services: frontend, backend, all

Examples:
  $0 start                    # Start in development mode
  $0 start prod               # Start in production mode with PM2
  $0 start frontend           # Start frontend only
  $0 stop                     # Stop development servers
  $0 restart                  # Restart in development mode
  $0 status                   # Show status
  $0 health                   # Run health checks

EOF
}

main() {
    create_directories

    local command=${1:-""}
    local mode=${2:-"dev"}

    case "$command" in
        start)
            case "$mode" in
                dev)
                    start_dev
                    ;;
                prod)
                    start_prod
                    ;;
                frontend)
                    print_header
                    validate_all && echo "" && start_frontend
                    ;;
                backend)
                    print_header
                    validate_all && echo "" && start_backend
                    ;;
                *)
                    print_error "Invalid mode: $mode"
                    show_usage
                    exit 1
                    ;;
            esac
            ;;

        stop)
            case "$mode" in
                dev)
                    stop_dev
                    ;;
                prod)
                    stop_prod
                    ;;
                all)
                    stop_all
                    ;;
                *)
                    print_error "Invalid mode: $mode"
                    show_usage
                    exit 1
                    ;;
            esac
            ;;

        restart)
            print_header
            echo -e "${CYAN}Restarting ThreatFlow...${NC}\n"

            case "$mode" in
                dev)
                    stop_dev
                    sleep 2
                    start_dev
                    ;;
                prod)
                    if command -v pm2 &> /dev/null; then
                        pm2 restart threatflow-frontend threatflow-backend
                        print_success "ThreatFlow restarted"
                    else
                        print_error "PM2 not installed"
                        exit 1
                    fi
                    ;;
                *)
                    print_error "Invalid mode: $mode"
                    show_usage
                    exit 1
                    ;;
            esac
            ;;

        status)
            show_status
            ;;

        health)
            run_health_checks
            ;;

        validate)
            validate_all
            ;;

        logs)
            local service=${2:-"all"}
            case "$service" in
                frontend)
                    tail -f "$LOG_DIR/frontend.log"
                    ;;
                backend)
                    tail -f "$LOG_DIR/backend.log"
                    ;;
                all)
                    tail -f "$LOG_DIR"/*.log
                    ;;
                *)
                    print_error "Invalid service: $service"
                    show_usage
                    exit 1
                    ;;
            esac
            ;;

        -h|--help|help)
            show_usage
            ;;

        *)
            print_error "Invalid command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
