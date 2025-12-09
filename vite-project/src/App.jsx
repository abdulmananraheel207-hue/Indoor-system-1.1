import { useState, useEffect } from 'react';

function App() {
  const [backendStatus, setBackendStatus] = useState('Checking...');
  const [dbStatus, setDbStatus] = useState('Not checked');

  // Test backend connection
  const testBackend = async () => {
    try {
      setBackendStatus('Connecting...');
      const response = await fetch('http://localhost:5000/api/health');
      const data = await response.json();

      setBackendStatus('✅ Connected!');
      setDbStatus(data.database);
    } catch (error) {
      setBackendStatus('❌ Failed to connect');
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    testBackend();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Connection Test</h1>

      <div style={{ margin: '20px 0' }}>
        <h3>Backend Status:</h3>
        <p style={{
          color: backendStatus.includes('✅') ? 'green' : 'red',
          fontWeight: 'bold'
        }}>
          {backendStatus}
        </p>
      </div>

      <div style={{ margin: '20px 0' }}>
        <h3>Database Status:</h3>
        <p>{dbStatus}</p>
      </div>

      <button
        onClick={testBackend}
        style={{ padding: '10px 20px', fontSize: '16px' }}
      >
        Test Connection Again
      </button>

      {backendStatus.includes('✅') && (
        <div style={{
          marginTop: '30px',
          padding: '20px',
          background: '#e6f7e6',
          borderRadius: '5px'
        }}>
          <h2>🎉 Success!</h2>
          <p>Your frontend is connected to backend at: http://localhost:5000</p>
        </div>
      )}
    </div>
  );
}

export default App;