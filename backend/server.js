import express from "express";
import cors from "cors";
import multer from "multer";
import { PythonShell } from "python-shell";
import path from "path";
import fs from "fs";
import { promises as dnsPromises } from "dns"; 


// Auto-create uploads folder
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

// Cleanup old uploads every hour (optional)
setInterval(() => {
  const dir = "uploads";
  const now = Date.now();
  for (const file of fs.readdirSync(dir)) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    // Delete files older than 1 hour
    if (now - stats.mtimeMs > 3600000) fs.unlinkSync(filePath);
  }
}, 3600000);

const app = express();
app.use(cors());

// Multer setup to save uploaded email file
const upload = multer({ dest: "uploads/" });

// Endpoint: file upload + optional public key
app.post("/verify", upload.single("emailFile"), async(req, res) => {

  const emailPath = req.file.path;
   try {
    // Read uploaded email
    const emailData = fs.readFileSync(emailPath, "utf-8");

   // ✅ Extract the full DKIM header (including folded lines)
const dkimHeaderMatch = emailData.match(/^DKIM-Signature:[\s\S]*?(?=\r?\n[A-Z0-9\-]+:|\r?\n\r?\n|$)/mi);

if (!dkimHeaderMatch) throw new Error("No DKIM-Signature header found in email.");

// Merge continuation lines (that start with space or tab)
const dkimHeader = dkimHeaderMatch[0].replace(/\r?\n[ \t]+/g, " ").trim();

// ✅ Case-insensitive match for selector and domain
const selectorMatch = dkimHeader.match(/s\s*=\s*([^;\s]+)/i);
const domainMatch   = dkimHeader.match(/d\s*=\s*([^;\s]+)/i);

if (!selectorMatch || !domainMatch) {
  console.log("DKIM Header (debug full):", dkimHeader);
  throw new Error("Missing selector (s=) or domain (d=) in DKIM header.");
}

const selector = selectorMatch[1].trim();
const domain   = domainMatch[1].trim();

console.log(`🔍 DKIM Info → Selector: ${selector}, Domain: ${domain}`);



    // ✅ Fetch public key from DNS
  const txtRecords = await dnsPromises.resolveTxt(`${selector}._domainkey.${domain}`);
const publicKeyRecord = txtRecords.flat().find(record => record.includes("p="));

if (!publicKeyRecord) {
  throw new Error("No DKIM public key found in DNS TXT record.");
}

// extract the actual key
const publicKey = publicKeyRecord.split("p=")[1].trim();
console.log("✅ Public key fetched from DNS:", publicKey);


    //call python script for dkim verification 
  const options = {
    mode: "text",
      pythonOptions: ["-u"],
      scriptPath: "./",
  };
   const payload = JSON.stringify({
      email: emailData,
      public_key: publicKey,
    });

const result = await new Promise((resolve, reject) => {
      const py = new PythonShell("verify_dkim.py", options);
      let output = "";

      py.on("message", (msg) => {
        output += msg + "\n";
      });

      py.on("close", () => resolve(output));
      py.on("error", (err) => reject(err));
py.on("stderr", (stderr) => {
  console.error("Python STDERR:", stderr);
});
      py.send(payload);
      py.end((err) => {
        if (err) reject(err);
      });
    });

    // Cleanup file
    fs.unlinkSync(emailPath);

    res.json({ result });
  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(5000, () => console.log("✅ Server running on port 5000"));
