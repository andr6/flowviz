# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

**Development:**
- `npm run dev:full` - **Recommended**: Start both frontend (port 5173) and backend proxy (port 3001)
- `npm run dev` - Start frontend only (Vite dev server)
- `npm run server` - Start backend proxy only
- `npm run build` - TypeScript compilation + Vite build with production optimizations
- `npm run lint` - ESLint with max 0 warnings
- `npm run preview` - Preview production build
- `npm run init-demo` - Initialize database with demo user (requires PostgreSQL setup)

**Testing:** Check the codebase to determine testing approach - no standard test commands found in package.json.

## Project Architecture

**ThreatFlow** is a professional cybersecurity threat intelligence platform that transforms security articles and incident reports into interactive attack flow visualizations using the MITRE ATT&CK framework.

### Core Technologies
- **Frontend**: React 18 + TypeScript, Material-UI, React Flow for visualization, Vite build
- **Backend**: Express.js proxy server with security features (CORS, Helmet, rate limiting)
- **AI Integration**: Multiple providers (Claude, Ollama, OpenAI, OpenRouter) with server-side streaming
- **Database**: PostgreSQL for enterprise features and authentication
- **Architecture Pattern**: Feature-based with shared components

### Key Directories

**`src/features/`** - Feature-based architecture with independent modules:
- `app/` - Core application components (AppBar, SearchForm, Settings)
- `auth/` - Enterprise authentication system
- `flow-analysis/` - Attack flow visualization and AI analysis
- `flow-export/` - Export functionality (PNG, STIX 2.1, AFB)
- `flow-storage/` - Save/load functionality with metadata
- `ioc-analysis/` - IOC/IOA extraction and analysis
- `threat-intelligence/` - Threat intel feeds integration
- `siem/` - SIEM integrations
- Additional enterprise features: alert-triage, case-management, investigation, etc.

**`src/shared/`** - Shared utilities and components:
- `components/` - Professional UI component system with ThreatFlow theme
- `services/` - AI providers, authentication, database, storage services
- `theme/` - Professional design system (`threatflow-theme.ts`)
- `utils/` - Shared utilities including logging

**Root files:**
- `server.ts` - Express proxy with security middleware, AI streaming, enterprise services
- `security-utils.js` - SSRF protection, rate limiting, secure fetch utilities

### Key Features
- **Real-time streaming**: Server-side streaming with multiple AI providers
- **Enterprise security**: Authentication, RBAC, SIEM integrations
- **Multi-provider AI**: Claude, Ollama, OpenAI, OpenRouter support
- **Professional UI**: Material-UI with custom ThreatFlow theme
- **Attack flow visualization**: React Flow with MITRE ATT&CK framework
- **Export capabilities**: PNG, STIX 2.1, Attack Flow Builder formats

### Environment Configuration
Required: AI provider configuration (see `.env.example`)
- `ANTHROPIC_API_KEY` for Claude
- `DATABASE_URL` for PostgreSQL (enterprise features)
- Optional: Ollama, OpenAI, OpenRouter configurations
- Security settings: rate limits, CORS origins, size limits

### Development Notes
- **Feature isolation**: Each feature has its own components, services, and types
- **Enterprise services**: Auto-initialize on server startup (database, SIEM, etc.)
- **Security-first**: Server-side API processing, SSRF protection, rate limiting
- **Streaming architecture**: Real-time visualization updates via SSE
- **Professional theming**: Consistent ThreatFlow brand across all components
- Console statements are automatically removed in production builds

### Adding Features
1. Create new feature directory in `src/features/`
2. Follow existing patterns: components/, services/, types/ subdirectories
3. Add enterprise services to server initialization if needed
4. Follow ThreatFlow theme system for consistency
5. Add API routes to `server.ts` if backend integration required