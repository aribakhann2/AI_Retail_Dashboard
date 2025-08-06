import axios from "axios";
export const uploadDataset = async (file: File, forecastType: string) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("forecastType", forecastType);

  const token = localStorage.getItem("token"); // or wherever your JWT is stored

  try {
    const response = await axios.post(
      "http://localhost:5000/api/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`, // 👈 Add this line
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Error uploading dataset:", error.response?.data || error);
    throw error;
  }
};
export const fetchUserDatasets = async () => {
  const token = localStorage.getItem("token"); // Or sessionStorage, wherever you saved it
  

  const response = await fetch("http://localhost:5000/api/datasets", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`, // <--- attach token here
    },
  });
  console.log("Fetch Response:", response);
  const data = await response.json();
  console.log("Parsed JSON:", data);
  return { status: response.status, data };
};
