export interface LaunchDarklyFlag {
  key: string;
  name: string;
  description?: string;
  variations: LaunchDarklyVariation[];
  on: boolean;
  archived: boolean;
}

export interface LaunchDarklyVariation {
  name: string;
  description?: string;
  value: any;
  _id: string;
}

export interface LaunchDarklyError {
  code: string;
  message: string;
}

class LaunchDarklyService {
  private apiKey: string;
  private projectKey: string;
  private environment: string;
  private baseApiUrl: string;

  constructor(apiKey: string, projectKey: string, environment: string = 'production') {
    this.apiKey = apiKey;
    this.projectKey = projectKey;
    this.environment = environment;
    // Use full Vercel app URL for the API proxy
    this.baseApiUrl = 'https://launchdarkly-contentstack-app.vercel.app/api/launchdarkly';
  }

  async getFlags(): Promise<LaunchDarklyFlag[]> {
    try {
      const response = await fetch(`${this.baseApiUrl}?projectKey=${encodeURIComponent(this.projectKey)}&environment=${encodeURIComponent(this.environment)}`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error: LaunchDarklyError = await response.json();
        throw new Error(`LaunchDarkly API Error: ${error.message || response.statusText}`);
      }

      const flags: any[] = await response.json();
      // API returns minimal shape [{ key, name }]; normalize to LaunchDarklyFlag
      return flags.map((f) => ({
        key: f.key,
        name: f.name,
        description: f.description,
        variations: Array.isArray(f.variations) ? f.variations : [],
        on: f.on ?? true,
        archived: f.archived ?? false,
      }));
    } catch (error) {
      console.error('Error fetching LaunchDarkly flags:', error);
      throw error;
    }
  }

  async getFlag(key: string): Promise<LaunchDarklyFlag> {
    try {
      const response = await fetch(`${this.baseApiUrl}?projectKey=${encodeURIComponent(this.projectKey)}&environment=${encodeURIComponent(this.environment)}&flagKey=${encodeURIComponent(key)}`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error: LaunchDarklyError = await response.json();
        throw new Error(`LaunchDarkly API Error: ${error.message || response.statusText}`);
      }

      const data: any = await response.json();
      return {
        key: data.key,
        name: data.name ?? data.key,
        description: data.description,
        variations: Array.isArray(data.variations) ? data.variations : [],
        on: true,
        archived: false,
      };
    } catch (error) {
      console.error(`Error fetching LaunchDarkly flag ${key}:`, error);
      throw error;
    }
  }

  async getFlagVariations(key: string): Promise<LaunchDarklyVariation[]> {
    try {
      const flag = await this.getFlag(key);
      return flag.variations;
    } catch (error) {
      console.error(`Error fetching variations for flag ${key}:`, error);
      throw error;
    }
  }

  // Mock method for development/testing
  getMockFlags(): LaunchDarklyFlag[] {
    return [
      {
        key: 'welcome-message',
        name: 'Welcome Message',
        description: 'Controls the welcome message shown to users',
        variations: [
          { name: 'Default', description: 'Standard welcome message', value: 'Welcome!', _id: '1' },
          { name: 'Personalized', description: 'Personalized welcome message', value: 'Welcome back!', _id: '2' },
          { name: 'Promotional', description: 'Promotional welcome message', value: 'Welcome! Check out our latest offers!', _id: '3' }
        ],
        on: true,
        archived: false
      },
      {
        key: 'feature-banner',
        name: 'Feature Banner',
        description: 'Controls the feature banner visibility',
        variations: [
          { name: 'Hidden', description: 'Banner is hidden', value: false, _id: '4' },
          { name: 'Visible', description: 'Banner is visible', value: true, _id: '5' }
        ],
        on: true,
        archived: false
      },
      {
        key: 'user-experience',
        name: 'User Experience',
        description: 'Controls the user experience features',
        variations: [
          { name: 'Basic', description: 'Basic user experience', value: 'basic', _id: '6' },
          { name: 'Enhanced', description: 'Enhanced user experience', value: 'enhanced', _id: '7' },
          { name: 'Premium', description: 'Premium user experience', value: 'premium', _id: '8' }
        ],
        on: true,
        archived: false
      }
    ];
  }

  getMockVariations(flagKey: string): LaunchDarklyVariation[] {
    const flag = this.getMockFlags().find(f => f.key === flagKey);
    return flag ? flag.variations : [];
  }
}

export default LaunchDarklyService; 