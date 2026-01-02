function EthicalScoreboard({ predictions }) {
  if (!predictions.behavioral || !predictions.neural) {
    return (
      <div style={{ border: '1px solid gray', padding: 15, marginBottom: 20 }}>
        <h2>Ethical Scoreboard</h2>
        <p>Run predictions to view ethical metrics.</p>
      </div>
    );
  }

  // --- MOCK CALCULATION ---
  const trustIndex = Math.min(100, ((1 - Math.abs(predictions.behavioral - predictions.neural)) * 100).toFixed(0));

  let biasRisk = 'Low';
  if (Math.abs(predictions.behavioral - predictions.neural) > 0.25) biasRisk = 'Medium';
  if (Math.abs(predictions.behavioral - predictions.neural) > 0.5) biasRisk = 'High';

  const manipulationRisk = Math.min(100, ((predictions.behavioral * 0.5 + predictions.neural * 0.5) * 100).toFixed(0));
  const transparencyScore = Math.min(100, ((predictions.behavioral * 0.7 + predictions.neural * 0.3) * 100).toFixed(0));

  // --- Styles for badges ---
  const riskColor = biasRisk === 'Low' ? 'green' : biasRisk === 'Medium' ? 'orange' : 'red';

  return (
    <div style={{ border: '1px solid gray', padding: 15, marginBottom: 20 }}>
      <h2>Ethical Scoreboard</h2>

      <div style={{ marginBottom: 10 }}>
        <label>Trust Index:</label>
        <div style={{ width: '100%', backgroundColor: '#ddd', height: 20 }}>
          <div style={{ width: `${trustIndex}%`, backgroundColor: '#4caf50', height: '100%' }} />
        </div>
        <p>{trustIndex}%</p>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>Bias Risk:</label>
        <span
          style={{
            marginLeft: 10,
            padding: '2px 8px',
            backgroundColor: riskColor,
            color: 'white',
            borderRadius: 5,
          }}
        >
          {biasRisk}
        </span>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>Manipulation Risk:</label>
        <div style={{ width: '100%', backgroundColor: '#ddd', height: 20 }}>
          <div style={{ width: `${manipulationRisk}%`, backgroundColor: '#f44336', height: '100%' }} />
        </div>
        <p>{manipulationRisk}%</p>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>Transparency Score:</label>
        <div style={{ width: '100%', backgroundColor: '#ddd', height: 20 }}>
          <div style={{ width: `${transparencyScore}%`, backgroundColor: '#2196f3', height: '100%' }} />
        </div>
        <p>{transparencyScore}%</p>
      </div>

      {biasRisk !== 'Low' && <p style={{ color: 'red' }}>⚠️ Gender influence or feature mismatch exceeds ethical threshold</p>}
    </div>
  );
}

export default EthicalScoreboard;

