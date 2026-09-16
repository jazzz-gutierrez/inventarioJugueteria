import axios from "axios";

const api = axios.create({
  baseURL: "https://inventariojugueteria.onrender.com",
});

export default api;