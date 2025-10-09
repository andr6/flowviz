# Picus Security Integration UI - Testing Instructions

✅ **Picus API configuration has been successfully added to the ThreatFlow Settings UI**

## Current Setup Status

- ✅ **Frontend**: Running on http://localhost:5174
- ✅ **Backend**: Running on http://localhost:3001  
- ✅ **Picus Integration**: Fully implemented and functional
- ✅ **API Endpoint**: `/api/test-picus` endpoint working

## How to Access and Test Picus Integration

### Step 1: Open ThreatFlow Application
1. Navigate to: **http://localhost:5174**
2. Wait for the application to fully load

### Step 2: Access Settings
1. Look for the **Settings icon (⚙️)** in the top-right corner of the application
2. Click the Settings icon to open the Settings dialog

### Step 3: Find Picus Security Integration Section
1. In the Settings dialog, scroll down to find the **"Picus Security Integration"** section
2. This section should appear after the "AI Provider" section and before "Story Mode"

### Step 4: Enable Picus Integration
1. You will see a toggle switch labeled **"Enable Picus Security IOC Enrichment"**
2. Click the toggle to **enable** Picus integration
3. Once enabled, two additional fields will appear:
   - **Picus API Base URL** (pre-filled with `https://api.picussecurity.com`)
   - **Refresh Token** (password field for your Picus refresh token)

### Step 5: Configure Picus API
1. **Base URL**: Leave as default `https://api.picussecurity.com` or change if needed
2. **Refresh Token**: Enter your actual Picus Security refresh token
   - Get this from: Picus Security Console → API Settings
   - Format: Should be a JWT-like token string

### Step 6: Test Connection
1. After entering both fields, click the **"Test"** button
2. The button will show a loading spinner while testing
3. Check browser console for connection results:
   - ✅ Success: "Successfully connected to Picus Security. Found X agents."
   - ❌ Error: Detailed error message explaining the issue

### Step 7: Save Settings
1. Click **"Save Settings"** to store your configuration
2. Settings are automatically saved to secure storage
3. You should see a success toast notification

## Expected UI Components

The Picus Security Integration section should contain:

```
┌─ Picus Security Integration ─────────────────────────┐
│                                                      │
│ Enable Picus Security IOC Enrichment    [Toggle]    │
│                                                      │
│ [When enabled:]                                      │
│ ┌─ Picus API Base URL ──────────────────────────┐    │
│ │ https://api.picussecurity.com              │    │
│ └─────────────────────────────────────────────────┘    │
│                                                      │
│ ┌─ Refresh Token ──────────────────┐ ┌─ Test ─┐     │
│ │ ••••••••••••••••••••••••••••••   │ │       │     │
│ └─────────────────────────────────┘ └───────┘     │
│                                                      │
│ 💡 Get your refresh token from Picus Security       │
│    Console → API Settings                           │
└────────────────────────────────────────────────────┘
```

## Debug Information

If you don't see the Picus section, check the browser console for:

1. **Settings Loading Debug Messages**:
   ```
   🔧 Settings Dialog opened with providerSettings: {...}
   🔧 Picus settings: {...}
   ```

2. **Provider Settings Debug Messages**:
   ```
   🔧 No stored settings found, using defaults
   🔧 Default Picus settings: {baseUrl: "...", refreshToken: "", enabled: false}
   ```

## Troubleshooting

### If Picus Section is Missing:
1. Check browser console for JavaScript errors
2. Ensure the frontend dev server reloaded after changes
3. Hard refresh the browser (Ctrl+F5 / Cmd+Shift+R)

### If Test Connection Fails:
1. Verify the Picus API base URL is correct
2. Check that your refresh token is valid
3. Ensure network connectivity to Picus API
4. Check backend logs for detailed error messages

### If Settings Won't Save:
1. Check browser console for storage errors
2. Ensure localStorage is available
3. Verify the provider settings hook is working

## Technical Implementation

- **Frontend**: React component with Material-UI styling
- **State Management**: Integrated with useProviderSettings hook
- **Storage**: Secure storage with automatic persistence
- **API Testing**: Real authentication flow with Picus API
- **Error Handling**: Comprehensive error messages and recovery

## API Endpoints

- **Test Connection**: `POST /api/test-picus`
- **Settings Storage**: Automatic via secure storage service

The Picus integration is now fully functional and ready for use!