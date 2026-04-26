import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import axios from "axios";
import https from "https";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS", "HEAD"],
    allowedHeaders: ["Content-Type", "Authorization", "Range", "X-Requested-With", "Origin", "Referer"],
    exposedHeaders: ["Content-Range", "Accept-Ranges", "Content-Length", "Content-Type"],
    credentials: true
  }));
  app.use(express.json());
  app.options('*', cors());

  const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
  });

  app.get("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send("URL parameter is required");
    }

    try {
      const parsedUrl = new URL(targetUrl);
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity",
        "Connection": "keep-alive",
        "Origin": parsedUrl.origin,
        "Referer": parsedUrl.origin + "/",
      };

      if (req.headers.range) {
        headers["Range"] = req.headers.range as string;
      }

      const response = await axios({
        method: 'get',
        url: targetUrl,
        responseType: 'arraybuffer',
        headers,
        httpsAgent,
        timeout: 30000,
        maxRedirects: 10,
        validateStatus: () => true,
        httpAgent: new http.Agent({ keepAlive: true }),
        decompress: false,
      });

      const contentType: string = (response.headers['content-type'] || '').toLowerCase();
      const isM3U = contentType.includes('mpegurl') || contentType.includes('x-mpegurl') ||
                    targetUrl.includes('.m3u8') || targetUrl.includes('.m3u');

      const forwardHeaders = ['content-type', 'accept-ranges', 'content-range', 'cache-control'];
      forwardHeaders.forEach(key => {
        if (response.headers[key]) res.setHeader(key, response.headers[key]);
      });
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');

      if (isM3U) {
        // Rewrite all URLs in the manifest to go through our proxy
        const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
        const text = Buffer.from(response.data).toString('utf-8');
        const rewritten = text.split('\n').map(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return line;
          // Resolve relative URLs to absolute, then proxy them
          let absUrl: string;
          if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            absUrl = trimmed;
          } else {
            absUrl = baseUrl + trimmed;
          }
          return `/api/proxy?url=${encodeURIComponent(absUrl)}`;
        }).join('\n');

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Content-Length', Buffer.byteLength(rewritten));
        res.status(200).send(rewritten);
      } else {
        res.setHeader('Accept-Ranges', 'bytes');
        if (response.headers['content-length']) {
          res.setHeader('Content-Length', response.headers['content-length']);
        }
        res.status(response.status || 200).send(Buffer.from(response.data));
      }

      req.on('close', () => {});

    } catch (error: any) {
      console.error(`Proxy error for ${targetUrl}:`, error.message);
      if (!res.headersSent) {
        res.status(500).send(`Proxy error: ${error.message}`);
      }
    }
  });

  app.get("/api/cors-proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send("URL parameter is required");
    }

    try {
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
      };

      if (req.headers.origin) {
        headers["Origin"] = req.headers.origin as string;
      }
      if (req.headers.referer) {
        headers["Referer"] = req.headers.referer as string;
      }

      const response = await axios({
        method: 'get',
        url: targetUrl,
        responseType: 'stream',
        headers,
        httpsAgent,
        timeout: 30000,
        validateStatus: () => true,
      });

      Object.keys(response.headers).forEach(key => {
        const allowedHeaders = ['content-type', 'content-length', 'accept-ranges', 'content-range', 'transfer-encoding', 'cache-control', 'access-control-allow-origin'];
        if (allowedHeaders.includes(key.toLowerCase())) {
          res.setHeader(key, response.headers[key]);
        }
      });

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(response.status || 200);
      response.data.pipe(res);
      
    } catch (error: any) {
      console.error(`Proxy error for ${targetUrl}:`, error.message);
      if (!res.headersSent) {
        res.status(500).send(`Proxy error: ${error.message}`);
      }
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
