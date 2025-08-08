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
  private environment: string;
  private proxyUrl: string;

  constructor(apiKey: string, environment: string = 'production') {
    this.apiKey = apiKey;
    this.environment = environment;
    // Use our Vercel serverless function as a proxy
    this.proxyUrl = 'https://launchdarkly-contentstack-app.vercel.app/api/launchdarkly';
  }

  private async makeRequest<T>(action: string, flagKey?: string): Promise<T> {
    const params = new URLSearchParams({
      action,
      environment: this.environment,
      ...(flagKey && { flagKey })
    });

    const response = await fetch(`${this.proxyUrl}?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error: LaunchDarklyError = await response.json();
      throw new Error(`LaunchDarkly API Error: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  async getFlags(): Promise<LaunchDarklyFlag[]> {
    try {
      const flags = await this.makeRequest<LaunchDarklyFlag[]>('flags');
      return flags.filter(flag => !flag.archived && flag.on);
    } catch (error) {
      console.error('Error fetching LaunchDarkly flags:', error);
      throw error;
    }
  }

  async getFlag(key: string): Promise<LaunchDarklyFlag> {
    try {
      return await this.makeRequest<LaunchDarklyFlag>('flag', key);
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
        key: 'feature-banner',
        name: 'Feature Banner',
        description: 'Controls the display of promotional banners',
        on: true,
        archived: false,
        variations: [
          {
            _id: 'control',
            name: 'Control (Default)',
            description: 'Default banner behavior',
            value: null
          },
          {
            _id: 'variation-a',
            name: 'Variation A',
            description: 'Show promotional banner A',
            value: 'banner-a'
          },
          {
            _id: 'variation-b',
            name: 'Variation B',
            description: 'Show promotional banner B',
            value: 'banner-b'
          }
        ]
      },
      {
        key: 'content-personalization',
        name: 'Content Personalization',
        description: 'Enables personalized content delivery',
        on: true,
        archived: false,
        variations: [
          {
            _id: 'control',
            name: 'Control (Default)',
            description: 'Standard content delivery',
            value: null
          },
          {
            _id: 'variation-a',
            name: 'Personalized A',
            description: 'Personalized content variation A',
            value: 'personalized-a'
          }
        ]
      }
    ];
  }

  getMockVariations(flagKey: string): LaunchDarklyVariation[] {
    const flags = this.getMockFlags();
    const flag = flags.find(f => f.key === flagKey);
    return flag?.variations || [];
  }
}

export default LaunchDarklyService; 