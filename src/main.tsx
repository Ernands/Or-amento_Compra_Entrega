import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";

import { App } from "@/App";
import { AuthProvider } from "@/auth/auth-context";
import { OperationsProvider } from "@/context/operations-context";
import "@/styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode><HashRouter><AuthProvider><OperationsProvider><App /></OperationsProvider></AuthProvider></HashRouter></StrictMode>,
);
