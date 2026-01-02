import React, { useState } from "react";
import InputPanel from "./InputPanel";
import PredictionCard from "./PredictionCard";
import Counterfactual from "./Counterfactual";
import EthicsScoreboard from "./EthicsScoreboard";

import { predictXAI, counterfactualXAI, ethicsScore } from "./api";

export default function XaiDashboard() {
  const [prediction, setPrediction] = useState(null);
  const [counter, setCounter] = useState(null);
  const [ethics, setEthics] = useState(null);

  async function handleSubmit(input) {
    const pred = await predictXAI(input);
    const cf = await counterfactualXAI(input);
    const eth = await ethicsScore();

    setPrediction(pred);
    setCounter(cf);
    setEthics(eth);
  }

  return (
    <div>
      <h2>XAI Neuromarketing Dashboard</h2>

      <InputPanel onSubmit={handleSubmit} />
      <PredictionCard data={prediction} />
      <Counterfactual data={counter} />
      <EthicsScoreboard data={ethics} />
    </div>
  );
}
