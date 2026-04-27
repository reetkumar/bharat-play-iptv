const axios = require("axios");
const https = require("https");
const http = require("http");

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

exports.handler = async function(event) {
  const targetUrl = event.queryStringParameters?.url;
  if (!targetUrl) {
    return {
      statusCode: 400,
      body: "URL parameter is required",
    };
  }

  try {
    const parsedUrl = new URL(targetUrl);
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "identity",
      "Connection": "keep-alive",
      "Origin": parsedUrl.origin,
      "Referer": parsedUrl.origin + "/",
    };

    if (event.headers && event.headers.range) {
      headers["Range"] = event.headers.range;
    }

    const response = await axios({
      method: "get",
      url: targetUrl,
      responseType: "arraybuffer",
      headers,
      httpsAgent,
      timeout: 30000,
      maxRedirects: 10,
      validateStatus: () => true,
      httpAgent: new http.Agent({ keepAlive: true }),
      decompress: false,
    });

    const contentType = (response.headers["content-type"] || "").toLowerCase();
    const isM3U = contentType.includes("mpegurl") || contentType.includes("x-mpegurl") ||
                  targetUrl.includes(".m3u8") || targetUrl.includes(".m3u");

    const responseHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
    };

    if (isM3U) {
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);
      const text = Buffer.from(response.data).toString("utf-8");
      const rewritten = text.split("\n").map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return line;

        let absUrl;
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
          absUrl = trimmed;
        } else {
          absUrl = baseUrl + trimmed;
        }

        return `/.netlify/functions/proxy?url=${encodeURIComponent(absUrl)}`;
      }).join("\n");

      responseHeaders["content-type"] = "application/vnd.apple.mpegurl";

      return {
        statusCode: 200,
        headers: responseHeaders,
        body: rewritten,
      };
    }

    if (response.headers["content-type"]) {
      responseHeaders["content-type"] = response.headers["content-type"];
    }
    if (response.headers["accept-ranges"]) {
      responseHeaders["accept-ranges"] = response.headers["accept-ranges"];
    }
    if (response.headers["content-length"]) {
      responseHeaders["content-length"] = response.headers["content-length"];
    }

    return {
      statusCode: response.status || 200,
      headers: responseHeaders,
      body: Buffer.from(response.data).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    const message = error?.message || "Unknown proxy error";
    console.error(`Proxy error for ${targetUrl}:`, message);
    return {
      statusCode: 500,
      body: `Proxy error: ${message}`,
    };
  }
};
