function VisualInsights({ predictions, view }) {
  if (!predictions.behavioral || !predictions.neural) {
    return (
      <div style={{ border: '1px solid gray', padding: 15, marginBottom: 20 }}>
        <h2>Visual Insights</h2>
        <p>Run predictions to see visual insights.</p>
      </div>
    );
  }

  // --- MOCK VISUALS ---
  const gazeHeatmap = Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => Math.floor(Math.random() * 100))
  );

  const featureContribution = [
    { name: 'Reaction Time', value: predictions.behavioral * 50 },
    { name: 'Age', value: predictions.behavioral * 30 },
    { name: 'Alpha Band', value: predictions.neural * 40 },
    { name: 'Beta Band', value: predictions.neural * 40 },
  ];

  const counterfactualEffect = [
    { label: 'Original', value: predictions.behavioral },
    { label: 'Counterfactual', value: predictions.neural },
  ];

  // --- View-based messages ---
  let explanationText = '';
  if (view === 'Consumer') explanationText = 'Simple language: this shows which factors influence your purchase likelihood.';
  if (view === 'Marketer') explanationText = 'Actionable insights: adjust marketing to maximize behavioral response.';
  if (view === 'Researcher') explanationText = 'Technical details: neural and behavioral contributions shown with simulated data.';

  return (
    <div style={{ border: '1px solid gray', padding: 15, marginBottom: 20 }}>
      <h2>Visual Insights ({view} View)</h2>
      <p>{explanationText}</p>

      {/* Feature Contribution Donut Mock */}
      <div style={{ marginBottom: 15 }}>
        <h3>Feature Contributions (Mock Donut)</h3>
        {featureContribution.map((f) => (
          <div key={f.name} style={{ marginBottom: 5 }}>
            <span>{f.name}: </span>
            <div
              style={{
                display: 'inline-block',
                height: '10px',
                width: `${f.value}%`,
                backgroundColor: '#673ab7',
                marginLeft: 5,
              }}
            />
          </div>
        ))}
      </div>

      {/* Counterfactual Effect */}
      <div style={{ marginBottom: 15 }}>
        <h3>Counterfactual Effect</h3>
        {counterfactualEffect.map((c) => (
          <div key={c.label}>
            <span>{c.label}: </span>
            <div
              style={{
                display: 'inline-block',
                height: '10px',
                width: `${c.value * 100}%`,
                backgroundColor: '#ff9800',
                marginLeft: 5,
              }}
            />
          </div>
        ))}
      </div>

      {/* Gaze Heatmap */}
      <div>
        <h3>Gaze Heatmap (Mock)</h3>
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {gazeHeatmap.map((row, i) => (
              <tr key={i}>
                {row.map((val, j) => (
                  <td
                    key={j}
                    style={{
                      width: 20,
                      height: 20,
                      backgroundColor: `rgba(255,0,0,${val / 100})`,
                      border: '1px solid #ccc',
                    }}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default VisualInsights;
