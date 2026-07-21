import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./auth/AuthProvider";
import { demoAuthApi } from "./demo/demoAuthApi";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <AuthProvider authApi={demoAuthApi}>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </AuthProvider>
);
