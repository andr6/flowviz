import { Node, Edge } from 'reactflow';

export interface TimelineEvent {
  id: string;
  timestamp: number;
  type: 'node' | 'edge' | 'milestone';
  nodeId?: string;
  edgeId?: string;
  data: any;
  label: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  tactic?: string;
  technique?: string;
  threatActor?: string;
}

export interface TimelineRange {
  start: number;
  end: number;
  duration: number;
}

export interface TimelineScrubberConfig {
  enabled: boolean;
  playSpeed: number; // 0.1x to 5x
  autoPlay: boolean;
  loop: boolean;
  showEvents: boolean;
  showMilestones: boolean;
  highlightActive: boolean;
  fadeInactive: boolean;
  groupByTactic: boolean;
  filterBySeverity: string[];
  timeWindow: number; // seconds to show around current time
  animationDuration: number; // milliseconds
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  currentIndex: number;
  progress: number; // 0-100
  direction: 'forward' | 'backward';
  activeEvents: TimelineEvent[];
}

const DEFAULT_CONFIG: TimelineScrubberConfig = {
  enabled: true,
  playSpeed: 1.0,
  autoPlay: false,
  loop: false,
  showEvents: true,
  showMilestones: true,
  highlightActive: true,
  fadeInactive: true,
  groupByTactic: false,
  filterBySeverity: ['low', 'medium', 'high', 'critical'],
  timeWindow: 300, // 5 minutes
  animationDuration: 500,
};

class TimelineScrubberService {
  private config: TimelineScrubberConfig = { ...DEFAULT_CONFIG };
  private events: TimelineEvent[] = [];
  private timelineRange: TimelineRange | null = null;
  private playbackState: PlaybackState = {
    isPlaying: false,
    currentTime: 0,
    currentIndex: 0,
    progress: 0,
    direction: 'forward',
    activeEvents: [],
  };
  
  private playbackTimer: number | null = null;
  private callbacks: Set<(state: PlaybackState) => void> = new Set();

  // Initialize timeline from nodes and edges
  initializeTimeline(nodes: Node[], edges: Edge[]): void {
    this.events = [];
    
    // Extract events from nodes
    nodes.forEach(node => {
      const timestamp = this.extractTimestamp(node.data);
      if (timestamp) {
        this.events.push({
          id: `node_${node.id}`,
          timestamp,
          type: 'node',
          nodeId: node.id,
          data: node.data,
          label: node.data?.label || node.data?.name || node.id,
          description: node.data?.description || 'Node event',
          severity: this.extractSeverity(node.data),
          tactic: node.data?.tactic,
          technique: node.data?.technique_id || node.data?.technique,
          threatActor: node.data?.threat_actor || node.data?.actor,
        });
      }
    });

    // Extract events from edges
    edges.forEach(edge => {
      const timestamp = this.extractTimestamp(edge.data);
      if (timestamp) {
        this.events.push({
          id: `edge_${edge.id}`,
          timestamp,
          type: 'edge',
          edgeId: edge.id,
          data: edge.data,
          label: edge.label || edge.data?.label || 'Connection',
          description: edge.data?.description || 'Edge event',
          severity: this.extractSeverity(edge.data),
        });
      }
    });

    // Sort events chronologically
    this.events.sort((a, b) => a.timestamp - b.timestamp);

    // Calculate timeline range
    if (this.events.length > 0) {
      const timestamps = this.events.map(e => e.timestamp);
      this.timelineRange = {
        start: Math.min(...timestamps),
        end: Math.max(...timestamps),
        duration: Math.max(...timestamps) - Math.min(...timestamps),
      };

      // Set initial time to start of timeline
      this.playbackState.currentTime = this.timelineRange.start;
      this.playbackState.currentIndex = 0;
      this.updateActiveEvents();
    }

    this.notifyStateChange();
  }

