import React, { useState, useEffect } from "react";
import { uploadComponentAData } from "./api";

export default function ComponentA() {
  const [status, setStatus] = useState("Idle");
  const [context, setContext] = useState({});
  const [audioData, setAudioData] = useState(null);
  const [movementData, setMovementData] = useState(null);

  // Capture contextual data
  useEffect(() => {
    const device = navigator.userAgent;
    const time = new Date();
    const contextInfo = {
      device: device,
      time: { hour: time.getHours(), day: time.getDay() },
      // add more environment or coarsened demographic info
    };
    setContext(contextInfo);
  }, []);

  // Placeholder functions for audio/movement capture
  const captureAudio = () => {
    setAudioData("dummy_audio_data"); // Replace with Web Audio API
  };

  const captureMovement = () => {
    setMovementData("dummy_movement_data"); // Replace with GPS/accelerometer API
  };

  // Send data to backend
  const handleUpload = async () => {
    setStatus("Uploading...");
    try {
      const response = await uploadComponentAData({
        context,
        audio: audioData,
        movement: movementData,
      });
      setStatus("Upload successful");
      console.log(response);
    } catch (err) {
      setStatus("Upload failed");
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Component A – Contextual & Multimodal Capture</h2>
      <button onClick={captureAudio}>Capture Audio</button>
      <button onClick={captureMovement}>Capture Movement</button>
      <button onClick={handleUpload}>Upload Data</button>
      <p>Status: {status}</p>
    </div>
  );
}
