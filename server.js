const http = require("http");
const fs = require("fs");
const path = require("path");
const chatHandler = require("./api/chat.js");

// Simple zero-dependency .env and .env.local loader
function loadEnv() {
  const envFiles = [".env", ".env.local"];
  for (const file of envFiles) {
    const envPath = path.join(__dirname, file);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
    }
  }
}

loadEnv();

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // API endpoint
  if (url.pathname === "/api/chat") {
    let bodyBuffer = "";
    req.on("data", chunk => {
      bodyBuffer += chunk;
    });

    req.on("end", async () => {
      try {
        req.body = bodyBuffer ? JSON.parse(bodyBuffer) : {};
      } catch (e) {
        req.body = {};
      }

      // Vercel helper shims for standard Node HTTP response
      res.status = function (code) {
        res.statusCode = code;
        return res;
      };

      res.json = function (obj) {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(obj));
        return res;
      };

      try {
        await chatHandler(req, res);
      } catch (err) {
        console.error("Handler error:", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Internal Server Error" }));
      }
    });
    return;
  }

  // Serve index.html
  if (url.pathname === "/" || url.pathname === "/index.html") {
    const indexPath = path.join(__dirname, "index.html");
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      fs.createReadStream(indexPath).pipe(res);
      return;
    }
  }

  // 404 for other paths
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

function startServer(port) {
  server.listen(port, () => {
    console.log(`\n🚀 Chatbot is running at http://localhost:${port}`);
    console.log(`🔑 Model setting: ${process.env.GROQ_MODEL || "auto-detect (openai/gpt-oss-20b)"}`);
    if (!process.env.GROQ_API_KEY) {
      console.log(`⚠️  Warning: GROQ_API_KEY is not set yet! Add it to .env.local or .env\n`);
    } else {
      console.log(`✅ GROQ_API_KEY detected.\n`);
    }
  });
}

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log(`⚠️  Port ${PORT} is busy, trying ${PORT + 1}...`);
    startServer(PORT + 1);
  } else {
    console.error("Server error:", err);
  }
});

startServer(PORT);