  // Extract timestamp from data
  private extractTimestamp(data: any): number | null {
    if (!data) {return null;}
    
    // Try various timestamp fields
    const timestampFields = ['timestamp', 'time', 'observed_time', 'detection_time', 'created_at', 'event_time'];
    
    for (const field of timestampFields) {
      const value = data[field];
      if (value) {
        const timestamp = typeof value === 'number' ? value : new Date(value).getTime();
        if (!isNaN(timestamp)) {
          return timestamp;
        }
      }
    }

    return null;
  }

  // Extract severity from data
  private extractSeverity(data: any): TimelineEvent['severity'] {
    if (!data) {return 'medium';}
    
    const severity = (data.severity || data.risk || data.priority || '').toLowerCase();
    
    if (['critical', 'high'].includes(severity)) {return severity as TimelineEvent['severity'];}
    if (severity === 'medium' || severity === 'moderate') {return 'medium';}
    if (severity === 'low' || severity === 'minimal') {return 'low';}
    
    return 'medium';
  }

  // Set configuration
  setConfig(config: Partial<TimelineScrubberConfig>): void {
    this.config = { ...this.config, ...config };
    this.updateActiveEvents();
    this.notifyStateChange();
  }

  getConfig(): TimelineScrubberConfig {
    return { ...this.config };
  }

  // Get timeline range
  getTimelineRange(): TimelineRange | null {
    return this.timelineRange;
  }

  // Get all events
  getEvents(): TimelineEvent[] {
    return [...this.events];
  }

  // Get filtered events based on config
  getFilteredEvents(): TimelineEvent[] {
    return this.events.filter(event => 
      this.config.filterBySeverity.includes(event.severity)
    );
  }

  // Get current playback state
  getPlaybackState(): PlaybackState {
    return { ...this.playbackState };
  }

  // Set current time
  setCurrentTime(timestamp: number): void {
    if (!this.timelineRange) {return;}

    this.playbackState.currentTime = Math.max(
      this.timelineRange.start,
      Math.min(this.timelineRange.end, timestamp)
    );

    // Update progress
    this.playbackState.progress = this.timelineRange.duration > 0 
      ? ((this.playbackState.currentTime - this.timelineRange.start) / this.timelineRange.duration) * 100
      : 0;

    // Find current index
    this.playbackState.currentIndex = this.events.findIndex(event => 
      event.timestamp > this.playbackState.currentTime
    );
    if (this.playbackState.currentIndex === -1) {
      this.playbackState.currentIndex = this.events.length;
    }

    this.updateActiveEvents();
    this.notifyStateChange();
  }

  // Set progress (0-100)
  setProgress(progress: number): void {
    if (!this.timelineRange) {return;}

    const clampedProgress = Math.max(0, Math.min(100, progress));
    const timestamp = this.timelineRange.start + 
      (this.timelineRange.duration * clampedProgress / 100);
    
    this.setCurrentTime(timestamp);
  }

  // Update active events based on current time and time window
  private updateActiveEvents(): void {
    if (!this.config.enabled) {
      this.playbackState.activeEvents = [];
      return;
    }

    const currentTime = this.playbackState.currentTime;
    const timeWindow = this.config.timeWindow * 1000; // Convert to milliseconds
    
    this.playbackState.activeEvents = this.getFilteredEvents().filter(event => {
      const timeDiff = Math.abs(event.timestamp - currentTime);
      return timeDiff <= timeWindow;
    });
  }

  // Play/pause timeline
  play(): void {
    if (this.playbackState.isPlaying || !this.timelineRange) {return;}

    this.playbackState.isPlaying = true;
    this.playbackState.direction = 'forward';
    
    this.startPlayback();
    this.notifyStateChange();
  }

  pause(): void {
    if (!this.playbackState.isPlaying) {return;}

    this.playbackState.isPlaying = false;
    this.stopPlayback();
    this.notifyStateChange();
  }

