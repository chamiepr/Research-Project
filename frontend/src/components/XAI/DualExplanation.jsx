function DualExplanation({ predictions }) {
  // Mock feature importance
  const behavioralFeatures = [
    { name: 'Reaction Time', importance: predictions.behavioral ? predictions.behavioral * 50 : 0 },
    { name: 'Age', importance: predictions.behavioral ? predictions.behavioral * 30 : 0 },
    { name: 'Most Looked Factor', importance: predictions.behavioral ? predictions.behavioral * 20 : 0 },
  ];

  const neuralFeatures = [
    { name: 'Alpha Band', importance: predictions.neural ? predictions.neural * 40 : 0 },
    { name: 'Beta Band', importance: predictions.neural ? predictions.neural * 40 : 0 },
    { name: 'Frontal Asymmetry', importance: predictions.neural ? predictions.neural * 20 : 0 },
  ];

  return (
    <div style={{ border: '1px solid gray', padding: 15, marginBottom: 20 }}>
      <h2>Dual-Layer Explanations</h2>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {/* Behavioral Explanation */}
        <div style={{ width: '45%' }}>
          <h3>Behavioral Feature Importance</h3>
          {behavioralFeatures.map((f) => (
            <div key={f.name}>
              <span>{f.name}: </span>
              <div
                style={{
                  display: 'inline-block',
                  height: '10px',
                  width: `${f.importance}%`,
                  backgroundColor: '#4caf50',
                  marginBottom: '5px',
                }}
              />
            </div>
          ))}
          <p>
            <i>
              Example: Reaction time and gaze fixation on {behavioralFeatures[2].name} were strongest.
            </i>
          </p>
        </div>

        {/* Neural Explanation */}
        <div style={{ width: '45%' }}>
          <h3>Neural Feature Importance</h3>
          {neuralFeatures.map((f) => (
            <div key={f.name}>
              <span>{f.name}: </span>
              <div
                style={{
                  display: 'inline-block',
                  height: '10px',
                  width: `${f.importance}%`,
                  backgroundColor: '#2196f3',
                  marginBottom: '5px',
                }}
              />
            </div>
          ))}
          <p>
            <i>Example: Beta-band activity increased purchase likelihood.</i>
          </p>
        </div>
      </div>
    </div>
  );
}

export default DualExplanation;
