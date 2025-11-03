import React, { useState } from "react";
import axios from "axios";

export default function VerifierForm() {
  const [emailFile, setEmailFile] = useState(null);
  const [publicKey, setPublicKey] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setEmailFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailFile) {
      alert("Please upload an email (.eml) file");
      return;
    }

    const formData = new FormData();
    formData.append("emailFile", emailFile);
    formData.append("publicKey", publicKey);

    setLoading(true);
    setResult(null);

    try {
      const res = await axios.post("http://localhost:5000/verify", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verifier">
      <form onSubmit={handleSubmit}>
        <label>Upload Email (.eml file):</label>
        <input type="file" accept=".eml" onChange={handleFileChange} />

        <label>Public Key (optional):</label>
        <textarea
          rows={6}
          placeholder="Paste PEM public key (optional)"
          value={publicKey}
          onChange={(e) => setPublicKey(e.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Verifying..." : "Verify DKIM"}
        </button>
      </form>

      {result && (
        <div className="result">
          <h3>Verification Result:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
