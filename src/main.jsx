import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "../personal-crm.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
