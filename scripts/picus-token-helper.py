#!/usr/bin/env python3
"""
Picus Security API Token Helper
This script helps generate and test Picus Security refresh tokens for ThreatFlow integration.
"""

import requests
import json
import os
import time
from datetime import datetime, timedelta
from typing import Dict, Optional, Any


class PicusTokenHelper:
    def __init__(self, base_url: str = "https://api.picussecurity.com", token_file: str = "picus-tokens.json"):
        """
        Initialize Picus Token Helper

        Args:
            base_url: API base URL (default: https://api.picussecurity.com)
            token_file: JSON file to store tokens
        """
        self.base_url = base_url.rstrip('/')
        self.token_file = token_file
        self.refresh_token = None
        self.access_token = None
        self.token_expires_at = 0

    def load_tokens(self) -> bool:
        """Load tokens from JSON file"""
        if not os.path.exists(self.token_file):
            print(f"❌ Token file not found: {self.token_file}")
            return False

        try:
            with open(self.token_file, 'r') as f:
                token_data = json.load(f)

            self.refresh_token = token_data.get('refresh_token')
            self.access_token = token_data.get('access_token')
            stored_timestamp = token_data.get('timestamp')

            if not self.refresh_token:
                print("❌ No refresh_token found in token file")
                return False

            if self.refresh_token == 'your_refresh_token_here':
                print("❌ Please update the refresh_token in the token file")
                return False

            # Check token age
            if stored_timestamp:
                stored_date = datetime.fromtimestamp(stored_timestamp / 1000)
                current_date = datetime.now()
                age_days = (current_date - stored_date).days
                
                print(f"✅ Loaded refresh token (age: {age_days} days)")
                
                if age_days > 180:
                    print("⚠️ Refresh token is older than 6 months and may need regeneration")
                
                return True
            else:
                print("⚠️ No timestamp found, token age unknown")
                return True

        except Exception as e:
            print(f"❌ Error loading tokens: {e}")
            return False

    def save_tokens(self, refresh_token: str, access_token: str = None, expires_at: int = None):
        """Save tokens to JSON file"""
        token_data = {
            'refresh_token': refresh_token,
            'timestamp': int(time.time() * 1000),
            'created_at': datetime.now().isoformat()
        }
        
        if access_token:
            token_data['access_token'] = access_token
        if expires_at:
            token_data['expires_at'] = expires_at

        try:
            with open(self.token_file, 'w') as f:
                json.dump(token_data, f, indent=2)
            
            # Set restrictive permissions (Unix-like systems)
            try:
                os.chmod(self.token_file, 0o600)
                print(f"💾 Tokens saved to {self.token_file} with secure permissions")
            except:
                print(f"💾 Tokens saved to {self.token_file} (could not set permissions)")
                
        except Exception as e:
            print(f"❌ Error saving tokens: {e}")

    def create_example_token_file(self):
        """Create example token file"""
        token_data = {
            'refresh_token': 'your_refresh_token_here',
            'timestamp': int(time.time() * 1000),
            'created_at': datetime.now().isoformat(),
            '_instructions': [
                'Replace your_refresh_token_here with your actual Picus refresh token',
                'Get your token from Picus Security Console > API Settings',
                'This file will be automatically updated with access tokens'
            ]
        }

        try:
            with open(self.token_file, 'w') as f:
                json.dump(token_data, f, indent=2)
            print(f"📋 Example token file created: {self.token_file}")
            print("⚠️  Please update the refresh_token with your real token!")
        except Exception as e:
            print(f"❌ Error creating token file: {e}")

    def authenticate(self) -> bool:
        """Get access token using refresh token"""
        if not self.refresh_token:
            print("❌ No refresh token available")
            return False

        auth_url = f"{self.base_url}/v1/auth/token"
        payload = {"refresh_token": self.refresh_token}

        try:
            print(f"🔐 Authenticating with {auth_url}...")
            response = requests.post(auth_url, json=payload, timeout=30)
            response.raise_for_status()

            data = response.json()
            self.access_token = data.get("token")
            expire_at = data.get("expire_at")

            if self.access_token:
                if expire_at:
                    self.token_expires_at = expire_at
                    expire_time = datetime.fromtimestamp(expire_at)
                    print(f"✅ Authentication successful!")
                    print(f"   Access Token: {self.access_token[:20]}...")
                    print(f"   Expires: {expire_time}")
                else:
                    self.token_expires_at = int(time.time()) + 3600
                    print(f"✅ Authentication successful!")
                    print(f"   Access Token: {self.access_token[:20]}...")
                    print(f"   Expires: ~1 hour from now")

                # Save updated tokens
                self.save_tokens(self.refresh_token, self.access_token, self.token_expires_at)
                return True
            else:
                print("❌ No access token received")
                return False

        except requests.exceptions.Timeout:
            print("❌ Request timeout - check network connectivity")
            return False
        except requests.exceptions.ConnectionError:
            print("❌ Connection error - check base URL and network")
            return False
        except requests.exceptions.HTTPError as e:
            print(f"❌ HTTP error: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"   Status: {e.response.status_code}")
                print(f"   Response: {e.response.text}")
            return False
        except Exception as e:
            print(f"❌ Authentication error: {e}")
            return False

    def test_api_connection(self) -> bool:
        """Test API connection with access token"""
        if not self.access_token:
            print("❌ No access token available for testing")
            return False

        test_url = f"{self.base_url}/v1/agents"
        headers = {"Authorization": f"Bearer {self.access_token}"}

        try:
            print(f"🧪 Testing API connection to {test_url}...")
            response = requests.get(test_url, headers=headers, timeout=30)
            response.raise_for_status()

            data = response.json()
            agent_count = len(data.get('data', []))
            print(f"✅ API test successful!")
            print(f"   Found {agent_count} Picus agents")
            return True

        except requests.exceptions.HTTPError as e:
            print(f"❌ API test failed: HTTP {e.response.status_code}")
            if e.response.status_code == 401:
                print("   → Access token may be expired or invalid")
            elif e.response.status_code == 403:
                print("   → Insufficient permissions for this API endpoint")
            return False
        except Exception as e:
            print(f"❌ API test error: {e}")
            return False

    def get_token_status(self):
        """Display token status information"""
        print("\n" + "="*50)
        print("🔍 TOKEN STATUS")
        print("="*50)
        
        if self.refresh_token:
            is_placeholder = self.refresh_token == 'your_refresh_token_here'
            print(f"Refresh Token: {'❌ PLACEHOLDER' if is_placeholder else '✅ SET'}")
        else:
            print("Refresh Token: ❌ NOT SET")

        if self.access_token:
            current_time = int(time.time())
            if self.token_expires_at > current_time:
                remaining = self.token_expires_at - current_time
                print(f"Access Token: ✅ VALID (expires in {remaining//60} minutes)")
            else:
                print("Access Token: ⚠️ EXPIRED")
        else:
            print("Access Token: ❌ NOT SET")

        print(f"Base URL: {self.base_url}")
        print(f"Token File: {self.token_file}")

    def interactive_setup(self):
        """Interactive token setup wizard"""
        print("\n" + "="*50)
        print("🧙 PICUS TOKEN SETUP WIZARD")
        print("="*50)
        
        print("\nStep 1: Configuration")
        print(f"Current base URL: {self.base_url}")
        
        new_url = input("Enter Picus API URL (press Enter to keep current): ").strip()
        if new_url:
            self.base_url = new_url.rstrip('/')
            
        print("\nStep 2: Refresh Token")
        print("You need to get a refresh token from your Picus Security Console:")
        print("1. Log into your Picus Security Console")
        print("2. Go to API Settings or Admin > API Management")
        print("3. Generate or copy your refresh token")
        
        token = input("\nEnter your refresh token: ").strip()
        if not token:
            print("❌ No token provided, setup cancelled")
            return False
            
        self.refresh_token = token
        
        print("\nStep 3: Test Authentication")
        if self.authenticate():
            print("\nStep 4: Test API Access")
            if self.test_api_connection():
                print("\n🎉 Setup completed successfully!")
                print("Your ThreatFlow application should now be able to connect to Picus.")
                return True
            else:
                print("\n⚠️ Authentication worked but API test failed")
                print("This might be due to permissions or network issues")
                return True
        else:
            print("\n❌ Setup failed - please check your token and try again")
            return False


def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Picus Security API Token Helper")
    parser.add_argument("--base-url", default="https://api.picussecurity.com",
                       help="Picus API base URL")
    parser.add_argument("--token-file", default="picus-tokens.json",
                       help="Token file path")
    parser.add_argument("--setup", action="store_true",
                       help="Run interactive setup wizard")
    parser.add_argument("--test", action="store_true",
                       help="Test existing tokens")
    parser.add_argument("--status", action="store_true",
                       help="Show token status")
    parser.add_argument("--create-example", action="store_true",
                       help="Create example token file")
    
    args = parser.parse_args()
    
    helper = PicusTokenHelper(args.base_url, args.token_file)
    
    if args.create_example:
        helper.create_example_token_file()
        return
    
    if args.setup:
        helper.interactive_setup()
        return
    
    # Load existing tokens
    if not helper.load_tokens():
        print("💡 Use --create-example to create a token file, or --setup for interactive setup")
        return
    
    if args.status:
        helper.get_token_status()
        return
    
    if args.test:
        print("🧪 Testing Picus API integration...")
        if helper.authenticate():
            helper.test_api_connection()
        return
    
    # Default: show status and test
    helper.get_token_status()
    
    if helper.refresh_token and helper.refresh_token != 'your_refresh_token_here':
        print("\n🧪 Testing authentication...")
        if helper.authenticate():
            helper.test_api_connection()


if __name__ == "__main__":
    print("🔐 Picus Security API Token Helper for ThreatFlow")
    print("="*50)
    main()
    print("\n💡 For help: python picus-token-helper.py --help")