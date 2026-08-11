// Friendly guide: this module (main) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import App from "./app/App";
import { AuthProvider } from "./app/auth";
import { PortalProvider } from "./app/portal";
import { ThemeProvider } from "./app/theme";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <PortalProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </PortalProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
