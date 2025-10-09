import { Node, Edge } from 'reactflow';

export interface InteractiveHtmlExportOptions {
  title: string;
  description?: string;
  author?: string;
  organization?: string;
  theme: 'light' | 'dark' | 'auto';
  includeSearch: boolean;
  includeFilters: boolean;
  includeTimeline: boolean;
  includeZoomControls: boolean;
  includeLegend: boolean;
  includeMetadata: boolean;
  enableAnimation: boolean;
  enableTooltips: boolean;
  enableSelection: boolean;
  enableExport: boolean;
  customCSS?: string;
  customJS?: string;
  branding?: BrandingOptions;
  analytics?: AnalyticsOptions;
  security?: SecurityOptions;
}

export interface BrandingOptions {
  logo?: string;
  logoUrl?: string;
  companyName?: string;
  customColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  footer?: string;
}

export interface AnalyticsOptions {
  enabled: boolean;
  provider: 'google' | 'custom';
  trackingId?: string;
  customEvents: boolean;
}

export interface SecurityOptions {
  requirePassword: boolean;
  password?: string;
  allowDownload: boolean;
  allowSharing: boolean;
  watermark?: string;
  expirationDate?: Date;
}

export interface HtmlExportResult {
  success: boolean;
  htmlContent?: string;
  filePath?: string;
  blob?: Blob;
  assets: {
    css: string[];
    js: string[];
    images: string[];
  };
  metadata: {
    fileSize: number;
    generatedAt: number;
    version: string;
    nodeCount: number;
    edgeCount: number;
  };
  error?: string;
}

const DEFAULT_OPTIONS: InteractiveHtmlExportOptions = {
  title: 'Threat Flow Analysis',
  theme: 'light',
  includeSearch: true,
  includeFilters: true,
  includeTimeline: false,
  includeZoomControls: true,
  includeLegend: true,
  includeMetadata: true,
  enableAnimation: true,
  enableTooltips: true,
  enableSelection: true,
  enableExport: false,
};

// CSS Templates
const CSS_TEMPLATES = {
  light: `
    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f8f9fa;
      --text-primary: #2c3e50;
      --text-secondary: #6c757d;
      --border-color: #dee2e6;
      --shadow: 0 2px 4px rgba(0,0,0,0.1);
      --primary-color: #3498db;
      --success-color: #27ae60;
      --warning-color: #f39c12;
      --danger-color: #e74c3c;
    }
  `,
  dark: `
    :root {
      --bg-primary: #1a1a1a;
      --bg-secondary: #2d3748;
      --text-primary: #e2e8f0;
      --text-secondary: #a0aec0;
      --border-color: #4a5568;
      --shadow: 0 2px 4px rgba(0,0,0,0.3);
      --primary-color: #4299e1;
      --success-color: #48bb78;
      --warning-color: #ed8936;
      --danger-color: #f56565;
    }
  `,
  auto: `
    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f8f9fa;
      --text-primary: #2c3e50;
      --text-secondary: #6c757d;
      --border-color: #dee2e6;
      --shadow: 0 2px 4px rgba(0,0,0,0.1);
      --primary-color: #3498db;
      --success-color: #27ae60;
      --warning-color: #f39c12;
      --danger-color: #e74c3c;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg-primary: #1a1a1a;
        --bg-secondary: #2d3748;
        --text-primary: #e2e8f0;
        --text-secondary: #a0aec0;
        --border-color: #4a5568;
        --shadow: 0 2px 4px rgba(0,0,0,0.3);
        --primary-color: #4299e1;
        --success-color: #48bb78;
        --warning-color: #ed8936;
        --danger-color: #f56565;
      }
    }
  `,
};

