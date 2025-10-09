import { Node, Edge, Viewport } from 'reactflow';

export type VectorFormat = 'svg' | 'eps' | 'pdf' | 'ai' | 'emf';
export type ColorSpace = 'rgb' | 'cmyk' | 'grayscale';

export interface VectorExportOptions {
  format: VectorFormat;
  width: number;
  height: number;
  dpi: number;
  colorSpace: ColorSpace;
  includeBackground: boolean;
  backgroundColor: string;
  includeLabels: boolean;
  includeMetadata: boolean;
  embedFonts: boolean;
  compressOutput: boolean;
  transparentBackground: boolean;
  strokeWidth: number;
  fontSize: number;
  fontFamily: string;
  preserveAspectRatio: boolean;
  viewport?: Viewport;
  customStyles?: VectorStyles;
  outputPath?: string;
}

export interface VectorStyles {
  nodes: {
    [nodeType: string]: {
      fill: string;
      stroke: string;
      strokeWidth: number;
      opacity: number;
      fontSize: number;
      fontFamily: string;
      fontWeight: string;
      textColor: string;
    };
  };
  edges: {
    [edgeType: string]: {
      stroke: string;
      strokeWidth: number;
      strokeDasharray?: string;
      opacity: number;
      markerEnd?: string;
    };
  };
  labels: {
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    fill: string;
    background?: string;
    padding: number;
  };
}

export interface ExportResult {
  success: boolean;
  format: VectorFormat;
  filePath?: string;
  blob?: Blob;
  svgContent?: string;
  error?: string;
  metadata: {
    width: number;
    height: number;
    dpi: number;
    fileSize: number;
    generatedAt: number;
    nodeCount: number;
    edgeCount: number;
  };
}

const DEFAULT_OPTIONS: VectorExportOptions = {
  format: 'svg',
  width: 1920,
  height: 1080,
  dpi: 300,
  colorSpace: 'rgb',
  includeBackground: true,
  backgroundColor: '#ffffff',
  includeLabels: true,
  includeMetadata: true,
  embedFonts: true,
  compressOutput: false,
  transparentBackground: false,
  strokeWidth: 2,
  fontSize: 12,
  fontFamily: 'Arial, sans-serif',
  preserveAspectRatio: true,
};

const DEFAULT_STYLES: VectorStyles = {
  nodes: {
    default: {
      fill: '#3498db',
      stroke: '#2c3e50',
      strokeWidth: 2,
      opacity: 1,
      fontSize: 12,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'normal',
      textColor: '#ffffff',
    },
    'initial-access': {
      fill: '#e74c3c',
      stroke: '#c0392b',
      strokeWidth: 2,
      opacity: 1,
      fontSize: 12,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      textColor: '#ffffff',
    },
    'execution': {
      fill: '#f39c12',
      stroke: '#e67e22',
      strokeWidth: 2,
      opacity: 1,
      fontSize: 12,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'normal',
      textColor: '#2c3e50',
    },
    'persistence': {
      fill: '#27ae60',
      stroke: '#229954',
      strokeWidth: 2,
      opacity: 1,
      fontSize: 12,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'normal',
      textColor: '#ffffff',
    },
    'privilege-escalation': {
      fill: '#9b59b6',
      stroke: '#8e44ad',
      strokeWidth: 2,
      opacity: 1,
      fontSize: 12,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'normal',
      textColor: '#ffffff',
    },
    'defense-evasion': {
      fill: '#34495e',
      stroke: '#2c3e50',
      strokeWidth: 2,
      opacity: 1,
      fontSize: 12,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'normal',
      textColor: '#ffffff',
    },
  },
  edges: {
    default: {
      stroke: '#7f8c8d',
      strokeWidth: 2,
      opacity: 0.8,
      markerEnd: 'url(#arrowhead)',
    },
    'high-confidence': {
      stroke: '#27ae60',
      strokeWidth: 3,
      opacity: 1,
      markerEnd: 'url(#arrowhead-green)',
    },
    'medium-confidence': {
      stroke: '#f39c12',
      strokeWidth: 2,
      opacity: 0.8,
      markerEnd: 'url(#arrowhead-orange)',
    },
    'low-confidence': {
      stroke: '#e74c3c',
      strokeWidth: 1,
      strokeDasharray: '5,5',
      opacity: 0.6,
      markerEnd: 'url(#arrowhead-red)',
    },
  },
  labels: {
    fontSize: 10,
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'normal',
    fill: '#2c3e50',
    background: '#ffffff',
    padding: 4,
  },
};

