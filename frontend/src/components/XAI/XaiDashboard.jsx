import { useState } from 'react';
import InputLayer from './InputLayer';
import PredictionPanel from './PredictionPanel';
import DualExplanation from './DualExplanation';
import CounterfactualPanel from './CounterfactualPanel';
import EthicalScoreboard from './EthicalScoreboard';
import VisualInsights from './VisualInsights';

function XaiDashboard() {
  const [inputs, setInputs] = useState({
    age: 25,
    gender: 'Male',
    reactionTime: 500,
    gazeX: 0,
    gazeY: 0,
    mostLooked: 'Price',
    alpha: 0.5,
    beta: 0.5,
    frontalAsym: 0,
    decisionWindow: [0, 1000],
  });

  const [predictions, setPredictions] = useState({
    behavioral: null,
    neural: null,
  });

  const [view, setView] = useState('Consumer');

  return (
    <div className="dashboard">
      <div className="top-bar">
        <h1>XAI Neuromarketing Dashboard</h1>
        <label>
          View Selector:{' '}
          <select value={view} onChange={(e) => setView(e.target.value)}>
            <option>Consumer</option>
            <option>Marketer</option>
            <option>Researcher</option>
          </select>
        </label>
      </div>

      <div className="main-content">
        <div className="left-column">
          <div className="panel"><InputLayer inputs={inputs} setInputs={setInputs} /></div>
          <div className="panel"><PredictionPanel inputs={inputs} predictions={predictions} setPredictions={setPredictions} /></div>
          <div className="panel"><DualExplanation predictions={predictions} /></div>
          <div className="panel"><CounterfactualPanel inputs={inputs} setInputs={setInputs} predictions={predictions} /></div>
        </div>

        <div className="right-column">
          <div className="panel"><EthicalScoreboard predictions={predictions} /></div>
          <div className="panel"><VisualInsights predictions={predictions} view={view} /></div>
        </div>
      </div>
    </div>
  );
}

export default XaiDashboard;
