# Picus Security Integration Setup Guide

This guide will help you configure the Picus Security integration for ThreatFlow's IOC enrichment system.

## Overview

The Picus Security integration provides:
- **Threat Validation**: Test IOCs against security controls
- **IOC Enrichment**: Enhanced threat intelligence from Picus feeds  
- **Security Control Testing**: Automated validation of detection capabilities
- **Threat Intelligence**: Campaign and actor attribution data

## Configuration Options

### Method 1: Environment Variables (Recommended)

Set these environment variables in your `.env` file or system environment:

```bash
# Required
PICUS_BASE_URL=https://api.picussecurity.com
PICUS_REFRESH_TOKEN=your_actual_refresh_token_here

# Optional (for legacy client credentials flow)
PICUS_CLIENT_ID=your_client_id_here
PICUS_CLIENT_SECRET=your_client_secret_here
```

### Method 2: Token File Configuration

Create a `picus-tokens.json` file in your project root:

```json
{
  "refresh_token": "your_actual_refresh_token_here",
  "timestamp": 1642248600000,
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

**Important Security Notes:**
- The token file has restrictive permissions (600) set automatically
- Never commit tokens to version control
- Add `picus-tokens.json` to your `.gitignore`

## Getting Your Picus Refresh Token

### Option 1: Use the Python Authentication Script

A Python script (`authentication.py`) is provided to help generate and manage tokens:

```python
#!/usr/bin/env python3
"""
Picus Customer API Authentication Example
"""

import requests
import json
import os
from typing import Dict, Optional, Any
import time
from datetime import datetime, timedelta

class PicusAPIClient:
    def __init__(self, base_url: str, token_file: str = "picus-tokens.json"):
        self.base_url = base_url.rstrip('/')
        self.token_file = token_file
        self.refresh_token = None
        self.access_token = None
        self.token_expires_at = 0
        
        self._load_and_refresh_tokens()

    def authenticate(self) -> bool:
        """Get access token using refresh token"""
        auth_url = f"{self.base_url}/v1/auth/token"
        
        payload = {"refresh_token": self.refresh_token}
        
        try:
            response = requests.post(auth_url, json=payload)
            response.raise_for_status()
            
            data = response.json()
            self.access_token = data.get("token")
            expire_at = data.get("expire_at")
            
            if expire_at:
                self.token_expires_at = expire_at
            else:
                self.token_expires_at = time.time() + 3600
                
            print(f"✅ Authentication successful!")
            return True
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Authentication error: {e}")
            return False

# Usage
client = PicusAPIClient("https://api.picussecurity.com")
if client.authenticate():
    print("✅ Token is valid and working")
else:
    print("❌ Token authentication failed")
```

### Option 2: Manual Token Configuration

1. **Log into your Picus Security Console**
2. **Navigate to API Settings**
3. **Generate a new refresh token**
4. **Copy the token** and add it to your configuration

## Verification

### Check Configuration Status

You can verify your Picus configuration using the API:

```bash
curl -X GET http://localhost:3001/api/ioc-enrichment/providers
```

Look for `"picusConnected": true` in the response.

### Test the Integration

```bash
# Test basic enrichment with Picus
curl -X POST http://localhost:3001/api/ioc-enrichment/enrich-with-picus \
  -H "Content-Type: application/json" \
  -d '{
    "indicators": [
      {
        "type": "ip-addr",
        "value": "1.2.3.4",
        "context": "test indicator"
      }
    ],
    "sources": ["picus_security"],
    "priority": "medium",
    "organizationId": "test-org"
  }'
```

## Configuration Validation

The system automatically validates your configuration on startup. Check the logs for:

```
✅ Picus configuration initialized successfully
✅ Picus Security Service initialized
```

If you see errors like:
```
⚠️ Picus Security integration disabled (not configured)
❌ Authentication failed: fetch failed
```

This means your configuration needs to be updated.

## Token Management

### Automatic Token Refresh

The system automatically:
- **Refreshes access tokens** when they expire (typically every hour)
- **Saves tokens securely** to the token file
- **Validates token age** and warns if refresh tokens are old

### Token Regeneration

Refresh tokens expire after **6 months**. The system will automatically detect when tokens need regeneration and attempt to refresh them.

If automatic regeneration fails, you'll need to generate a new refresh token manually.

### Security Features

- **Secure file permissions** (600) for token files
- **Environment variable support** for containerized deployments  
- **Automatic token cleanup** and validation
- **Rate limiting** and API protection
- **Error recovery** with intelligent retry logic

## Troubleshooting

### Common Issues

#### 1. "Configuration not available"
**Cause**: Missing `PICUS_BASE_URL` or token
**Solution**: Set environment variables or create token file

#### 2. "Authentication failed: fetch failed"  
**Cause**: Invalid base URL or network connectivity
**Solution**: Verify base URL format and network access

#### 3. "Invalid refresh token"
**Cause**: Token expired or malformed
**Solution**: Generate new refresh token from Picus console

#### 4. "Rate limit exceeded"
**Cause**: Too many API requests
**Solution**: Reduce request frequency or contact Picus support

### Debug Mode

Enable debug logging to troubleshoot issues:

```bash
export LOG_LEVEL=debug
export DEBUG_PICUS=true
npm run server
```

### Health Check

```bash
# Check Picus service status
curl http://localhost:3001/api/ioc-enrichment/stats

# View configuration summary
curl http://localhost:3001/api/ioc-enrichment/providers
```

### Configuration Summary

The system provides a configuration summary for debugging:

```json
{
  "enabled": true,
  "baseUrl": "https://api.picussecurity.com",
  "hasRefreshToken": true,
  "hasAccessToken": true,
  "tokenExpired": false,
  "configValid": true
}
```

## Environment Setup Examples

### Development (.env file)
```bash
# Picus Security Configuration
PICUS_BASE_URL=https://api.picussecurity.com
PICUS_REFRESH_TOKEN=your_development_token_here
```

### Production (Docker/Kubernetes)
```bash
# Environment variables
PICUS_BASE_URL=https://api.picussecurity.com
PICUS_REFRESH_TOKEN=your_production_token_here

# Or use secrets management
# PICUS_REFRESH_TOKEN_SECRET_PATH=/var/secrets/picus-token
```

### Docker Compose
```yaml
version: '3.8'
services:
  threatflow:
    image: threatflow:latest
    environment:
      - PICUS_BASE_URL=https://api.picussecurity.com
      - PICUS_REFRESH_TOKEN=${PICUS_REFRESH_TOKEN}
    volumes:
      - ./picus-tokens.json:/app/picus-tokens.json:ro
```

## Security Best Practices

1. **Never commit tokens** to version control
2. **Use environment variables** in production
3. **Rotate tokens regularly** (every 3-6 months)
4. **Monitor token usage** and access logs
5. **Use secure file permissions** (600) for token files
6. **Enable audit logging** for all Picus API calls
7. **Implement network security** (VPN, firewall rules)

## Support

If you need help with Picus integration:

1. **Check the logs** for detailed error messages
2. **Verify network connectivity** to Picus servers
3. **Validate token permissions** in Picus console
4. **Contact Picus support** for API-related issues
5. **Review ThreatFlow documentation** for configuration help

The integration is designed to fail gracefully - if Picus is not available, the rest of the IOC enrichment system will continue to work with other providers.