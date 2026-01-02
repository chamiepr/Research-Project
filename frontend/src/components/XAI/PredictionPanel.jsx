function PredictionPanel({ inputs, predictions, setPredictions }) {
  const runPrediction = () => {
    // --- MOCK LOGIC ---
    const bProb =
      Math.min(
        1,
        Math.max(
          0,
          inputs.reactionTime / 2000 + inputs.age / 70 + (inputs.mostLooked === 'Price' ? 0.3 : 0.2)
        )
      );

    const nProb =
      Math.min(
        1,
        Math.max(
          0,
          (inputs.alpha + inputs.beta + inputs.frontalAsym + 1) / 3
        )
      );

    setPredictions({
      behavioral: bProb.toFixed(2),
      neural: nProb.toFixed(2),
    });
  };

  return (
    <div style={{ border: '1px solid gray', padding: 15, marginBottom: 20 }}>
      <h2>Prediction Panel</h2>
      <button onClick={runPrediction}>Run Prediction</button>

      {predictions.behavioral !== null && predictions.neural !== null && (
        <div style={{ marginTop: 10 }}>
          <p>Behavioral Buy Probability: {predictions.behavioral}</p>
          <p>Neural Buy Probability: {predictions.neural}</p>
        </div>
      )}
    </div>
  );
}

export default PredictionPanel;
