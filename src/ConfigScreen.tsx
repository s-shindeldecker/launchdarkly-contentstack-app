import React, { useEffect, useState } from 'react';
import ContentstackAppSDK from '@contentstack/app-sdk';

const ConfigScreen: React.FC = () => {
  const [sdk, setSdk] = useState<any>(null);
  const [projectKey, setProjectKey] = useState('');
  const [environmentKey, setEnvironmentKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const instance = await ContentstackAppSDK.init();
        setSdk(instance);
        const params = instance?.parameters?.installation || {};
        setProjectKey(params.projectKey || '');
        setEnvironmentKey(params.environmentKey || '');
        setLoading(false);
      } catch (e: any) {
        setError(e?.message || 'Failed to initialize');
        setLoading(false);
      }
    })();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sdk) return;
    setError(null);
    try {
      await sdk.app.setInstallationParameters({ projectKey, environmentKey });
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    }
  };

  const onChangeProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProjectKey(e.target.value);
    setDirty(true);
  };

  const onChangeEnv = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEnvironmentKey(e.target.value);
    setDirty(true);
  };

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <h2 style={{ marginBottom: 12 }}>LaunchDarkly Configuration</h2>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 6 }} htmlFor="projectKey">
          <span>LaunchDarkly Project Key</span>
          <input
            id="projectKey"
            type="text"
            value={projectKey}
            onChange={onChangeProject}
            placeholder="e.g. website"
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }} htmlFor="environmentKey">
          <span>LaunchDarkly Environment Key</span>
          <input
            id="environmentKey"
            type="text"
            value={environmentKey}
            onChange={onChangeEnv}
            placeholder="e.g. production"
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
          />
        </label>
        {error && <div style={{ color: '#b00020' }}>{error}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="submit" disabled={!dirty} style={{ padding: '8px 12px' }}>Save</button>
          {saved && <span style={{ color: '#0a7f36' }}>Saved ✓</span>}
        </div>
      </form>
      <p style={{ marginTop: 16, color: '#555', fontSize: 12 }}>
        Your LaunchDarkly API key is managed securely in your hosting environment and is not configured here.
      </p>
    </div>
  );
};

export default ConfigScreen; 