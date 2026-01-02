import { useState, useEffect } from 'react';

function CounterfactualPanel({ inputs, setInputs, predictions }) {
  const [cfBehavioral, setCfBehavioral] = useState(predictions.behavioral);
  const [cfNeural, setCfNeural] = useState(predictions.neural);

  // Sync counterfactuals when original predictions change
  useEffect(() => {
    setCfBehavioral(predictions.behavioral);
    setCfNeural(predictions.neural);
  }, [predictions]);

  const updateCounterfactual = (key, value) => {
    const newInputs = { ...inputs, [key]: value };
    setInputs(newInputs);

    // Recalculate mock predictions
    const bProb =
      Math.min(
        1,
        Math.max(
          0,
          newInputs.reactionTime / 2000 +
            newInputs.age / 70 +
            newInputs.gazeX / 100 + // include gaze X
            newInputs.gazeY / 100 + // include gaze Y
            (newInputs.mostLooked === 'Price' ? 0.3 : 0.2)
        )
      );

    const nProb =
      Math.min(
        1,
        Math.max(
          0,
          (newInputs.alpha + newInputs.beta + newInputs.frontalAsym + 1) / 3
        )
      );

    setCfBehavioral(bProb.toFixed(2));
    setCfNeural(nProb.toFixed(2));
  };

  return (
    <div style={{ border: '1px solid gray', padding: 15, marginBottom: 20 }}>
      <h2>Counterfactual Panel</h2>
      <p><i>Adjust behavioral or neural inputs to see counterfactual predictions. Ethics constraints applied.</i></p>

      {/* Behavioral Counterfactual */}
      <div style={{ marginBottom: 15 }}>
        <h3>Behavioral Counterfactual</h3>

        <label>Age: {inputs.age}</label>
        <input
          type="range"
          min={18}
          max={70}
          value={inputs.age}
          onChange={(e) => updateCounterfactual('age', Number(e.target.value))}
        />
        <br />

        <label>Reaction Time: {inputs.reactionTime}</label>
        <input
          type="range"
          min={100}
          max={2000}
          value={inputs.reactionTime}
          onChange={(e) => updateCounterfactual('reactionTime', Number(e.target.value))}
        />
        <br />

        <label>Gaze X: {inputs.gazeX}</label>
        <input
          type="number"
          value={inputs.gazeX}
          onChange={(e) => updateCounterfactual('gazeX', Number(e.target.value))}
        />
        <label>Gaze Y: {inputs.gazeY}</label>
        <input
          type="number"
          value={inputs.gazeY}
          onChange={(e) => updateCounterfactual('gazeY', Number(e.target.value))}
        />
        <br />

        <label>Most Looked Factor:</label>
        <div>
          {['Price', 'Quality', 'Familiarity'].map((val) => (
            <label key={val} style={{ marginRight: 10 }}>
              <input
                type="radio"
                value={val}
                checked={inputs.mostLooked === val}
                onChange={(e) => updateCounterfactual('mostLooked', e.target.value)}
              />
              {val}
            </label>
          ))}
        </div>

        <p>Original: {predictions.behavioral} | Counterfactual: {cfBehavioral}</p>
      </div>

      {/* Neural Counterfactual */}
      <div>
        <h3>Neural Counterfactual</h3>
        <label>Alpha Band: {inputs.alpha}</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={inputs.alpha}
          onChange={(e) => updateCounterfactual('alpha', Number(e.target.value))}
        />
        <br />
        <label>Beta Band: {inputs.beta}</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={inputs.beta}
          onChange={(e) => updateCounterfactual('beta', Number(e.target.value))}
        />
        <br />
        <label>Frontal Asymmetry: {inputs.frontalAsym}</label>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={inputs.frontalAsym}
          onChange={(e) => updateCounterfactual('frontalAsym', Number(e.target.value))}
        />
        <p>Original: {predictions.neural} | Counterfactual: {cfNeural}</p>
      </div>
    </div>
  );
}

export default CounterfactualPanel;