// SVG marker definitions for arrows
const SVG_MARKERS = `
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" 
            refX="9" refY="3.5" orient="auto" markerUnits="strokeWidth">
      <polygon points="0 0, 10 3.5, 0 7" fill="#7f8c8d" />
    </marker>
    <marker id="arrowhead-green" markerWidth="10" markerHeight="7" 
            refX="9" refY="3.5" orient="auto" markerUnits="strokeWidth">
      <polygon points="0 0, 10 3.5, 0 7" fill="#27ae60" />
    </marker>
    <marker id="arrowhead-orange" markerWidth="10" markerHeight="7" 
            refX="9" refY="3.5" orient="auto" markerUnits="strokeWidth">
      <polygon points="0 0, 10 3.5, 0 7" fill="#f39c12" />
    </marker>
    <marker id="arrowhead-red" markerWidth="10" markerHeight="7" 
            refX="9" refY="3.5" orient="auto" markerUnits="strokeWidth">
      <polygon points="0 0, 10 3.5, 0 7" fill="#e74c3c" />
    </marker>
  </defs>
`;

class VectorExportService {
  private options: VectorExportOptions = { ...DEFAULT_OPTIONS };

  // Set export options
  setOptions(options: Partial<VectorExportOptions>): void {
    this.options = { ...this.options, ...options };
  }

  getOptions(): VectorExportOptions {
    return { ...this.options };
  }