const BASE_CSS = `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
}

.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.header {
  background-color: var(--bg-secondary);
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--border-color);
  box-shadow: var(--shadow);
}

.header h1 {
  color: var(--text-primary);
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.header .subtitle {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 300px;
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
  padding: 1rem;
}

.visualization {
  flex: 1;
  position: relative;
  background-color: var(--bg-primary);
}

.controls {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-panel {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  box-shadow: var(--shadow);
  min-width: 200px;
}

.control-panel h3 {
  margin-bottom: 0.75rem;
  font-size: 1rem;
  color: var(--text-primary);
}

.search-box {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.filter-group {
  margin-bottom: 1rem;
}

.filter-group label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.checkbox-item input[type="checkbox"] {
  accent-color: var(--primary-color);
}

.legend {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 3px;
}

.legend-label {
  font-size: 0.85rem;
  color: var(--text-primary);
}

.tooltip {
  position: absolute;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 0.85rem;
  box-shadow: var(--shadow);
  max-width: 300px;
  z-index: 1001;
  pointer-events: none;
}

.node {
  cursor: pointer;
  transition: all 0.2s ease;
}

.node:hover {
  filter: brightness(1.1);
  stroke-width: 3;
}

.node.selected {
  stroke: var(--primary-color);
  stroke-width: 3;
}

.node.filtered {
  opacity: 0.3;
}

.edge {
  transition: all 0.2s ease;
}

.edge:hover {
  stroke-width: 3;
}

.edge.selected {
  stroke: var(--primary-color);
  stroke-width: 3;
}

.edge.filtered {
  opacity: 0.3;
}

.zoom-controls {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.zoom-btn {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.zoom-btn:hover {
  background-color: var(--primary-color);
  color: white;
}

.metadata-panel {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
}

.metadata-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
}

.metadata-label {
  color: var(--text-secondary);
}

.metadata-value {
  color: var(--text-primary);
  font-weight: 500;
}

.footer {
  background-color: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  padding: 1rem 2rem;
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    max-height: 300px;
  }
  
  .controls {
    position: static;
    margin: 1rem;
  }
}
`;

class InteractiveHtmlExportService {
  private options: InteractiveHtmlExportOptions = { ...DEFAULT_OPTIONS };

  // Set export options
  setOptions(options: Partial<InteractiveHtmlExportOptions>): void {
    this.options = { ...this.options, ...options };
  }

  getOptions(): InteractiveHtmlExportOptions {
    return { ...this.options };
  }

