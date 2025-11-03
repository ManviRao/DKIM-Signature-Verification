import React from "react";
import VerifierForm from "./components/VerifierForm";
import "./App.css";

export default function App() {
  return (
    <div className="container">
      <h1>DKIM Signature Verification Tool</h1>
      <VerifierForm />
    </div>
  );
}
