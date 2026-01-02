export async function uploadComponentAData(data) {
  // Replace URL with your backend endpoint
  const response = await fetch("http://localhost:8000/api/componentA/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error("Failed to upload data");
  return await response.json();
}
