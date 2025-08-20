# LaunchDarkly Contentstack App

A custom field extension and sidebar widget for Contentstack that allows you to select LaunchDarkly feature flags and variations.

## Features

- **Custom Field Extension**: Map entries to LaunchDarkly flag variations
- **Sidebar Widget**: View and manage feature flags for entries in the sidebar
- Connect to LaunchDarkly API to fetch real-time flag data
- Select from available feature flags
- Choose specific flag variations
- Save flag selections to Contentstack entries
- Fallback to mock data when API is unavailable

## Installation

1. Install the app in your Contentstack organization
2. Configure LaunchDarkly API credentials in the app settings
3. Add the custom field to your content types OR add the sidebar widget to your entry editor
4. Use the field/widget in your entries

## Configuration

### LaunchDarkly Settings

- **API Key**: Your LaunchDarkly API key
- **Project Key**: Your LaunchDarkly project key
- **Environment Key**: Your LaunchDarkly environment key (defaults to 'production')

### Content Type Setup

#### Option 1: Custom Field
1. Go to your content type settings
2. Add a new field of type "Custom Field"
3. Select "LaunchDarkly Flag Variation" from the custom field options
4. Save the content type

#### Option 2: Sidebar Widget
1. Go to your content type settings
2. In the "Sidebar Widgets" section, add "LaunchDarkly Integration"
3. Save the content type

## Usage

### Custom Field Mode
- Use within entry forms to select and save flag variations
- Supports editing and saving flag selections
- Stores data in the entry's custom field

### Sidebar Widget Mode
- Displays in the entry editor sidebar
- Shows current entry information and flag assignments
- Displays available flags and variations
- Read-only view of flag data (no editing capabilities)

## Troubleshooting

### Field Appears as "Display Only"

If the custom field appears as display-only instead of allowing selection:

1. **Check App Installation**: Ensure the app is properly installed in your Contentstack organization
2. **Verify Content Type Setup**: Make sure the custom field is added to your content type
3. **Check Entry Context**: Ensure you're editing an entry (not just viewing)
4. **Refresh the Page**: Try refreshing the entry editor
5. **Check Console**: Open browser developer tools and check for error messages
6. **Verify App Configuration**: Check that the app is configured with valid LaunchDarkly credentials

### Common Issues

- **"Custom Field Context Not Available"**: The app is not being loaded in the right context. Make sure it's added as a custom field to a content type.
- **"Field not found"**: The SDK is not properly initialized. Try refreshing the page.
- **"API connection failed"**: Check your LaunchDarkly API credentials and network connectivity.
- **Sidebar Widget not showing**: Ensure the sidebar widget is added to your content type's sidebar configuration.

### Debug Mode

The app includes extensive debugging information. To access it:

1. Open the custom field or sidebar widget in an entry
2. Look for the "🧪 Debug Info" section
3. Expand it to see detailed status information
4. Use the "Test Field" button to verify field functionality (Custom Field mode only)

## Development

### Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm start`
4. Update `app-config.json` with your local development URL

### Building for Production

1. Build the app: `npm run build`
2. Deploy the built files to your hosting provider
3. Update `app-config.json` with your production URL

## API Endpoints

- `GET /api/launchdarkly/flags` - Fetch available flags
- `GET /api/launchdarkly/flags/[flagKey]` - Get specific flag details
- `GET /api/launchdarkly/flags/[flagKey]/variations` - Get flag variations

## License

MIT License


