import React from "react";

export default function EthicsScoreboard({ data }) {
  if (!data) return null;

  return (
    <div>
      <h3>Ethical Scoreboard</h3>
      <p>Trust Index: {data.trust}</p>
      <p>Bias Level: {data.bias}</p>
      <p>Manipulation Risk: {data.manipulation_risk}</p>
    </div>
  );
}
