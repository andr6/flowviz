# ThreatFlow Management Script

The `threatflow.sh` script provides a comprehensive solution for managing the ThreatFlow application lifecycle with automatic prerequisite validation, health checks, and process management.

## Quick Start

```bash
# Make script executable (first time only)
chmod +x threatflow.sh

# Start ThreatFlow in development mode
./threatflow.sh start

# Check status
./threatflow.sh status

# Stop ThreatFlow
./threatflow.sh stop
```

## Commands

### Start

Start ThreatFlow with different modes:

```bash
# Development mode (default) - both frontend and backend
./threatflow.sh start
./threatflow.sh start dev

# Production mode with PM2
./threatflow.sh start prod

# Frontend only
./threatflow.sh start frontend

# Backend only
./threatflow.sh start backend
```

**Development Mode**:
- Starts both frontend (Vite) and backend (Express) servers
- Logs to `logs/frontend.log` and `logs/backend.log`
- Stores PIDs in `.pids/` directory
- Runs prerequisite validation before starting

**Production Mode**:
- Uses PM2 for process management
- Builds production bundle first
- Auto-restart on failure
- Better for production deployments

### Stop

Stop running services:

```bash
# Stop development servers (default)
./threatflow.sh stop
./threatflow.sh stop dev

# Stop production PM2 processes
./threatflow.sh stop prod

# Stop all processes (dev + prod + orphaned)
./threatflow.sh stop all
```

### Restart

Restart services:

```bash
# Restart in development mode
./threatflow.sh restart

# Restart production PM2 processes
./threatflow.sh restart prod
```

### Status

Show current application status:

```bash
./threatflow.sh status
```

Output includes:
- Development mode processes (frontend/backend)
- Production PM2 processes
- Port availability status

### Health Checks

Run comprehensive health checks:

```bash
./threatflow.sh health
```

Checks:
- Frontend HTTP endpoint
- Backend API health endpoint
- Database connectivity
- AI provider status

### Validate Prerequisites

Validate all prerequisites without starting services:

```bash
./threatflow.sh validate
```

Validates:
- Node.js version (>= 18.0.0)
- npm version (>= 9.0.0)
- PostgreSQL installation and status
- Environment file (.env)
- Required environment variables
- npm dependencies
- Database connectivity
- Port availability
- Ollama availability (if configured)

### View Logs

Tail application logs:

```bash
# All logs
./threatflow.sh logs all

# Frontend logs only
./threatflow.sh logs frontend

# Backend logs only
./threatflow.sh logs backend
```

## NPM Integration

The script is integrated with npm for convenience:

```bash
# Using npm run
npm run manage                  # Show help
npm run manage:start            # Start in dev mode
npm run manage:stop             # Stop dev mode
npm run manage:restart          # Restart dev mode
npm run manage:status           # Show status
npm run manage:health           # Health checks
npm run manage:validate         # Validate prerequisites
```

## Prerequisites Validation

The script automatically validates the following prerequisites before starting:

### Critical (Must Pass)
✅ **Node.js** - Version 18.0.0 or higher
✅ **npm** - Version 9.0.0 or higher
✅ **.env file** - Must exist
✅ **npm dependencies** - Must be installed

### Warnings (Non-critical)
⚠️ **PostgreSQL** - Required for enterprise features
⚠️ **Database URL** - Required for enterprise features
⚠️ **JWT Secrets** - Required for authentication
⚠️ **AI Provider** - At least one must be configured (Claude or Ollama)
⚠️ **Ollama** - Optional local AI provider

## File Locations

**PID Files**: `.pids/`
- `frontend.pid` - Frontend process ID
- `backend.pid` - Backend process ID

**Log Files**: `logs/`
- `frontend.log` - Frontend server logs
- `backend.log` - Backend server logs

**Configuration**:
- `.env` - Environment variables
- `package.json` - npm scripts integration

## Port Configuration

**Default Ports**:
- **Frontend**: 5173 (Vite dev server)
- **Backend**: 3001 (Express server)

Ports are configurable via environment variables:
```bash
# .env
VITE_PORT=5173
PORT=3001
```

## Production Deployment with PM2

For production deployments, use PM2 mode:

```bash
# First time setup
npm install -g pm2

# Start in production mode
./threatflow.sh start prod

# PM2 commands
pm2 status                      # Check status
pm2 logs                        # View logs
pm2 restart threatflow-*        # Restart all
pm2 stop threatflow-*           # Stop all
pm2 delete threatflow-*         # Remove all

# Auto-start on system boot
pm2 startup
pm2 save
```

## Troubleshooting

### Ports Already in Use

If ports are already in use:

```bash
# Check what's using the ports
lsof -i :5173
lsof -i :3001

# Stop all processes
./threatflow.sh stop all

# Kill specific port
kill -9 $(lsof -t -i:5173)
```

### Validation Failures

**Node.js version too old**:
```bash
# Install latest Node.js
# Visit: https://nodejs.org
```

**Dependencies not installed**:
```bash
npm install
```

**Environment file missing**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

