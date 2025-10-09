import { NodeProps } from 'reactflow';

import { NodeFactory } from './nodes';
import SimplifiedNode from './nodes/SimplifiedNode';

export type ValidNodeTypes = 
  | 'action'
  | 'tool' 
  | 'malware'
  | 'asset'
  | 'infrastructure'
  | 'url'
  | 'vulnerability'
  | 'AND_operator'
  | 'OR_operator';

export const NODE_TYPES: Record<ValidNodeTypes, React.ComponentType<NodeProps>> = {
  'action': NodeFactory,
  'tool': NodeFactory,
  'malware': NodeFactory,
  'asset': NodeFactory,
  'infrastructure': NodeFactory,
  'url': NodeFactory,
  'vulnerability': NodeFactory,
  'AND_operator': NodeFactory,
  'OR_operator': NodeFactory,
};

export const SIMPLIFIED_NODE_TYPES: Record<ValidNodeTypes, React.ComponentType<NodeProps>> = {
  'action': SimplifiedNode,
  'tool': SimplifiedNode,
  'malware': SimplifiedNode,
  'asset': SimplifiedNode,
  'infrastructure': SimplifiedNode,
  'url': SimplifiedNode,
  'vulnerability': SimplifiedNode,
  'AND_operator': SimplifiedNode,
  'OR_operator': SimplifiedNode,
};

export const THEME = {
  background: {
    primary: '#0d1117',
    secondary: 'rgba(22, 27, 34, 0.95)',
    tertiary: 'rgba(13, 17, 23, 0.95)',
  },
  text: {
    primary: '#fff',
    secondary: 'rgba(255, 255, 255, 0.7)',
    muted: 'rgba(255, 255, 255, 0.5)',
  },
  border: {
    default: '1px solid rgba(255, 255, 255, 0.1)',
    hover: '1px solid rgba(255, 255, 255, 0.2)',
  },
  spacing: {
    panel: 16,
    section: 24,
  },
  shadow: {
    panel: '0 4px 20px rgba(0, 0, 0, 0.4)',
  }
} as const;

export const EDGE_STYLES = {
  default: {
    stroke: 'rgba(255, 255, 255, 0.7)',
    strokeWidth: 1.5,
    strokeDasharray: '4 4',
  },
  highlighted: {
    stroke: '#3b82f6',
    strokeWidth: 2,
    strokeDasharray: '0',
  },
  animated: {
    strokeDasharray: '4 4',
    animation: 'dashAnimation 1s linear infinite',
  }
} as const;

export const LABEL_STYLES = {
  fontSize: 11,
  color: 'rgba(255, 255, 255, 0.7)',
  fontWeight: 500,
  backgroundColor: 'rgba(13, 17, 23, 0.95)',
  padding: '2px 6px',
  borderRadius: '3px',
} as const;

export const LABEL_BG_STYLES = {
  fill: 'rgba(13, 17, 23, 0.95)',
  rx: 3,
  ry: 3,
} as const;

export const LAYOUT_CONFIG = {
  rankdir: 'TB', // Top-to-bottom layout
  ranksep: 200,  // Increased spacing between ranks
  nodesep: 150,  // Increased spacing between nodes in same rank
  edgesep: 60,   // Increased spacing between edges
  marginx: 80,   // Increased margin around graph
  marginy: 80,   // Increased margin around graph
  nodeWidth: 220,
  nodeHeight: 130,
  paddingLeft: 25,
  paddingRight: 25,
} as const;

export const TACTIC_NAMES: Record<string, string> = {
  TA0001: 'Initial Access',
  TA0002: 'Execution', 
  TA0003: 'Persistence',
  TA0004: 'Privilege Escalation',
  TA0005: 'Defense Evasion',
  TA0006: 'Credential Access',
  TA0007: 'Discovery',
  TA0008: 'Lateral Movement',
  TA0009: 'Collection',
  TA0010: 'Exfiltration',
  TA0011: 'Command and Control',
  TA0040: 'Impact',
} as const;