  stop(): void {
    this.playbackState.isPlaying = false;
    this.stopPlayback();
    
    if (this.timelineRange) {
      this.setCurrentTime(this.timelineRange.start);
    }
  }

  // Step forward/backward
  stepForward(): void {
    if (this.playbackState.currentIndex < this.events.length) {
      const nextEvent = this.events[this.playbackState.currentIndex];
      this.setCurrentTime(nextEvent.timestamp);
    }
  }

  stepBackward(): void {
    if (this.playbackState.currentIndex > 0) {
      const prevEvent = this.events[this.playbackState.currentIndex - 1];
      this.setCurrentTime(prevEvent.timestamp);
    }
  }

  // Jump to specific event
  jumpToEvent(eventId: string): void {
    const event = this.events.find(e => e.id === eventId);
    if (event) {
      this.setCurrentTime(event.timestamp);
    }
  }

  // Set playback speed
  setPlaySpeed(speed: number): void {
    const clampedSpeed = Math.max(0.1, Math.min(5.0, speed));
    this.config.playSpeed = clampedSpeed;
    
    // Restart playback with new speed if currently playing
    if (this.playbackState.isPlaying) {
      this.stopPlayback();
      this.startPlayback();
    }
  }

  // Start playback timer
  private startPlayback(): void {
    if (!this.timelineRange) {return;}

    const baseInterval = 100; // 100ms base interval
    const interval = baseInterval / this.config.playSpeed;
    const timeIncrement = (this.timelineRange.duration / 1000) * (baseInterval / 1000); // Real-time increment

    this.playbackTimer = window.setInterval(() => {
      let newTime = this.playbackState.currentTime;
      
      if (this.playbackState.direction === 'forward') {
        newTime += timeIncrement;
        
        if (newTime >= this.timelineRange!.end) {
          if (this.config.loop) {
            newTime = this.timelineRange!.start;
          } else {
            this.pause();
            return;
          }
        }
      } else {
        newTime -= timeIncrement;
        
        if (newTime <= this.timelineRange!.start) {
          if (this.config.loop) {
            newTime = this.timelineRange!.end;
          } else {
            this.pause();
            return;
          }
        }
      }

      this.setCurrentTime(newTime);
    }, interval);
  }

  // Stop playback timer
  private stopPlayback(): void {
    if (this.playbackTimer) {
      window.clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
  }

  // Get events in time range
  getEventsInRange(startTime: number, endTime: number): TimelineEvent[] {
    return this.events.filter(event => 
      event.timestamp >= startTime && event.timestamp <= endTime
    );
  }

  // Get events by tactic
  getEventsByTactic(): { [tactic: string]: TimelineEvent[] } {
    const byTactic: { [tactic: string]: TimelineEvent[] } = {};
    
    this.events.forEach(event => {
      const tactic = event.tactic || 'unknown';
      if (!byTactic[tactic]) {
        byTactic[tactic] = [];
      }
      byTactic[tactic].push(event);
    });

    return byTactic;
  }

  // Get timeline statistics
  getTimelineStats(): {
    totalEvents: number;
    eventsByType: { [type: string]: number };
    eventsBySeverity: { [severity: string]: number };
    eventsByTactic: { [tactic: string]: number };
    timeSpan: number;
    averageEventDuration: number;
  } {
    const eventsByType: { [type: string]: number } = {};
    const eventsBySeverity: { [severity: string]: number } = {};
    const eventsByTactic: { [tactic: string]: number } = {};

    this.events.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
      
      const tactic = event.tactic || 'unknown';
      eventsByTactic[tactic] = (eventsByTactic[tactic] || 0) + 1;
    });

    const timeSpan = this.timelineRange ? this.timelineRange.duration : 0;
    const averageEventDuration = this.events.length > 1 
      ? timeSpan / (this.events.length - 1) 
      : 0;