  // Export flow as interactive HTML
  async exportFlow(
    nodes: Node[],
    edges: Edge[],
    options?: Partial<InteractiveHtmlExportOptions>
  ): Promise<HtmlExportResult> {
    const exportOptions = { ...this.options, ...options };
    
    try {
      const htmlContent = await this.generateHtml(nodes, edges, exportOptions);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      
      return {
        success: true,
        htmlContent,
        blob,
        assets: {
          css: ['embedded'],
          js: ['embedded'],
          images: [],
        },
        metadata: {
          fileSize: blob.size,
          generatedAt: Date.now(),
          version: '1.0',
          nodeCount: nodes.length,
          edgeCount: edges.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
        assets: { css: [], js: [], images: [] },
        metadata: {
          fileSize: 0,
          generatedAt: Date.now(),
          version: '1.0',
          nodeCount: nodes.length,
          edgeCount: edges.length,
        },
      };
    }
  }

  // Generate complete HTML document
  private async generateHtml(
    nodes: Node[],
    edges: Edge[],
    options: InteractiveHtmlExportOptions
  ): Promise<string> {
    const css = this.generateCSS(options);
    const js = this.generateJavaScript(nodes, edges, options);
    const body = this.generateBody(nodes, edges, options);
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(options.title)}</title>
    ${options.description ? `<meta name="description" content="${this.escapeHtml(options.description)}">` : ''}
    ${options.author ? `<meta name="author" content="${this.escapeHtml(options.author)}">` : ''}
    ${options.organization ? `<meta name="publisher" content="${this.escapeHtml(options.organization)}">` : ''}
    <meta name="generator" content="ThreatFlow Interactive Export">
    <meta name="robots" content="noindex, nofollow">
    <style>
        ${css}
        ${options.customCSS || ''}
    </style>
    ${this.generateAnalytics(options.analytics)}
</head>
<body>
    ${body}
    <script>
        ${js}
        ${options.customJS || ''}
    </script>
    ${this.generateSecurity(options.security)}
</body>
</html>`;

    return html;
  }

  // Generate CSS styles
  private generateCSS(options: InteractiveHtmlExportOptions): string {
    const themeCSS = CSS_TEMPLATES[options.theme] || CSS_TEMPLATES.light;
    let customColors = '';
    
    if (options.branding?.customColors) {
      customColors = `
        :root {
          --primary-color: ${options.branding.customColors.primary} !important;
          --secondary-color: ${options.branding.customColors.secondary} !important;
          --accent-color: ${options.branding.customColors.accent} !important;
        }
      `;
    }

    return `${themeCSS}\n${BASE_CSS}\n${customColors}`;
  }

  // Generate JavaScript functionality
  private generateJavaScript(
    nodes: Node[],
    edges: Edge[],
    options: InteractiveHtmlExportOptions
  ): string {
    const nodeData = JSON.stringify(nodes.map(node => ({
      id: node.id,
      position: node.position,
      data: node.data,
      width: node.width || 150,
      height: node.height || 50,
    })));

    const edgeData = JSON.stringify(edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      data: edge.data,
      label: edge.label,
    })));

    return `
// Flow data
const nodes = ${nodeData};
const edges = ${edgeData};
const options = ${JSON.stringify(options)};

// State management
let selectedNodes = new Set();
let selectedEdges = new Set();
let filteredTactics = new Set();
let searchQuery = '';
let zoomLevel = 1;
let panX = 0;
let panY = 0;

// Initialize the visualization
document.addEventListener('DOMContentLoaded', function() {
    initializeVisualization();
    setupEventListeners();
    ${options.includeSearch ? 'initializeSearch();' : ''}
    ${options.includeFilters ? 'initializeFilters();' : ''}
    ${options.includeLegend ? 'generateLegend();' : ''}
    ${options.includeMetadata ? 'generateMetadata();' : ''}
});

function initializeVisualization() {
    const svg = createSVG();
    const visualization = document.querySelector('.visualization');
    visualization.appendChild(svg);
    
    renderNodes(svg);
    renderEdges(svg);
    
    // Center the view
    centerView();
}

function createSVG() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('id', 'flow-svg');
    
    // Add definitions for markers
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = \`
        <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                refX="9" refY="3.5" orient="auto" markerUnits="strokeWidth">
            <polygon points="0 0, 10 3.5, 0 7" fill="#7f8c8d" />
        </marker>
    \`;
    svg.appendChild(defs);
    
    // Add main group for transformations
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', 'main-group');
    svg.appendChild(g);
    
    return svg;
}

function renderNodes(svg) {
    const g = svg.querySelector('#main-group');
    
    nodes.forEach(node => {
        const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        nodeGroup.setAttribute('class', 'node');
        nodeGroup.setAttribute('id', 'node-' + node.id);
        nodeGroup.setAttribute('data-tactic', node.data?.tactic || 'unknown');
        
        // Node rectangle
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', node.position.x);
        rect.setAttribute('y', node.position.y);
        rect.setAttribute('width', node.width);
        rect.setAttribute('height', node.height);
        rect.setAttribute('rx', 8);
        rect.setAttribute('ry', 8);
        rect.setAttribute('fill', getTacticColor(node.data?.tactic));
        rect.setAttribute('stroke', '#2c3e50');
        rect.setAttribute('stroke-width', 2);
        
        // Node label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', node.position.x + node.width / 2);
        text.setAttribute('y', node.position.y + node.height / 2);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('fill', '#ffffff');
        text.setAttribute('font-size', '12px');
        text.setAttribute('font-family', 'Arial, sans-serif');
        text.textContent = node.data?.label || node.data?.name || node.id;
        
        nodeGroup.appendChild(rect);
        nodeGroup.appendChild(text);
        
        // Add event listeners
        nodeGroup.addEventListener('click', () => selectNode(node.id));
        ${options.enableTooltips ? `nodeGroup.addEventListener('mouseenter', (e) => showTooltip(e, node));` : ''}
        ${options.enableTooltips ? `nodeGroup.addEventListener('mouseleave', hideTooltip);` : ''}
        
        g.appendChild(nodeGroup);
    });
}

function renderEdges(svg) {
    const g = svg.querySelector('#main-group');
    
    edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        
        if (!sourceNode || !targetNode) return;
        
        const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        edgeGroup.setAttribute('class', 'edge');
        edgeGroup.setAttribute('id', 'edge-' + edge.id);
        
        // Calculate connection points
        const sourceX = sourceNode.position.x + sourceNode.width / 2;
        const sourceY = sourceNode.position.y + sourceNode.height;
        const targetX = targetNode.position.x + targetNode.width / 2;
        const targetY = targetNode.position.y;
        
        // Create curved path
        const controlY = sourceY + (targetY - sourceY) / 2;
        const path = \`M \${sourceX} \${sourceY} Q \${sourceX} \${controlY} \${targetX} \${targetY}\`;
        
        const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathElement.setAttribute('d', path);
        pathElement.setAttribute('fill', 'none');
        pathElement.setAttribute('stroke', '#7f8c8d');
        pathElement.setAttribute('stroke-width', 2);
        pathElement.setAttribute('marker-end', 'url(#arrowhead)');
        
        edgeGroup.appendChild(pathElement);
        
        // Add event listeners
        edgeGroup.addEventListener('click', () => selectEdge(edge.id));
        ${options.enableTooltips ? `edgeGroup.addEventListener('mouseenter', (e) => showEdgeTooltip(e, edge));` : ''}
        ${options.enableTooltips ? `edgeGroup.addEventListener('mouseleave', hideTooltip);` : ''}
        
        g.appendChild(edgeGroup);
    });
}

function getTacticColor(tactic) {
    const colors = {
        'reconnaissance': '#9b59b6',
        'initial-access': '#e74c3c',
        'execution': '#f39c12',
        'persistence': '#27ae60',
        'privilege-escalation': '#3498db',
        'defense-evasion': '#e67e22',
        'credential-access': '#1abc9c',
        'discovery': '#34495e',
        'lateral-movement': '#8e44ad',
        'collection': '#16a085',
        'command-and-control': '#c0392b',
        'exfiltration': '#d35400',
        'impact': '#7f8c8d'
    };
    return colors[tactic?.toLowerCase()] || '#95a5a6';
}

${options.includeSearch ? this.generateSearchJS() : ''}
${options.includeFilters ? this.generateFiltersJS() : ''}
${options.includeZoomControls ? this.generateZoomJS() : ''}
${options.enableSelection ? this.generateSelectionJS() : ''}
${options.enableTooltips ? this.generateTooltipJS() : ''}
${options.includeLegend ? this.generateLegendJS() : ''}
${options.includeMetadata ? this.generateMetadataJS() : ''}

function setupEventListeners() {
    ${options.includeZoomControls ? `
    document.getElementById('zoom-in')?.addEventListener('click', zoomIn);
    document.getElementById('zoom-out')?.addEventListener('click', zoomOut);
    document.getElementById('zoom-reset')?.addEventListener('click', resetZoom);
    ` : ''}
    
    // Pan functionality
    let isPanning = false;
    let lastX, lastY;
    
    const svg = document.getElementById('flow-svg');
    svg.addEventListener('mousedown', (e) => {
        isPanning = true;
        lastX = e.clientX;
        lastY = e.clientY;
        svg.style.cursor = 'grabbing';
    });
    
    svg.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        
        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;
        
        panX += deltaX;
        panY += deltaY;
        
        applyTransform();
        
        lastX = e.clientX;
        lastY = e.clientY;
    });
    
    svg.addEventListener('mouseup', () => {
        isPanning = false;
        svg.style.cursor = 'grab';
    });
    
    svg.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        zoomLevel = Math.max(0.1, Math.min(5, zoomLevel * delta));
        applyTransform();
    });
}

function applyTransform() {
    const g = document.getElementById('main-group');
    g.setAttribute('transform', \`translate(\${panX}, \${panY}) scale(\${zoomLevel})\`);
}

function centerView() {
    if (nodes.length === 0) return;
    
    const bounds = calculateBounds();
    const svg = document.getElementById('flow-svg');
    const rect = svg.getBoundingClientRect();
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    panX = centerX - (bounds.x + bounds.width / 2);
    panY = centerY - (bounds.y + bounds.height / 2);
    
    applyTransform();
}

function calculateBounds() {
    const positions = nodes.map(node => ({
        x: node.position.x,
        y: node.position.y,
        width: node.width,
        height: node.height
    }));
    
    const minX = Math.min(...positions.map(p => p.x));
    const minY = Math.min(...positions.map(p => p.y));
    const maxX = Math.max(...positions.map(p => p.x + p.width));
    const maxY = Math.max(...positions.map(p => p.y + p.height));
    
    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    };
}

// Export functionality
${options.enableExport ? this.generateExportJS() : ''}

// Analytics
${options.analytics?.enabled ? this.generateAnalyticsJS(options.analytics) : ''}
`;
  }