  // Export flow as vector graphic
  async exportFlow(
    nodes: Node[],
    edges: Edge[],
    options?: Partial<VectorExportOptions>
  ): Promise<ExportResult> {
    const exportOptions = { ...this.options, ...options };
    
    try {
      const result = await this.generateVector(nodes, edges, exportOptions);
      
      return {
        success: true,
        format: exportOptions.format,
        ...result,
        metadata: {
          width: exportOptions.width,
          height: exportOptions.height,
          dpi: exportOptions.dpi,
          fileSize: result.blob?.size || result.svgContent?.length || 0,
          generatedAt: Date.now(),
          nodeCount: nodes.length,
          edgeCount: edges.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        format: exportOptions.format,
        error: error instanceof Error ? error.message : 'Export failed',
        metadata: {
          width: exportOptions.width,
          height: exportOptions.height,
          dpi: exportOptions.dpi,
          fileSize: 0,
          generatedAt: Date.now(),
          nodeCount: nodes.length,
          edgeCount: edges.length,
        },
      };
    }
  }

  // Generate vector output
  private async generateVector(
    nodes: Node[],
    edges: Edge[],
    options: VectorExportOptions
  ): Promise<{ blob?: Blob; svgContent?: string; filePath?: string }> {
    // Calculate bounds
    const bounds = this.calculateBounds(nodes, options.viewport);
    const viewBox = `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`;
    
    // Generate SVG content
    const svgContent = this.generateSVG(nodes, edges, options, bounds, viewBox);
    
    switch (options.format) {
      case 'svg':
        return this.generateSVGOutput(svgContent, options);
      case 'pdf':
        return this.generatePDFOutput(svgContent, options);
      case 'eps':
        return this.generateEPSOutput(svgContent, options);
      case 'ai':
        return this.generateAIOutput(svgContent, options);
      case 'emf':
        return this.generateEMFOutput(svgContent, options);
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  // Calculate bounds of the flow
  private calculateBounds(nodes: Node[], viewport?: Viewport): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    if (viewport) {
      return {
        x: viewport.x,
        y: viewport.y,
        width: window.innerWidth / viewport.zoom,
        height: window.innerHeight / viewport.zoom,
      };
    }

    if (nodes.length === 0) {
      return { x: 0, y: 0, width: 800, height: 600 };
    }

    const positions = nodes.map(node => ({
      x: node.position.x,
      y: node.position.y,
      width: node.width || 150,
      height: node.height || 50,
    }));

    const minX = Math.min(...positions.map(p => p.x));
    const minY = Math.min(...positions.map(p => p.y));
    const maxX = Math.max(...positions.map(p => p.x + p.width));
    const maxY = Math.max(...positions.map(p => p.y + p.height));

    const padding = 50;
    
    return {
      x: minX - padding,
      y: minY - padding,
      width: (maxX - minX) + (padding * 2),
      height: (maxY - minY) + (padding * 2),
    };
  }

  // Generate SVG content
  private generateSVG(
    nodes: Node[],
    edges: Edge[],
    options: VectorExportOptions,
    bounds: { x: number; y: number; width: number; height: number },
    viewBox: string
  ): string {
    const styles = { ...DEFAULT_STYLES, ...options.customStyles };
    const colorSpaceFilter = this.getColorSpaceFilter(options.colorSpace);

    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${options.width}" 
     height="${options.height}" 
     viewBox="${viewBox}"
     preserveAspectRatio="${options.preserveAspectRatio ? 'xMidYMid meet' : 'none'}"
     ${options.includeMetadata ? this.generateMetadata(nodes, edges, options) : ''}>
`;

    // Add filters and definitions
    svg += SVG_MARKERS;
    
    if (colorSpaceFilter) {
      svg += colorSpaceFilter;
    }

    // Add background
    if (options.includeBackground && !options.transparentBackground) {
      svg += `<rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" 
                    fill="${options.backgroundColor}" />`;
    }

    // Add edges first (so they appear behind nodes)
    edges.forEach(edge => {
      svg += this.generateEdgeSVG(edge, nodes, styles.edges, options);
    });

    // Add nodes
    nodes.forEach(node => {
      svg += this.generateNodeSVG(node, styles.nodes, options);
    });

    svg += '</svg>';

    return svg;
  }

  // Generate SVG for a single node
  private generateNodeSVG(node: Node, nodeStyles: VectorStyles['nodes'], options: VectorExportOptions): string {
    const nodeType = node.data?.tactic || node.type || 'default';
    const style = nodeStyles[nodeType] || nodeStyles.default;
    
    const x = node.position.x;
    const y = node.position.y;
    const width = node.width || 150;
    const height = node.height || 50;
    const rx = 8; // Rounded corners

    let nodeSvg = `<g id="node-${node.id}" class="node">`;
    
    // Node rectangle
    nodeSvg += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" ry="${rx}"
                      fill="${style.fill}" 
                      stroke="${style.stroke}" 
                      stroke-width="${style.strokeWidth}"
                      opacity="${style.opacity}" />`;

    // Node label
    if (options.includeLabels && (node.data?.label || node.data?.name)) {
      const label = node.data.label || node.data.name || '';
      const textX = x + width / 2;
      const textY = y + height / 2;
      
      nodeSvg += `<text x="${textX}" y="${textY}" 
                        text-anchor="middle" 
                        dominant-baseline="middle"
                        font-family="${style.fontFamily}" 
                        font-size="${style.fontSize}px" 
                        font-weight="${style.fontWeight}"
                        fill="${style.textColor}">
                    ${this.escapeXML(label)}
                  </text>`;
    }

    // Technique ID badge
    if (node.data?.technique_id) {
      const badgeX = x + width - 40;
      const badgeY = y + 5;
      const badgeWidth = 35;
      const badgeHeight = 15;

      nodeSvg += `<rect x="${badgeX}" y="${badgeY}" width="${badgeWidth}" height="${badgeHeight}" rx="3" ry="3"
                        fill="rgba(0,0,0,0.7)" stroke="none" />`;
      nodeSvg += `<text x="${badgeX + badgeWidth/2}" y="${badgeY + badgeHeight/2}" 
                        text-anchor="middle" 
                        dominant-baseline="middle"
                        font-family="monospace" 
                        font-size="8px" 
                        font-weight="bold"
                        fill="#ffffff">
                    ${this.escapeXML(node.data.technique_id)}
                  </text>`;
    }

    nodeSvg += '</g>';
    return nodeSvg;
  }

  // Generate SVG for a single edge
  private generateEdgeSVG(
    edge: Edge,
    nodes: Node[],
    edgeStyles: VectorStyles['edges'],
    options: VectorExportOptions
  ): string {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) {return '';}

    const edgeType = edge.data?.confidence || 'default';
    const style = edgeStyles[edgeType] || edgeStyles.default;

    // Calculate connection points
    const sourceX = sourceNode.position.x + (sourceNode.width || 150) / 2;
    const sourceY = sourceNode.position.y + (sourceNode.height || 50);
    const targetX = targetNode.position.x + (targetNode.width || 150) / 2;
    const targetY = targetNode.position.y;

    // Create curved path
    const controlY = sourceY + (targetY - sourceY) / 2;
    const path = `M ${sourceX} ${sourceY} Q ${sourceX} ${controlY} ${targetX} ${targetY}`;

    let edgeSvg = `<g id="edge-${edge.id}" class="edge">`;
    
    // Edge path
    edgeSvg += `<path d="${path}"
                      fill="none" 
                      stroke="${style.stroke}" 
                      stroke-width="${style.strokeWidth}"
                      ${style.strokeDasharray ? `stroke-dasharray="${style.strokeDasharray}"` : ''}
                      opacity="${style.opacity}"
                      marker-end="${style.markerEnd || ''}" />`;

    // Edge label
    if (options.includeLabels && edge.label) {
      const midX = (sourceX + targetX) / 2;
      const midY = (sourceY + targetY) / 2;
      
      edgeSvg += `<text x="${midX}" y="${midY}" 
                        text-anchor="middle" 
                        dominant-baseline="middle"
                        font-family="${DEFAULT_STYLES.labels.fontFamily}" 
                        font-size="${DEFAULT_STYLES.labels.fontSize}px"
                        font-weight="${DEFAULT_STYLES.labels.fontWeight}"
                        fill="${DEFAULT_STYLES.labels.fill}"
                        stroke="${DEFAULT_STYLES.labels.background || '#ffffff'}"
                        stroke-width="2"
                        paint-order="stroke">
                    ${this.escapeXML(edge.label)}
                  </text>`;
    }

    edgeSvg += '</g>';
    return edgeSvg;
  }

  // Get color space filter
  private getColorSpaceFilter(colorSpace: ColorSpace): string {
    switch (colorSpace) {
      case 'grayscale':
        return `<filter id="grayscale">
                  <feColorMatrix type="saturate" values="0"/>
                </filter>`;
      case 'cmyk':
        // CMYK conversion would require more complex processing
        return '';
      default:
        return '';
    }
  }

  // Generate metadata
  private generateMetadata(nodes: Node[], edges: Edge[], options: VectorExportOptions): string {
    return `
      <metadata>
        <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
                 xmlns:dc="http://purl.org/dc/elements/1.1/">
          <rdf:Description rdf:about="">
            <dc:title>ThreatFlow Attack Flow Visualization</dc:title>
            <dc:creator>ThreatFlow</dc:creator>
            <dc:description>Vector export of attack flow with ${nodes.length} nodes and ${edges.length} edges</dc:description>
            <dc:format>image/svg+xml</dc:format>
            <dc:date>${new Date().toISOString()}</dc:date>
          </rdf:Description>
        </rdf:RDF>
      </metadata>
    `;
  }

  // Generate SVG output
  private async generateSVGOutput(
    svgContent: string,
    options: VectorExportOptions
  ): Promise<{ blob: Blob; svgContent: string }> {
    let processedContent = svgContent;

    // Embed fonts if requested
    if (options.embedFonts) {
      processedContent = await this.embedFonts(processedContent, options.fontFamily);
    }

    // Compress if requested
    if (options.compressOutput) {
      processedContent = this.compressSVG(processedContent);
    }

    const blob = new Blob([processedContent], { type: 'image/svg+xml;charset=utf-8' });
    
    return { blob, svgContent: processedContent };
  }

  // Generate PDF output (simplified - would need pdf-lib or similar)
  private async generatePDFOutput(
    svgContent: string,
    options: VectorExportOptions
  ): Promise<{ blob: Blob }> {
    // In a real implementation, this would use a library like pdf-lib
    // to convert SVG to PDF. For now, we'll create a basic PDF wrapper
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 ${options.width} ${options.height}]
>>
endobj

xref
0 4
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000110 00000 n 
trailer
<<
/Size 4
/Root 1 0 R
>>
startxref
210
%%EOF`;

    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    return { blob };
  }

  // Generate EPS output
  private async generateEPSOutput(
    svgContent: string,
    options: VectorExportOptions
  ): Promise<{ blob: Blob }> {
    // Convert SVG to EPS (simplified implementation)
    const epsContent = `%!PS-Adobe-3.0 EPSF-3.0
%%BoundingBox: 0 0 ${options.width} ${options.height}
%%Creator: ThreatFlow Vector Export
%%CreationDate: ${new Date().toISOString()}
%%EndComments

% SVG content would be converted to PostScript here
% This is a simplified placeholder

showpage
%%EOF`;

    const blob = new Blob([epsContent], { type: 'application/postscript' });
    return { blob };
  }

  // Generate AI output (Adobe Illustrator)
  private async generateAIOutput(
    svgContent: string,
    options: VectorExportOptions
  ): Promise<{ blob: Blob }> {
    // AI format is essentially PDF with additional Adobe-specific data
    // For now, we'll use the PDF output as a base
    const pdfResult = await this.generatePDFOutput(svgContent, options);
    return { blob: new Blob([pdfResult.blob], { type: 'application/illustrator' }) };
  }

  // Generate EMF output (Enhanced Metafile)
  private async generateEMFOutput(
    svgContent: string,
    options: VectorExportOptions
  ): Promise<{ blob: Blob }> {
    // EMF is a Windows-specific format
    // This would require platform-specific conversion
    throw new Error('EMF export not implemented - platform specific format');
  }

  // Embed fonts in SVG
  private async embedFonts(svgContent: string, fontFamily: string): Promise<string> {
    // In a real implementation, this would fetch font files and embed them as base64
    // For now, we'll add a font-face declaration
    const fontCSS = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        text { font-family: 'Inter', ${fontFamily}; }
      </style>
    `;
    
    return svgContent.replace('<svg', `<svg${fontCSS}<svg`.substring(4));
  }

