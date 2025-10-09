# 🚀 ThreatFlow - Professional Cybersecurity Intelligence Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D%2018.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue)](https://reactjs.org/)

> **Enterprise-grade threat intelligence platform** that transforms cybersecurity articles and incident reports into interactive attack flow visualizations using the MITRE ATT&CK framework.

![ThreatFlow Demo](docs/images/threatflow-demo.png)

## ✨ **Key Features**

### 🎯 **Core Capabilities**
- **Real-time AI Analysis**: Claude, OpenAI, Ollama, and OpenRouter integration
- **Interactive Visualizations**: 2D/3D flow diagrams with advanced filtering
- **MITRE ATT&CK Integration**: Automatic technique mapping and documentation
- **Multi-format Export**: PNG, STIX 2.1, Attack Flow Builder (AFB) formats
- **Collaborative Analysis**: Real-time multi-analyst workflows

### 🏢 **Enterprise Features** 
- **Authentication & RBAC**: JWT-based security with role management
- **SIEM Integration**: Splunk, QRadar, Azure Sentinel connectors
- **Database Persistence**: PostgreSQL with connection pooling
- **Advanced Analytics**: IOC enrichment and threat intelligence feeds
- **Case Management**: Investigation workflows and alert triage

### 🎨 **Advanced Visualization**
- **3D Flow Views**: Three.js-powered immersive attack chain visualization
- **Split-screen Comparison**: Side-by-side flow analysis
- **Hierarchical Views**: Campaign-based threat actor analysis
- **Interactive Legends**: MITRE ATT&CK technique explanations
- **Story Mode**: Cinematic playback of attack sequences

## 🏗️ **Project Architecture**

```
threatviz/
├── 📁 src/
│   ├── 🎯 features/           # Feature-based architecture
│   │   ├── app/               # Core application (AppBar, Search, Settings)
│   │   ├── auth/              # Enterprise authentication
│   │   ├── flow-analysis/     # Attack flow visualization & AI analysis
│   │   ├── flow-export/       # Export functionality (PNG, STIX, AFB)
│   │   ├── flow-storage/      # Save/load with metadata
│   │   ├── ioc-analysis/      # IOC/IOA extraction & enrichment
│   │   ├── threat-intelligence/ # Threat intel feeds integration
│   │   ├── siem/              # SIEM integrations
│   │   └── ...                # Additional enterprise features
│   ├── 🔧 shared/             # Shared utilities and components
│   │   ├── components/        # Reusable UI components
│   │   ├── services/          # Business logic services
│   │   ├── context/           # React context providers
│   │   ├── hooks/             # Custom React hooks
│   │   └── utils/             # Helper functions
│   └── 🗂️ integrations/       # External service integrations
├── 📋 docs/                   # Documentation
├── 🧪 scripts/                # Utility scripts
├── 🖼️ public/                 # Static assets
├── 🛠️ server.ts              # Express server with security middleware
└── 📦 Configuration files
```

### 🏛️ **Architectural Patterns**

- **Feature-First Organization**: Each feature is self-contained with components, services, and types
- **Service Layer Architecture**: Business logic separated from UI components
- **Provider Pattern**: Centralized state management with React Context
- **Repository Pattern**: Abstract data access with multiple storage backends
- **Observer Pattern**: Real-time updates and streaming AI analysis

## 🚀 **Quick Start**

### **Prerequisites**