  // Generate search JavaScript
  private generateSearchJS(): string {
    return `
function initializeSearch() {
    const searchBox = document.getElementById('search-box');
    if (searchBox) {
        searchBox.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            applyFilters();
        });
    }
}

function searchNodes(query) {
    if (!query) return new Set();
    
    const matches = new Set();
    nodes.forEach(node => {
        const searchableText = [
            node.id,
            node.data?.label,
            node.data?.name,
            node.data?.technique_id,
            node.data?.tactic,
            node.data?.description
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (searchableText.includes(query)) {
            matches.add(node.id);
        }
    });
    
    return matches;
}
`;
  }

  // Generate filters JavaScript
  private generateFiltersJS(): string {
    return `
function initializeFilters() {
    const tactics = [...new Set(nodes.map(n => n.data?.tactic).filter(Boolean))];
    const filterContainer = document.getElementById('tactic-filters');
    
    if (filterContainer) {
        tactics.forEach(tactic => {
            const item = document.createElement('div');
            item.className = 'checkbox-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = 'filter-' + tactic;
            checkbox.checked = true;
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    filteredTactics.delete(tactic);
                } else {
                    filteredTactics.add(tactic);
                }
                applyFilters();
            });
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = tactic.charAt(0).toUpperCase() + tactic.slice(1);
            
            item.appendChild(checkbox);
            item.appendChild(label);
            filterContainer.appendChild(item);
        });
    }
}

function applyFilters() {
    const searchMatches = searchQuery ? searchNodes(searchQuery) : null;
    
    nodes.forEach(node => {
        const nodeElement = document.getElementById('node-' + node.id);
        if (!nodeElement) return;
        
        let visible = true;
        
        // Apply tactic filter
        if (filteredTactics.has(node.data?.tactic)) {
            visible = false;
        }
        
        // Apply search filter
        if (searchMatches && !searchMatches.has(node.id)) {
            visible = false;
        }
        
        nodeElement.classList.toggle('filtered', !visible);
    });
    
    // Filter connected edges
    edges.forEach(edge => {
        const edgeElement = document.getElementById('edge-' + edge.id);
        if (!edgeElement) return;
        
        const sourceVisible = !document.getElementById('node-' + edge.source)?.classList.contains('filtered');
        const targetVisible = !document.getElementById('node-' + edge.target)?.classList.contains('filtered');
        
        edgeElement.classList.toggle('filtered', !(sourceVisible && targetVisible));
    });
}
`;
  }