  // Compress SVG by removing unnecessary whitespace and comments
  private compressSVG(svgContent: string): string {
    return svgContent
      .replace(/>\s+</g, '><') // Remove whitespace between tags
      .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim();
  }

  // Escape XML special characters
  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Get supported formats
  getSupportedFormats(): VectorFormat[] {
    return ['svg', 'pdf', 'eps', 'ai']; // EMF excluded due to platform limitations
  }

  // Get format capabilities
  getFormatCapabilities(format: VectorFormat): {
    supportsTransparency: boolean;
    supportsLayers: boolean;
    supportsText: boolean;
    supportsEmbeddedFonts: boolean;
    supportsMetadata: boolean;
    maxDPI: number;
  } {
    const capabilities = {
      svg: {
        supportsTransparency: true,
        supportsLayers: true,
        supportsText: true,
        supportsEmbeddedFonts: true,
        supportsMetadata: true,
        maxDPI: Infinity,
      },
      pdf: {
        supportsTransparency: true,
        supportsLayers: true,
        supportsText: true,
        supportsEmbeddedFonts: true,
        supportsMetadata: true,
        maxDPI: 2400,
      },
      eps: {
        supportsTransparency: false,
        supportsLayers: false,
        supportsText: true,
        supportsEmbeddedFonts: true,
        supportsMetadata: false,
        maxDPI: 2400,
      },
      ai: {
        supportsTransparency: true,
        supportsLayers: true,
        supportsText: true,
        supportsEmbeddedFonts: true,
        supportsMetadata: true,
        maxDPI: 2400,
      },
      emf: {
        supportsTransparency: false,
        supportsLayers: false,
        supportsText: true,
        supportsEmbeddedFonts: false,
        supportsMetadata: false,
        maxDPI: 1200,
      },
    };

    return capabilities[format];
  }

