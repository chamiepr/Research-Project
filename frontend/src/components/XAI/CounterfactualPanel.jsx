import React from "react";

export default function Counterfactual({ data }) {
  if (!data) return null;

  return (
    <div>
      <h3>Counterfactual Explanation</h3>
      <p>Original Probability: {data.original}</p>
      <p>After Change: {data.counterfactual}</p>
      <p><i>{data.change}</i></p>
    </div>
  );
}
