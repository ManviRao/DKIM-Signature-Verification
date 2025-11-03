import express from "express";
import cors from "cors";
import multer from "multer";
import { PythonShell } from "python-shell";
import path from "path";
import fs from "fs";

const app = express();
app.use(cors());

// Multer setup to save uploaded email file
const upload = multer({ dest: "uploads/" });

// Endpoint: file upload + optional public key
app.post("/verify", upload.single("emailFile"), (req, res) => {
  const { publicKey } = req.body;
  const emailPath = req.file.path;

  const options = {
    mode: "json",
    pythonOptions: ["-u"],
    scriptPath: "./",
    args: [emailPath, publicKey || ""],
  };

  PythonShell.run("verify_dkim.py", options)
    .then((result) => {
      fs.unlinkSync(emailPath); // delete uploaded file after processing
      res.json(result[0]);
    })
    .catch((err) => {
      res.status(500).json({ error: err.message });
    });
});

app.listen(5000, () => console.log("✅ Server running on port 5000"));
