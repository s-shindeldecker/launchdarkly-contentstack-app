# LaunchDarkly + Contentstack CMS App

This Contentstack Marketplace App enables tighter collaboration between content teams and product teams by integrating LaunchDarkly's feature flag platform directly into the Contentstack entry editor.

## ✨ Key Features

- **Custom Field Extension**  
  Let editors map content entries or variants to LaunchDarkly flag variations directly inside the CMS.

- **Real-time Flag Integration**  
  Fetch and display LaunchDarkly flags and their variations in real-time within the Contentstack interface.

- **Smart Mapping System**  
  Automatically map Contentstack entries to specific LaunchDarkly flag variations with JSON storage.

- **Development & Production Ready**  
  Includes mock data for development and real API integration for production use.

## 🔧 Built With

- Contentstack App SDK (`@contentstack/app-sdk`)
- React + TypeScript
- LaunchDarkly REST APIs (flag management)
- Webpack for bundling
- Modern CSS with responsive design

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Contentstack account
- LaunchDarkly account (for production use)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd launchdarkly-contentstack-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **For development with hot reload**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### LaunchDarkly API Setup

To connect to your real LaunchDarkly project instead of using mock data:

#### 1. Get Your LaunchDarkly API Key

1. Go to your LaunchDarkly dashboard
2. Navigate to **Account Settings** → **Authorization**
3. Click **New API Key**
4. Set permissions:
   - `api:read` (required to read flags)
   - `api:write` (optional, for creating flags)
5. Copy the generated API key

#### 2. Set Environment Variables in Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Find your `launchdarkly-contentstack-app` project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

| Name | Value | Environment |
|------|-------|-------------|
| `LAUNCHDARKLY_API_KEY` | Your LaunchDarkly API key | Production |
| `LAUNCHDARKLY_ENVIRONMENT` | Your LD environment (e.g., `production`) | Production |

#### 3. Update app-config.json (Alternative)

If you prefer to configure via the app config, update the `config` section:

```json
{
  "config": {
    "launchdarkly": {
      "api_key": "your-launchdarkly-api-key-here",
      "environment": "production",
      "base_url": "https://app.launchdarkly.com/api/v2"
    }
  }
}
```

#### 4. Verify Configuration

After setting up the API key:
- The warning message "Using mock data" should disappear
- You should see your real LaunchDarkly flags instead of mock ones
- Check the browser console for confirmation messages

### Contentstack App Configuration

Update `app-config.json` with your specific settings:

```json
{
  "name": "LaunchDarkly Flag Variation Field",
  "host": "https://your-app-domain.com",
  "oauth": {
    "client_id": "your-contentstack-client-id",
    "client_secret": "your-contentstack-client-secret"
  },
  "config": {
    "launchdarkly": {
      "api_key": "your-launchdarkly-api-key",
      "environment": "production"
    }
  }
}
```

## 📦 Project Structure

```
launchdarkly-contentstack-app/
├── src/
│   ├── FlagVariationField.tsx    # Main custom field component
│   ├── services/
│   │   └── launchDarklyService.ts # LaunchDarkly API service
│   ├── styles.css                 # Component styles
│   └── index.tsx                 # Entry point
├── public/
│   ├── index.html                # HTML template
│   └── flag-selector.html        # Contentstack HTML wrapper
├── app-config.json              # Contentstack app configuration
├── package.json                 # Dependencies and scripts
├── webpack.config.js           # Build configuration
└── tsconfig.json               # TypeScript configuration
```

## 📊 JSON Data Structure

This extension uses a JSON structure that matches the [LaunchDarkly Contentstack Integration POC](https://github.com/s-shindeldecker/launchdarkly-contentstack-integration-poc) exactly:

### Saved Field Value Structure

```json
{
  "cmsType": "contentstack",
  "entryId": "blt0f6ddaddb7222b8d",
  "environment": "preview",
  "contentType": "page"
}
```

### Field Properties

- **`cmsType`** (string, required): Always set to `"contentstack"`
- **`entryId`** (string, required): The Contentstack entry UID
- **`environment`** (string, required): The environment (preview/production)
- **`contentType`** (string, required): The content type UID

This structure ensures consistency with your existing LaunchDarkly/Contentstack integration and allows seamless data flow between the custom field extension and your backend services.

## 🔧 Development

### Environment Variables

For production deployment, set these environment variables:

```bash
CONTENTSTACK_CLIENT_ID=your-client-id
CONTENTSTACK_CLIENT_SECRET=your-client-secret
LAUNCHDARKLY_API_KEY=your-launchdarkly-api-key
LAUNCHDARKLY_ENVIRONMENT=production
```

## 🎯 Usage

### Setting Up the Custom Field

1. **Register the App in Contentstack**
   - Go to your Contentstack organization
   - Navigate to Apps > Custom Apps
   - Upload the built extension or configure the hosted version

2. **Add the Custom Field to Content Types**
   - Edit your content type
   - Add a new field of type "Custom Field"
   - Select "LaunchDarkly Flag Variation" from the dropdown
   - Save the content type

3. **Using the Field in Entries**
   - Open any entry with the custom field
   - Select a LaunchDarkly flag from the dropdown
   - Choose the desired variation
   - Click "Save Mapping" to store the configuration

### Field Behavior

- **Flag Selection**: Dropdown populated with active LaunchDarkly flags
- **Variation Mapping**: Each flag's variations are loaded automatically
- **Data Storage**: Saves as JSON with flag key, selected variation, and entry reference
- **Preview**: Shows current mapping configuration before saving

## 🔧 Development

### Local Development

1. **Start development server**
   ```bash
   npm run dev
   ```

2. **Test with Contentstack**
   - Use the development URL in your Contentstack app configuration
   - The extension will use mock LaunchDarkly data for testing

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### API Integration

The extension supports both development (mock) and production (real API) modes:

- **Development**: Uses mock LaunchDarkly data for testing
- **Production**: Connects to real LaunchDarkly API with your API key

## 📊 Data Structure

The custom field saves data in this JSON format:

```json
{
  "flagKey": "feature-banner",
  "selected": 1,
  "value": {
    "cmsType": "contentstack",
    "entryId": "entry-uid-here",
    "environment": "preview",
    "contentType": "content-type-uid"
  }
}
```

## 🔒 Security Considerations

- API keys are stored securely in Contentstack app configuration
- All API calls use proper authentication headers
- No sensitive data is exposed in the frontend
- CORS is properly configured for Contentstack integration

## 🚀 Deployment

### Vercel Deployment

1. **Connect your repository to Vercel**
2. **Set environment variables** in Vercel dashboard
3. **Deploy** - Vercel will automatically build and deploy

### Manual Deployment

1. **Build the extension**
   ```bash
   npm run build
   ```

2. **Upload to your hosting provider**
   - Upload the `dist/` directory contents
   - Ensure HTTPS is enabled

3. **Update Contentstack configuration**
   - Point to your hosted URL
   - Configure OAuth settings

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Create an issue in this repository
- Contact the development team
- Check Contentstack and LaunchDarkly documentation

---

**Status**: This app is currently in development and is designed for Contentstack internal use or private app registration. Public Marketplace submission planned.