- **Node.js** ≥ 18.0.0 ([Download](https://nodejs.org/))
- **npm** ≥ 8.0.0 (included with Node.js)
- **PostgreSQL** ≥ 13 ([Download](https://www.postgresql.org/download/)) - *Optional, for enterprise features*

### **Installation**

```bash
# 1. Clone the repository
git clone https://github.com/your-org/threatflow.git
cd threatflow

# 2. Install dependencies
npm install

# 3. Set up environment configuration
cp .env.example .env
# Edit .env with your API keys and settings

# 4. Start development server
npm run dev:full
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

### **Basic Configuration**

Add your AI provider API keys to `.env`:

```bash
# Required: Choose at least one AI provider
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Optional: Local AI with Ollama
OLLAMA_BASE_URL=http://localhost:11434
```

## 🛠️ **Development Setup**

### **Development Commands**

```bash
# Development
npm run dev              # Start frontend only (Vite dev server)
npm run server           # Start backend only (Express server)
npm run dev:full         # Start both frontend and backend (recommended)

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues automatically
npm run format           # Format code with Prettier
npm run type-check       # TypeScript type checking
npm run validate         # Run all quality checks

# Build & Deploy
npm run build            # Production build
npm run preview          # Preview production build
npm start                # Start production server

# Utilities
npm run deps:update      # Update dependencies safely
npm run audit-security   # Security audit
npm run clean           # Clean cache and build artifacts
```

### **Code Quality Setup**

```bash
# Install enhanced development tools
npm install --save-dev @typescript-eslint/eslint-plugin-security
npm install --save-dev eslint-plugin-import
npm install --save-dev eslint-plugin-unused-imports
npm install --save-dev prettier

# Set up pre-commit hooks (optional but recommended)
pip install pre-commit
pre-commit install

# Use improved configurations
cp .eslintrc.improved.json .eslintrc.json
cp .prettierrc.json .prettierrc
```

## 🏢 **Enterprise Setup**

### **Database Configuration**

1. **Install PostgreSQL** and create a database:
```sql
-- Connect as postgres user
sudo -u postgres psql

-- Create user and database
CREATE USER threatflow_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE threatflow_db OWNER threatflow_user;
GRANT ALL PRIVILEGES ON DATABASE threatflow_db TO threatflow_user;
```

2. **Update environment variables**:
```bash
DATABASE_URL=postgresql://threatflow_user:your_secure_password@localhost:5432/threatflow_db

# Authentication secrets (generate with: openssl rand -hex 32)
JWT_SECRET=your_super_secure_jwt_secret_key_change_this_in_production
SESSION_SECRET=your_super_secure_session_secret_change_this_in_production
```

3. **Initialize demo data**:
```bash
npm run init-demo
```

### **SIEM Integration**

Configure your SIEM platform in `.env`:

```bash
# Splunk Configuration
SPLUNK_HOST=your-splunk-instance.com
SPLUNK_PORT=8089
SPLUNK_USERNAME=your_splunk_user
SPLUNK_PASSWORD=your_splunk_password
```

### **Picus Security Integration**

For automated threat validation:

```bash
PICUS_BASE_URL=https://your-picus-instance.picussecurity.com
PICUS_API_TOKEN=your_picus_api_token

# Optional OAuth credentials (alternative to token)
PICUS_CLIENT_ID=your_client_id
PICUS_CLIENT_SECRET=your_client_secret
```

## 📖 **Usage Guide**

### **Basic Workflow**

1. **Input Analysis**: Paste URL, text content, or upload PDF
2. **AI Processing**: Choose your preferred AI provider (Claude, GPT-4, etc.)
3. **Flow Generation**: Real-time attack flow visualization
4. **Interactive Analysis**: Explore nodes, techniques, and relationships
5. **Export Results**: Save as PNG, STIX 2.1, or Attack Flow Bundle

### **Advanced Features**

#### **3D Visualization Mode**
```typescript
// Enable advanced visualization features
const [visualizationMode, setVisualizationMode] = useState<'2d' | '3d' | 'split'>('3d');

// Configure 3D scene
<Flow3DView
  nodes={filteredNodes}
  theme="dark"
  enablePhysics={true}
  cameraControls={true}
/>
```

#### **Collaborative Analysis**
```typescript
// Real-time collaboration setup
const collaborationConfig = {
  roomId: 'analysis-session-1',
  userId: 'analyst-1',
  permissions: ['view', 'edit', 'comment']
};
```

#### **Custom Integrations**
```typescript
// Extend with custom SIEM integration
class CustomSIEMIntegration implements SIEMIntegration {
  async queryThreats(iocs: IOC[]): Promise<ThreatData[]> {
    // Your custom SIEM API calls
  }
}
```

## 🧪 **Testing**

```bash
# Add your preferred testing framework
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom

# Run tests
npm test

# Test coverage
npm run test:coverage

# E2E testing
npm install --save-dev playwright
npm run test:e2e
```

## 📊 **Performance Optimization**

### **Bundle Size Monitoring**
```bash
# Analyze bundle size
npm run build
npm install --global @next/bundle-analyzer
npx bundle-analyzer
```

### **Lazy Loading Implementation**
- ✅ Heavy visualization components are lazy-loaded
- ✅ Dialog components load on-demand  
- ✅ 3D rendering libraries load when needed

## 🔒 **Security Considerations**

### **Security Features**
- **Server-side API Processing**: All AI API calls happen server-side
- **SSRF Protection**: URL validation and secure fetch utilities
- **Rate Limiting**: Configurable limits for API endpoints
- **Input Validation**: Comprehensive request validation
- **Secure Headers**: Helmet.js security headers
- **CORS Protection**: Configurable allowed origins

### **Security Best Practices**
- API keys stored server-side only (never in client)
- All user inputs validated and sanitized
- Regular security audits with `npm audit`
- CSP headers prevent XSS attacks
- Session management with secure JWT tokens

## 🤝 **Contributing**

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Follow code standards**: `npm run validate`
4. **Commit changes**: `git commit -m 'Add amazing feature'`
5. **Push to branch**: `git push origin feature/amazing-feature`
6. **Open Pull Request**

### **Development Standards**
- **TypeScript** for all new code
- **ESLint + Prettier** for code formatting
- **Conventional Commits** for commit messages
- **Component-first architecture** for UI development
- **Service layer pattern** for business logic

## 📋 **Troubleshooting**

### **Common Issues**

#### **Port Already in Use**
```bash
# Kill processes on default ports
pkill -f "npm run"
lsof -ti:3001 | xargs kill
lsof -ti:5173 | xargs kill

# Or use alternative ports
PORT=3002 npm run server
```

#### **Database Connection Issues**
```bash
# Check PostgreSQL service
sudo systemctl status postgresql
sudo systemctl start postgresql

# Test connection
psql -h localhost -U threatflow_user -d threatflow_db
```

#### **API Key Issues**
- Verify API keys in `.env` are correct
- Check API key permissions and quotas
- Review server logs: `npm run server`

#### **Build Failures**
```bash
# Clear all caches
npm run clean
rm -rf node_modules package-lock.json
npm install
```

### **Performance Issues**
- Check bundle size with build analysis
- Enable React DevTools Profiler
- Monitor memory usage during large flow analysis
- Consider using simplified node rendering for large datasets

## 📞 **Support & Documentation**

- 📚 **Documentation**: [Full Documentation](docs/)
- 🐛 **Issues**: [GitHub Issues](https://github.com/your-org/threatflow/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/your-org/threatflow/discussions)
- 📧 **Enterprise Support**: enterprise@threatflow.io

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **MITRE Corporation** for the ATT&CK framework
- **React Flow** for excellent graph visualization
- **Three.js** for 3D rendering capabilities
- **Anthropic** for Claude AI integration
- **Material-UI** for professional design components

---

**Built with ❤️ for cybersecurity professionals worldwide**