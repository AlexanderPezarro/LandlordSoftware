import { useEffect, useState } from 'react';

interface HealthResponse {
  status: string;
  timestamp: string;
}

function App() {
  const [serverStatus, setServerStatus] = useState<string>('checking...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/health');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: HealthResponse = await response.json();
        setServerStatus(data.status);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect to server');
        setServerStatus('error');
      }
    };

    checkHealth();
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Landlord Management System</h1>
      <div style={{ marginTop: '1rem' }}>
        <strong>Server status:</strong>{' '}
        <span style={{ color: serverStatus === 'ok' ? 'green' : 'red' }}>
          {serverStatus}
        </span>
      </div>
      {error && (
        <div style={{ marginTop: '0.5rem', color: 'red' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}

export default App;
