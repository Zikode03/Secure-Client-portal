import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App";
import { AuthProvider } from "./app/auth";
import { PortalProvider } from "./app/portal";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <PortalProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </PortalProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
