/**
 * 3D Flow Visualization Component
 * Provides immersive 3D visualization of attack flows and campaigns
 */
import {
  ViewInAr as ViewInArIcon,
  RotateLeft as RotateLeftIcon,
  Settings as SettingsIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Chip,
  Alert,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { OrbitControls, Html, Line, Cylinder } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useRef, useMemo, useCallback, Suspense } from 'react';
import * as THREE from 'three';

// Types for 3D flow data
interface Flow3DNode {
  id: string;
  label: string;
  technique: string;
  tactic: string;
  position: [number, number, number];
  connections: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp?: Date;
  confidence?: number;
  metadata?: {
    actor?: string;
    campaign?: string;
    tools?: string[];
    platforms?: string[];
  };
}

interface Flow3DSettings {
  autoRotate: boolean;
  showLabels: boolean;
  animateConnections: boolean;
  nodeSpacing: number;
  cameraDistance: number;
  highlightSeverity: boolean;
  timeBasedColoring: boolean;
}

interface Flow3DViewProps {
  nodes: Flow3DNode[];
  onNodeClick?: (node: Flow3DNode) => void;
  onNodeHover?: (node: Flow3DNode | null) => void;
  selectedNodeId?: string;
  theme?: 'dark' | 'light';
  height?: number;
}

// 3D Node Component
const FlowNode3D: React.FC<{
  node: Flow3DNode;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hover: boolean) => void;
  settings: Flow3DSettings;
}> = ({ node, isSelected, isHovered, onClick, onHover, settings }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const theme = useTheme();

  // Animate node on hover/selection
  useFrame((state) => {
    if (meshRef.current) {
      const scale = isSelected ? 1.3 : isHovered ? 1.1 : 1.0;
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
      
      // Auto-rotate if enabled
      if (settings.autoRotate) {
        meshRef.current.rotation.y += 0.01;
      }
    }
  });

  // Color based on severity and settings
  const getNodeColor = () => {
    if (settings.highlightSeverity) {
      switch (node.severity) {
        case 'critical': return '#d32f2f';
        case 'high': return '#f57c00';
        case 'medium': return '#1976d2';
        case 'low': return '#388e3c';
        default: return '#757575';
      }
    }
    
    if (settings.timeBasedColoring && node.timestamp) {
      const hoursSinceActivity = (Date.now() - node.timestamp.getTime()) / (1000 * 60 * 60);
      if (hoursSinceActivity < 1) {return '#ff1744';} // Recent - Red
      if (hoursSinceActivity < 24) {return '#ff9800';} // Today - Orange
      if (hoursSinceActivity < 168) {return '#2196f3';} // This week - Blue
      return '#9e9e9e'; // Older - Grey
    }
    
    return isSelected ? '#e91e63' : '#2196f3';
  };

  return (
    <group position={node.position}>
      {/* Node sphere */}
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={() => onHover(true)}
        onPointerOut={() => onHover(false)}
      >
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial
          color={getNodeColor()}
          transparent
          opacity={node.confidence ? node.confidence / 100 : 0.8}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {/* Node label */}
      {settings.showLabels && (
        <Html
          position={[0, 0.5, 0]}
          center
          distanceFactor={8}
          occlude
        >
          <div
            style={{
              background: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              transform: 'translateY(-50%)',
            }}
          >
            <div style={{ fontWeight: 'bold' }}>{node.technique}</div>
            <div style={{ fontSize: '10px', opacity: 0.8 }}>{node.tactic}</div>
          </div>
        </Html>
      )}

      {/* Confidence ring */}
      {node.confidence && node.confidence < 80 && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.35, 0.4, 16]} />
          <meshBasicMaterial
            color={node.confidence < 50 ? '#f44336' : '#ff9800'}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}
    </group>
  );
};