  // Generate zoom controls JavaScript
  private generateZoomJS(): string {
    return `
function zoomIn() {
    zoomLevel = Math.min(5, zoomLevel * 1.2);
    applyTransform();
}

function zoomOut() {
    zoomLevel = Math.max(0.1, zoomLevel * 0.8);
    applyTransform();
}

function resetZoom() {
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    centerView();
}
`;
  }

  // Generate selection JavaScript
  private generateSelectionJS(): string {
    return `
function selectNode(nodeId) {
    if (selectedNodes.has(nodeId)) {
        selectedNodes.delete(nodeId);
    } else {
        selectedNodes.add(nodeId);
    }
    
    updateSelection();
}

function selectEdge(edgeId) {
    if (selectedEdges.has(edgeId)) {
        selectedEdges.delete(edgeId);
    } else {
        selectedEdges.add(edgeId);
    }
    
    updateSelection();
}

function updateSelection() {
    // Update node selection
    nodes.forEach(node => {
        const element = document.getElementById('node-' + node.id);
        if (element) {
            element.classList.toggle('selected', selectedNodes.has(node.id));
        }
    });
    
    // Update edge selection
    edges.forEach(edge => {
        const element = document.getElementById('edge-' + edge.id);
        if (element) {
            element.classList.toggle('selected', selectedEdges.has(edge.id));
        }
    });
}
`;
  }

