import React, { useState } from "react";

export default function InputPanel({ onSubmit }) {
  const [attention, setAttention] = useState(0.7);
  const [reactionTime, setReactionTime] = useState(500);
  const [hesitation, setHesitation] = useState(0.2);

  return (
    <div>
      <h3>Behavioral Inputs</h3>

      <label>Attention: {attention}</label>
      <input type="range" min="0" max="1" step="0.01"
        value={attention}
        onChange={(e) => setAttention(e.target.value)}
      />

      <label>Reaction Time (ms)</label>
      <input type="number"
        value={reactionTime}
        onChange={(e) => setReactionTime(e.target.value)}
      />

      <label>Hesitation: {hesitation}</label>
      <input type="range" min="0" max="1" step="0.01"
        value={hesitation}
        onChange={(e) => setHesitation(e.target.value)}
      />

      <button onClick={() => onSubmit({ attention, reactionTime, hesitation })}>
        Predict
      </button>
    </div>
  );
}