// 3D Connection Component
const FlowConnection3D: React.FC<{
  from: [number, number, number];
  to: [number, number, number];
  animated: boolean;
  color?: string;
}> = ({ from, to, animated, color = '#64b5f6' }) => {
  const lineRef = useRef<THREE.BufferGeometry>(null!);
  
  // Animate connection flow
  useFrame((state) => {
    if (animated && lineRef.current) {
      // Create flowing animation effect
      const time = state.clock.elapsedTime;
      const positions = lineRef.current.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        const t = (i / 3) / (positions.length / 3);
        const wave = Math.sin(time * 2 + t * 10) * 0.1;
        positions[i + 1] += wave * 0.01;
      }
      lineRef.current.attributes.position.needsUpdate = true;
    }
  });

  const points = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(...from),
      new THREE.Vector3((from[0] + to[0]) / 2, Math.max(from[1], to[1]) + 1, (from[2] + to[2]) / 2),
      new THREE.Vector3(...to),
    ]);
    return curve.getPoints(20);
  }, [from, to]);

  return (
    <>
      <Line
        ref={lineRef}
        points={points}
        color={color}
        lineWidth={2}
        transparent
        opacity={0.7}
      />
      
      {/* Flow direction indicator */}
      <mesh position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + 0.5, (from[2] + to[2]) / 2]}>
        <Cylinder args={[0.05, 0.1, 0.2, 8]} rotation={[0, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </>
  );
};

