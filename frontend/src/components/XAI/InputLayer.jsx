function InputLayer({ inputs, setInputs }) {
  const updateInput = (key, value) => setInputs({ ...inputs, [key]: value });

  return (
    <div style={{ border: '1px solid gray', padding: 15, marginBottom: 20 }}>
      <h2>Input Layer</h2>
      <p><i>Neural inputs are simulated for demonstration purposes</i></p>

      {/* --- Behavioral Inputs --- */}
      <div style={{ marginBottom: 20 }}>
        <h3>Behavioral Inputs</h3>

        <label>Age: {inputs.age}</label>
        <input
          type="range"
          min={18}
          max={70}
          value={inputs.age}
          onChange={(e) => updateInput('age', Number(e.target.value))}
        />
        <br />

        <label>Gender:</label>
        <select value={inputs.gender} onChange={(e) => updateInput('gender', e.target.value)}>
          <option>Male</option>
          <option>Female</option>
          <option>Other</option>
        </select>
        <br />

        <label>Reaction Time (ms): {inputs.reactionTime}</label>
        <input
          type="range"
          min={100}
          max={2000}
          value={inputs.reactionTime}
          onChange={(e) => updateInput('reactionTime', Number(e.target.value))}
        />
        <br />

        <label>Gaze X:</label>
        <input
          type="number"
          value={inputs.gazeX}
          onChange={(e) => updateInput('gazeX', Number(e.target.value))}
        />
        <label>Gaze Y:</label>
        <input
          type="number"
          value={inputs.gazeY}
          onChange={(e) => updateInput('gazeY', Number(e.target.value))}
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
                onChange={(e) => updateInput('mostLooked', e.target.value)}
              />
              {val}
            </label>
          ))}
        </div>
      </div>

      {/* --- Neural Inputs --- */}
      <div>
        <h3>Neural Inputs</h3>

        <label>Alpha Band Power: {inputs.alpha}</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={inputs.alpha}
          onChange={(e) => updateInput('alpha', Number(e.target.value))}
        />
        <br />

        <label>Beta Band Power: {inputs.beta}</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={inputs.beta}
          onChange={(e) => updateInput('beta', Number(e.target.value))}
        />
        <br />

        <label>Frontal Asymmetry: {inputs.frontalAsym}</label>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={inputs.frontalAsym}
          onChange={(e) => updateInput('frontalAsym', Number(e.target.value))}
        />
        <br />

        <label>Decision Window (ms): {inputs.decisionWindow[0]} - {inputs.decisionWindow[1]}</label>
        <input
          type="range"
          min={0}
          max={2000}
          value={inputs.decisionWindow[0]}
          onChange={(e) =>
            updateInput('decisionWindow', [Number(e.target.value), inputs.decisionWindow[1]])
          }
        />
        <input
          type="range"
          min={0}
          max={2000}
          value={inputs.decisionWindow[1]}
          onChange={(e) =>
            updateInput('decisionWindow', [inputs.decisionWindow[0], Number(e.target.value)])
          }
        />
      </div>
    </div>
  );
}

export default InputLayer;