**PostgreSQL not running**:
```bash
# Start PostgreSQL
sudo systemctl start postgresql

# Check status
sudo systemctl status postgresql
```

**Ollama not accessible**:
```bash
# Start Ollama
ollama serve

# Pull required model
ollama pull llama3.2-vision:latest
```

### Process Management Issues

**Orphaned processes**:
```bash
# Kill all ThreatFlow processes
./threatflow.sh stop all

# Or manually
pkill -f "vite"
pkill -f "node.*server"
```

**PID file mismatch**:
```bash
# Remove stale PID files
rm -rf .pids/*.pid

# Restart
./threatflow.sh start
```

### Log Analysis

**Check logs for errors**:
```bash
# View recent errors
tail -100 logs/frontend.log
tail -100 logs/backend.log

# Follow logs in real-time
./threatflow.sh logs all

# Search for specific errors
grep -i error logs/*.log
```

## Environment Variables

The script checks for these environment variables:

### Required (Critical)
- At least one AI provider:
  - `ANTHROPIC_API_KEY` - Claude API key (starts with `sk-ant-`)
  - `OLLAMA_BASE_URL` - Ollama server URL

### Required (Enterprise Features)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - Refresh token secret

### Optional
- `PORT` - Backend port (default: 3001)
- `VITE_PORT` - Frontend port (default: 5173)
- `NODE_ENV` - Environment (development/production)
- `OLLAMA_MODEL` - Ollama model name
- `CLAUDE_MODEL` - Claude model name

## Health Check Endpoints

The script tests these endpoints:

**Frontend**:
- `http://localhost:5173`

**Backend**:
- `http://localhost:3001/api/health` - General health
- `http://localhost:3001/api/health/database` - Database connectivity
- `http://localhost:3001/api/providers/status` - AI provider status

## Exit Codes

- `0` - Success
- `1` - Validation failure or error
- `130` - Interrupted by user (Ctrl+C)

## Best Practices

### Development Workflow

```bash
# 1. Validate environment
./threatflow.sh validate

# 2. Start development servers
./threatflow.sh start

# 3. Make changes and test

# 4. Check status if issues
./threatflow.sh status

# 5. View logs for debugging
./threatflow.sh logs all

# 6. Stop when done
./threatflow.sh stop
```

### Production Workflow

```bash
# 1. Validate prerequisites
./threatflow.sh validate

# 2. Build and start with PM2
./threatflow.sh start prod

# 3. Check PM2 status
pm2 status

# 4. Monitor logs
pm2 logs

# 5. Set up auto-start
pm2 startup
pm2 save
```

### CI/CD Integration

```bash
# In your CI/CD pipeline
#!/bin/bash
set -e

# Validate environment
./threatflow.sh validate

# Run tests
npm test

# Build production bundle
npm run build

# Deploy with PM2
./threatflow.sh start prod
```

## Advanced Usage

### Custom Port Configuration

```bash
# Start with custom ports
VITE_PORT=8080 PORT=8081 ./threatflow.sh start
```

### Environment-specific Configuration

```bash
# Development
NODE_ENV=development ./threatflow.sh start

# Production
NODE_ENV=production ./threatflow.sh start prod
```

### Automated Monitoring

```bash
# Create a monitoring script
#!/bin/bash
while true; do
    ./threatflow.sh health
    sleep 60
done
```

### Graceful Shutdown

```bash
# The script handles signals properly
# Press Ctrl+C for graceful shutdown
# Or send SIGTERM
kill -TERM $(cat .pids/backend.pid)
```

## Security Considerations

⚠️ **Never commit sensitive data**:
- `.env` file (contains API keys)
- `logs/` directory (may contain sensitive data)
- `.pids/` directory

🔒 **Protect production deployments**:
- Use environment-specific `.env` files
- Restrict file permissions: `chmod 600 .env`
- Use secrets management for API keys
- Enable HTTPS in production
- Configure firewall rules

## Support

For issues or questions:

1. Run `./threatflow.sh validate` to check prerequisites
2. Check logs: `./threatflow.sh logs all`
3. View status: `./threatflow.sh status`
4. See main README.md troubleshooting section
5. Open GitHub issue with validation output

## Contributing

Improvements to the management script are welcome!

Location: `/threatflow.sh`

To test changes:
```bash
# Make changes to threatflow.sh
chmod +x threatflow.sh

# Test validation
./threatflow.sh validate

# Test start/stop
./threatflow.sh start
./threatflow.sh status
./threatflow.sh stop
```

## Changelog

**v1.0.0** (Initial Release)
- ✨ Start/stop/restart commands
- ✨ Comprehensive prerequisite validation
- ✨ Health check system
- ✨ PM2 production mode support
- ✨ Log viewing functionality
- ✨ Port availability checks
- ✨ Database connectivity testing
- ✨ AI provider validation
- ✨ npm integration
- ✨ Color-coded output
- ✨ PID management
- ✨ Process cleanup

---

**Built with ❤️ for the cybersecurity community**

For more information, see the main [README.md](../README.md)
