import React from "react";

export default function PredictionCard({ data }) {
  if (!data) return null;

  return (
    <div>
      <h3>Prediction Result</h3>
      <p><b>Purchase Probability:</b> {data.prediction}</p>

      <h4>Behavioral Explanation</h4>
      <ul>
        {Object.entries(data.behavior_explanation).map(([key, val]) => (
          <li key={key}><b>{key}:</b> {val}</li>
        ))}
      </ul>
    </div>
  );
}