  // Generate tooltip JavaScript
  private generateTooltipJS(): string {
    return `
let tooltip = null;

function showTooltip(event, node) {
    hideTooltip();
    
    tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    
    const content = \`
        <div><strong>\${node.data?.label || node.id}</strong></div>
        \${node.data?.technique_id ? \`<div>ID: \${node.data.technique_id}</div>\` : ''}
        \${node.data?.tactic ? \`<div>Tactic: \${node.data.tactic}</div>\` : ''}
        \${node.data?.description ? \`<div>\${node.data.description}</div>\` : ''}
    \`;
    
    tooltip.innerHTML = content;
    document.body.appendChild(tooltip);
    
    positionTooltip(event);
}

function showEdgeTooltip(event, edge) {
    hideTooltip();
    
    tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    
    const content = \`
        <div><strong>Connection</strong></div>
        \${edge.label ? \`<div>\${edge.label}</div>\` : ''}
        \${edge.data?.confidence ? \`<div>Confidence: \${edge.data.confidence}</div>\` : ''}
    \`;
    
    tooltip.innerHTML = content;
    document.body.appendChild(tooltip);
    
    positionTooltip(event);
}

function positionTooltip(event) {
    if (!tooltip) return;
    
    const rect = tooltip.getBoundingClientRect();
    let x = event.clientX + 10;
    let y = event.clientY - rect.height - 10;
    
    // Keep tooltip in viewport
    if (x + rect.width > window.innerWidth) {
        x = event.clientX - rect.width - 10;
    }
    if (y < 0) {
        y = event.clientY + 10;
    }
    
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
}

function hideTooltip() {
    if (tooltip) {
        tooltip.remove();
        tooltip = null;
    }
}
`;
  }

  // Generate legend JavaScript
  private generateLegendJS(): string {
    return `
function generateLegend() {
    const legendContainer = document.getElementById('legend-container');
    if (!legendContainer) return;
    
    const tactics = [...new Set(nodes.map(n => n.data?.tactic).filter(Boolean))];
    
    tactics.forEach(tactic => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        
        const color = document.createElement('div');
        color.className = 'legend-color';
        color.style.backgroundColor = getTacticColor(tactic);
        
        const label = document.createElement('div');
        label.className = 'legend-label';
        label.textContent = tactic.charAt(0).toUpperCase() + tactic.slice(1);
        
        item.appendChild(color);
        item.appendChild(label);
        legendContainer.appendChild(item);
    });
}
`;
  }

