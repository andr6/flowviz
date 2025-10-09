// Base AI Provider with common functionality

import { AIProvider, StreamingResponse } from './types';

export abstract class BaseAIProvider implements AIProvider {
  abstract config: any;
  
  // Common prompt for attack flow extraction
  protected getSystemPrompt(): string {
    return `You are a cybersecurity expert specializing in attack flow analysis using the MITRE ATT&CK framework.

CRITICAL INSTRUCTIONS:
- Extract attack techniques, tools, assets, and infrastructure ONLY from the provided content
- DO NOT infer, assume, or generate details not explicitly mentioned
- Create nodes and edges that represent the actual attack flow described
- Use exact MITRE ATT&CK technique IDs and tactic names
- Include 2-3 sentence excerpts directly from the source to validate each extraction

RESPONSE FORMAT:
Respond with valid JSON containing nodes and edges arrays. Each response should be a complete JSON object on its own line.

NODE TYPES:
- action: MITRE ATT&CK techniques (requires technique_id, tactic_id, tactic_name)
- tool: Software/scripts used (include command_line if mentioned)
- malware: Malicious software
- asset: Target systems/data
- infrastructure: C2 servers, domains
- url: Web resources
- vulnerability: CVEs or security flaws
- operator: Threat actors/groups

EDGE TYPES:
- "Uses": action → tool/malware
- "Targets": action → asset
- "Communicates with": action → infrastructure
- "Connects to": action → url
- "Affects": vulnerability → asset
- "Leads to": action → action (attack progression)`;
  }

  protected parseStreamingResponse(chunk: string): StreamingResponse[] {
    const responses: StreamingResponse[] = [];
    const lines = chunk.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      try {
        if (line.startsWith('{') && line.endsWith('}')) {
          const data = JSON.parse(line);
          
          // Convert parsed data to streaming responses
          if (data.nodes) {
            // Handle nodes
            for (const node of data.nodes) {
              responses.push({
                type: 'node',
                data: node
              });
            }
          }
          
          if (data.edges) {
            // Handle edges
            for (const edge of data.edges) {
              responses.push({
                type: 'edge',
                data: edge
              });
            }
          }
          
          if (data.error) {
            responses.push({
              type: 'error',
              error: data.error,
              data
            });
          }
        }
      } catch (e) {
        // Skip invalid JSON
        continue;
      }
    }
    
    return responses;
  }

  protected emitProgress(
    onProgress: (response: StreamingResponse) => void,
    stage: string,
    message: string
  ) {
    onProgress({
      type: 'progress',
      stage,
      message,
      data: {}
    });
  }

  abstract streamAnalysis(params: {
    text: string;
    images?: Array<{ data: string; mediaType: string }>;
    onProgress: (response: StreamingResponse) => void;
    onComplete: () => void;
    onError: (error: Error) => void;
  }): Promise<void>;

  abstract isHealthy(): Promise<boolean>;
}