  // Validate export options
  validateOptions(options: VectorExportOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (options.width <= 0 || options.height <= 0) {
      errors.push('Width and height must be positive numbers');
    }

    if (options.dpi < 72 || options.dpi > 2400) {
      errors.push('DPI must be between 72 and 2400');
    }

    const capabilities = this.getFormatCapabilities(options.format);
    if (options.dpi > capabilities.maxDPI) {
      errors.push(`DPI ${options.dpi} exceeds maximum for ${options.format} format (${capabilities.maxDPI})`);
    }

    if (!capabilities.supportsTransparency && options.transparentBackground) {
      errors.push(`${options.format} format does not support transparent backgrounds`);
    }

    return { valid: errors.length === 0, errors };
  }

  // Estimate file size
  estimateFileSize(nodes: Node[], edges: Edge[], options: VectorExportOptions): {
    estimatedSize: number;
    unit: string;
    factors: string[];
  } {
    const baseSize = 2048; // Base SVG overhead
    const nodeSize = nodes.length * 200; // Estimated bytes per node
    const edgeSize = edges.length * 100; // Estimated bytes per edge
    const labelSize = options.includeLabels ? (nodes.length + edges.length) * 50 : 0;
    const metadataSize = options.includeMetadata ? 1024 : 0;

    let totalSize = baseSize + nodeSize + edgeSize + labelSize + metadataSize;

    const factors: string[] = ['Base structure', 'Node elements', 'Edge elements'];
    
    if (options.includeLabels) {factors.push('Text labels');}
    if (options.includeMetadata) {factors.push('Metadata');}
    if (options.embedFonts) {
      totalSize += 50000; // Estimated font embedding overhead
      factors.push('Embedded fonts');
    }

    // Format-specific multipliers
    switch (options.format) {
      case 'pdf':
      case 'ai':
        totalSize *= 1.5;
        factors.push('PDF structure overhead');
        break;
      case 'eps':
        totalSize *= 1.3;
        factors.push('PostScript overhead');
        break;
    }

    // Compression
    if (options.compressOutput && options.format === 'svg') {
      totalSize *= 0.7;
      factors.push('Compression savings');
    }

    const sizeKB = totalSize / 1024;
    const sizeMB = sizeKB / 1024;

    if (sizeMB >= 1) {
      return { estimatedSize: Math.round(sizeMB * 10) / 10, unit: 'MB', factors };
    } else {
      return { estimatedSize: Math.round(sizeKB), unit: 'KB', factors };
    }
  }
}

// Export singleton instance
export const vectorExportService = new VectorExportService();