  // Generate metadata JavaScript
  private generateMetadataJS(): string {
    return `
function generateMetadata() {
    const container = document.getElementById('metadata-container');
    if (!container) return;
    
    const metadata = [
        { label: 'Nodes', value: nodes.length },
        { label: 'Edges', value: edges.length },
        { label: 'Tactics', value: new Set(nodes.map(n => n.data?.tactic).filter(Boolean)).size },
        { label: 'Techniques', value: new Set(nodes.map(n => n.data?.technique_id).filter(Boolean)).size },
        { label: 'Generated', value: new Date().toLocaleDateString() }
    ];
    
    metadata.forEach(item => {
        const div = document.createElement('div');
        div.className = 'metadata-item';
        
        const label = document.createElement('div');
        label.className = 'metadata-label';
        label.textContent = item.label + ':';
        
        const value = document.createElement('div');
        value.className = 'metadata-value';
        value.textContent = item.value;
        
        div.appendChild(label);
        div.appendChild(value);
        container.appendChild(div);
    });
}
`;
  }

  // Generate export JavaScript
  private generateExportJS(): string {
    return `
function exportAsPNG() {
    const svg = document.getElementById('flow-svg');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const rect = svg.getBoundingClientRect();
    canvas.width = rect.width * 2; // 2x for better quality
    canvas.height = rect.height * 2;
    
    const data = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    img.onload = function() {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const link = document.createElement('a');
        link.download = 'threat-flow.png';
        link.href = canvas.toDataURL();
        link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(data);
}

function exportAsSVG() {
    const svg = document.getElementById('flow-svg');
    const data = new XMLSerializer().serializeToString(svg);
    
    const blob = new Blob([data], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.download = 'threat-flow.svg';
    link.href = URL.createObjectURL(blob);
    link.click();
}
`;
  }

  // Generate analytics JavaScript
  private generateAnalyticsJS(analytics: AnalyticsOptions): string {
    if (analytics.provider === 'google' && analytics.trackingId) {
      return `
// Google Analytics
window.gtag = window.gtag || function(){dataLayer.push(arguments);};
window.dataLayer = window.dataLayer || [];
gtag('js', new Date());
gtag('config', '${analytics.trackingId}');

// Track interactions
function trackEvent(action, category, label) {
    if (typeof gtag === 'function') {
        gtag('event', action, {
            event_category: category,
            event_label: label
        });
    }
}

// Track node selections
function trackNodeSelection(nodeId) {
    trackEvent('select_node', 'interaction', nodeId);
}
`;
    }
    return '';
  }

  // Generate HTML body
  private generateBody(
    nodes: Node[],
    edges: Edge[],
    options: InteractiveHtmlExportOptions
  ): string {
    const brandingLogo = options.branding?.logo ? 
      `<img src="${options.branding.logo}" alt="Logo" style="height: 32px; margin-right: 1rem;">` : '';
    
    const brandingName = options.branding?.companyName || options.organization || '';

    return `
<div class="container">
    <header class="header">
        <div style="display: flex; align-items: center;">
            ${brandingLogo}
            <div>
                <h1>${this.escapeHtml(options.title)}</h1>
                ${options.description ? `<div class="subtitle">${this.escapeHtml(options.description)}</div>` : ''}
            </div>
        </div>
    </header>
    
    <div class="main-content">
        ${options.includeSearch || options.includeFilters || options.includeLegend || options.includeMetadata ? `
        <aside class="sidebar">
            ${options.includeSearch ? `
            <div class="control-panel">
                <h3>Search</h3>
                <input type="text" id="search-box" class="search-box" placeholder="Search nodes...">
            </div>
            ` : ''}
            
            ${options.includeFilters ? `
            <div class="control-panel">
                <h3>Filter by Tactic</h3>
                <div id="tactic-filters" class="checkbox-group"></div>
            </div>
            ` : ''}
            
            ${options.includeLegend ? `
            <div class="legend">
                <h3>Legend</h3>
                <div id="legend-container"></div>
            </div>
            ` : ''}
            
            ${options.includeMetadata ? `
            <div class="metadata-panel">
                <h3>Metadata</h3>
                <div id="metadata-container"></div>
            </div>
            ` : ''}
        </aside>
        ` : ''}
        
        <main class="visualization">
            ${options.includeZoomControls ? `
            <div class="zoom-controls">
                <button id="zoom-in" class="zoom-btn" title="Zoom In">+</button>
                <button id="zoom-out" class="zoom-btn" title="Zoom Out">-</button>
                <button id="zoom-reset" class="zoom-btn" title="Reset Zoom">⌂</button>
            </div>
            ` : ''}
        </main>
    </div>
    
    ${options.branding?.footer || brandingName ? `
    <footer class="footer">
        ${options.branding.footer || `Generated by ${brandingName} using ThreatFlow`}
    </footer>
    ` : ''}
</div>
`;
  }