// 3D Scene Component
const Flow3DScene: React.FC<{
  nodes: Flow3DNode[];
  onNodeClick: (node: Flow3DNode) => void;
  onNodeHover: (node: Flow3DNode | null) => void;
  selectedNodeId?: string;
  settings: Flow3DSettings;
}> = ({ nodes, onNodeClick, onNodeHover, selectedNodeId, settings }) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  
  // Generate connections based on node relationships
  const connections = useMemo(() => {
    const conns: Array<{
      from: [number, number, number];
      to: [number, number, number];
      severity: string;
    }> = [];
    
    nodes.forEach(node => {
      node.connections.forEach(connId => {
        const targetNode = nodes.find(n => n.id === connId);
        if (targetNode) {
          conns.push({
            from: node.position,
            to: targetNode.position,
            severity: node.severity,
          });
        }
      });
    });
    
    return conns;
  }, [nodes]);

  const handleNodeClick = useCallback((node: Flow3DNode) => {
    onNodeClick(node);
  }, [onNodeClick]);

  const handleNodeHover = useCallback((node: Flow3DNode, isHovering: boolean) => {
    setHoveredNodeId(isHovering ? node.id : null);
    onNodeHover(isHovering ? node : null);
  }, [onNodeHover]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <pointLight position={[-10, -10, -10]} intensity={0.3} />

      {/* Nodes */}
      {nodes.map(node => (
        <FlowNode3D
          key={node.id}
          node={node}
          isSelected={node.id === selectedNodeId}
          isHovered={node.id === hoveredNodeId}
          onClick={() => handleNodeClick(node)}
          onHover={(hover) => handleNodeHover(node, hover)}
          settings={settings}
        />
      ))}

      {/* Connections */}
      {connections.map((conn, index) => (
        <FlowConnection3D
          key={index}
          from={conn.from}
          to={conn.to}
          animated={settings.animateConnections}
          color={conn.severity === 'critical' ? '#d32f2f' : 
                conn.severity === 'high' ? '#f57c00' : '#64b5f6'}
        />
      ))}

      {/* Ground plane */}
      <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#f5f5f5" transparent opacity={0.1} />
      </mesh>

      {/* Camera controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        autoRotate={settings.autoRotate}
        autoRotateSpeed={0.5}
        minDistance={3}
        maxDistance={50}
      />
    </>
  );
};

// Main 3D Flow View Component
export const Flow3DView: React.FC<Flow3DViewProps> = ({
  nodes,
  onNodeClick,
  onNodeHover,
  selectedNodeId,
  theme = 'dark',
  height = 600,
}) => {
  const muiTheme = useTheme();
  const [settings, setSettings] = useState<Flow3DSettings>({
    autoRotate: false,
    showLabels: true,
    animateConnections: true,
    nodeSpacing: 1.0,
    cameraDistance: 10,
    highlightSeverity: true,
    timeBasedColoring: false,
  });
  const [showControls, setShowControls] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleNodeClick = useCallback((node: Flow3DNode) => {
    onNodeClick?.(node);
  }, [onNodeClick]);

  const handleNodeHover = useCallback((node: Flow3DNode | null) => {
    onNodeHover?.(node);
  }, [onNodeHover]);

  const updateSetting = <K extends keyof Flow3DSettings>(
    key: K,
    value: Flow3DSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Generate sample data if no nodes provided
  const displayNodes = useMemo(() => {
    if (nodes.length > 0) {return nodes;}
    
    // Sample 3D flow data
    return [
      {
        id: '1',
        label: 'Initial Access',
        technique: 'T1566.001',
        tactic: 'Initial Access',
        position: [0, 0, 0] as [number, number, number],
        connections: ['2', '3'],
        severity: 'high' as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        confidence: 85,
        metadata: { actor: 'APT29', campaign: 'SolarWinds', tools: ['Sunburst'] },
      },
      {
        id: '2',
        label: 'Execution',
        technique: 'T1059.001',
        tactic: 'Execution',
        position: [-2, 2, 1] as [number, number, number],
        connections: ['4'],
        severity: 'critical' as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 25),
        confidence: 92,
        metadata: { actor: 'APT29', tools: ['PowerShell'] },
      },
      {
        id: '3',
        label: 'Persistence',
        technique: 'T1053.005',
        tactic: 'Persistence',
        position: [2, 2, -1] as [number, number, number],
        connections: ['4'],
        severity: 'medium' as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 20),
        confidence: 78,
        metadata: { actor: 'APT29', tools: ['Task Scheduler'] },
      },
      {
        id: '4',
        label: 'Discovery',
        technique: 'T1083',
        tactic: 'Discovery',
        position: [0, 4, 0] as [number, number, number],
        connections: ['5'],
        severity: 'high' as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
        confidence: 68,
        metadata: { actor: 'APT29' },
      },
      {
        id: '5',
        label: 'Exfiltration',
        technique: 'T1041',
        tactic: 'Exfiltration',
        position: [0, 6, 0] as [number, number, number],
        connections: [],
        severity: 'critical' as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 10),
        confidence: 95,
        metadata: { actor: 'APT29', campaign: 'SolarWinds' },
      },
    ];
  }, [nodes]);

  return (
    <Box sx={{ position: 'relative', height, width: '100%' }}>
      {/* 3D Canvas */}
      <Paper
        elevation={2}
        sx={{
          height: '100%',
          overflow: 'hidden',
          backgroundColor: theme === 'dark' ? '#1e1e1e' : '#f5f5f5',
          borderRadius: 2,
        }}
      >
        <Suspense fallback={
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography>Loading 3D View...</Typography>
          </Box>
        }>
          <Canvas
            camera={{ position: [5, 5, 5], fov: 60 }}
            gl={{ antialias: true, alpha: true }}
            style={{ background: 'transparent' }}
          >
            <Flow3DScene
              nodes={displayNodes}
              onNodeClick={handleNodeClick}
              onNodeHover={handleNodeHover}
              selectedNodeId={selectedNodeId}
              settings={settings}
            />
          </Canvas>
        </Suspense>
      </Paper>

      {/* 3D Controls */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Tooltip title="3D Settings">
          <IconButton
            onClick={() => setShowControls(!showControls)}
            sx={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.8)' },
            }}
          >
            <SettingsIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Reset View">
          <IconButton
            sx={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.8)' },
            }}
          >
            <RotateLeftIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Settings Panel */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            style={{
              position: 'absolute',
              top: 16,
              right: 80,
              width: 280,
            }}
          >
            <Card elevation={8}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  3D Visualization Settings
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.autoRotate}
                      onChange={(e) => updateSetting('autoRotate', e.target.checked)}
                    />
                  }
                  label="Auto Rotate"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.showLabels}
                      onChange={(e) => updateSetting('showLabels', e.target.checked)}
                    />
                  }
                  label="Show Labels"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.animateConnections}
                      onChange={(e) => updateSetting('animateConnections', e.target.checked)}
                    />
                  }
                  label="Animate Connections"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.highlightSeverity}
                      onChange={(e) => updateSetting('highlightSeverity', e.target.checked)}
                    />
                  }
                  label="Severity Colors"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.timeBasedColoring}
                      onChange={(e) => updateSetting('timeBasedColoring', e.target.checked)}
                    />
                  }
                  label="Time-based Coloring"
                />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Panel */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
        }}
      >
        <Alert severity="info" sx={{ mb: 1 }}>
          <strong>3D Flow View:</strong> Use mouse to orbit, zoom, and pan. Click nodes for details.
        </Alert>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            icon={<ViewInArIcon />}
            label={`${displayNodes.length} Techniques`}
            size="small"
            color="primary"
          />
          <Chip
            icon={<TimelineIcon />}
            label="Live Data"
            size="small"
            color="success"
          />
          {settings.timeBasedColoring && (
            <Chip
              label="Time-based Colors"
              size="small"
              color="secondary"
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Flow3DView;