    return {
      totalEvents: this.events.length,
      eventsByType,
      eventsBySeverity,
      eventsByTactic,
      timeSpan,
      averageEventDuration,
    };
  }

  // Add milestone event
  addMilestone(timestamp: number, label: string, description: string): void {
    const milestone: TimelineEvent = {
      id: `milestone_${Date.now()}_${Math.random()}`,
      timestamp,
      type: 'milestone',
      data: { milestone: true },
      label,
      description,
      severity: 'medium',
    };

    this.events.push(milestone);
    this.events.sort((a, b) => a.timestamp - b.timestamp);
    this.updateActiveEvents();
    this.notifyStateChange();
  }

  // Remove event
  removeEvent(eventId: string): void {
    this.events = this.events.filter(event => event.id !== eventId);
    this.updateActiveEvents();
    this.notifyStateChange();
  }

  // Apply timeline filter to nodes and edges
  applyTimelineFilter(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
    if (!this.config.enabled || !this.config.fadeInactive) {
      return { nodes, edges };
    }

    const activeEventIds = new Set(this.playbackState.activeEvents.map(e => e.nodeId || e.edgeId));
    const currentTime = this.playbackState.currentTime;

    const filteredNodes = nodes.map(node => {
      const nodeTimestamp = this.extractTimestamp(node.data);
      const isActive = activeEventIds.has(node.id) || 
                      (nodeTimestamp && nodeTimestamp <= currentTime);

      return {
        ...node,
        style: {
          ...node.style,
          opacity: isActive ? 1.0 : 0.3,
          filter: isActive ? 'none' : 'grayscale(50%)',
          transition: `all ${this.config.animationDuration}ms ease-in-out`,
        },
        className: [
          node.className || '',
          isActive ? 'timeline-active' : 'timeline-inactive',
        ].filter(Boolean).join(' '),
      };
    });

    const filteredEdges = edges.map(edge => {
      const edgeTimestamp = this.extractTimestamp(edge.data);
      const isActive = activeEventIds.has(edge.id) || 
                      (edgeTimestamp && edgeTimestamp <= currentTime);

      return {
        ...edge,
        style: {
          ...edge.style,
          opacity: isActive ? 0.8 : 0.2,
          transition: `all ${this.config.animationDuration}ms ease-in-out`,
        },
        className: [
          edge.className || '',
          isActive ? 'timeline-active' : 'timeline-inactive',
        ].filter(Boolean).join(' '),
      };
    });

    return { nodes: filteredNodes, edges: filteredEdges };
  }

  // Subscribe to state changes
  onStateChange(callback: (state: PlaybackState) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  // Notify state change
  private notifyStateChange(): void {
    this.callbacks.forEach(callback => callback(this.playbackState));
  }

  // Export timeline data
  exportTimeline(): {
    events: TimelineEvent[];
    range: TimelineRange | null;
    config: TimelineScrubberConfig;
  } {
    return {
      events: this.events,
      range: this.timelineRange,
      config: this.config,
    };
  }

  // Import timeline data
  importTimeline(data: {
    events: TimelineEvent[];
    range?: TimelineRange;
    config?: Partial<TimelineScrubberConfig>;
  }): void {
    this.events = data.events || [];
    this.timelineRange = data.range || null;
    
    if (data.config) {
      this.config = { ...this.config, ...data.config };
    }

    this.setCurrentTime(this.timelineRange?.start || 0);
  }

  // Clear timeline
  clear(): void {
    this.events = [];
    this.timelineRange = null;
    this.playbackState = {
      isPlaying: false,
      currentTime: 0,
      currentIndex: 0,
      progress: 0,
      direction: 'forward',
      activeEvents: [],
    };
    this.stopPlayback();
    this.notifyStateChange();
  }

  // Cleanup
  dispose(): void {
    this.stopPlayback();
    this.callbacks.clear();
  }
}

// Export singleton instance
export const timelineScrubberService = new TimelineScrubberService();