  // Generate analytics script tags
  private generateAnalytics(analytics?: AnalyticsOptions): string {
    if (!analytics?.enabled) {return '';}

    if (analytics.provider === 'google' && analytics.trackingId) {
      return `
<script async src="https://www.googletagmanager.com/gtag/js?id=${analytics.trackingId}"></script>
`;
    }

    return '';
  }

  // Generate security measures
  private generateSecurity(security?: SecurityOptions): string {
    if (!security?.requirePassword) {return '';}

    return `
<script>
const correctPassword = '${security.password || 'password'}';
const userPassword = prompt('Please enter the password to view this analysis:');
if (userPassword !== correctPassword) {
    document.body.innerHTML = '<div style="text-align: center; padding: 2rem; font-family: Arial;">Access Denied</div>';
}
</script>
`;
  }

  // Escape HTML special characters
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Get supported themes
  getSupportedThemes(): Array<'light' | 'dark' | 'auto'> {
    return ['light', 'dark', 'auto'];
  }

  // Validate options
  validateOptions(options: InteractiveHtmlExportOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!options.title.trim()) {
      errors.push('Title is required');
    }

    if (options.analytics?.enabled && options.analytics.provider === 'google' && !options.analytics.trackingId) {
      errors.push('Google Analytics tracking ID is required when analytics is enabled');
    }

    if (options.security?.requirePassword && !options.security.password) {
      errors.push('Password is required when password protection is enabled');
    }

    return { valid: errors.length === 0, errors };
  }

  // Estimate file size
  estimateFileSize(nodes: Node[], edges: Edge[], options: InteractiveHtmlExportOptions): {
    estimatedSize: number;
    unit: string;
    breakdown: { [key: string]: number };
  } {
    const baseHTML = 10; // KB
    const nodeData = nodes.length * 0.5; // KB per node
    const edgeData = edges.length * 0.2; // KB per edge
    const css = 15; // KB
    const js = 25; // KB base JavaScript
    
    let total = baseHTML + nodeData + edgeData + css + js;
    
    const breakdown = {
      'Base HTML': baseHTML,
      'Node Data': nodeData,
      'Edge Data': edgeData,
      'CSS Styles': css,
      'JavaScript': js,
    };

    if (options.includeSearch) {
      breakdown['Search Functionality'] = 3;
      total += 3;
    }
    
    if (options.includeFilters) {
      breakdown['Filter Functionality'] = 2;
      total += 2;
    }
    
    if (options.enableAnimation) {
      breakdown['Animations'] = 5;
      total += 5;
    }
    
    if (options.customCSS) {
      const customCSSSize = options.customCSS.length / 1024;
      breakdown['Custom CSS'] = customCSSSize;
      total += customCSSSize;
    }
    
    if (options.customJS) {
      const customJSSize = options.customJS.length / 1024;
      breakdown['Custom JavaScript'] = customJSSize;
      total += customJSSize;
    }

    const unit = total >= 1024 ? 'MB' : 'KB';
    const size = total >= 1024 ? total / 1024 : total;

    return {
      estimatedSize: Math.round(size * 10) / 10,
      unit,
      breakdown,
    };
  }
}

// Export singleton instance
export const interactiveHtmlExportService = new InteractiveHtmlExportService();