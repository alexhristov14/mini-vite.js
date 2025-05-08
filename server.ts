const { readFile } = require("fs/promises");
const { createServer } = require("http");
const { existsSync } = require("fs");
const path = require("path");
const esbuild = require("esbuild");
const ws = require("ws");
const chokidar = require("chokidar");

const mimeTypes: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
};

const server = createServer(async (req: any, res: any) => {
  let filePath = req.url === "/" ? "/public/index.html" : req.url!;
  filePath = path.join(__dirname, filePath);

  // Adding a Web Socket client for HMR
  if (filePath.endsWith("index.html")) {
    let html = await readFile(filePath, "utf-8");
    const HMRtemplate = `
    <script>
      const socket = new WebSocket("ws://localhost:3001");
      socket.onmessage = (event) => {
        const { type, path } = JSON.parse(event.data);

        if (type !== "reload") return;
        if (path.endsWith("index.html")) location.reload();
        if (path.endsWith(".css")) {
          const oldLink = document.querySelector(\`link[href='${path}']\`);
          if (oldLink) oldLink.remove();

          const newLink = document.createElement("link");
          newLink.rel = "stylesheet";
          newLink.href = path;
          document.head.appendChild(newLink);
          console.log("[HMR] change CSS file: " + path);
        }
        if (path.endsWith(".js") || path.endsWith(".ts")) {
          const oldScript = document.querySelector(\`script[src='${path}']\`);
          if (oldScript) oldScript.remove();

          const newScript = document.createElement("script");
          newScript.src = path;
          document.body.appendChild(newScript);
        }
      };
    </script></body>
    `;

    html = html.replace("</body>", HMRtemplate);
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
    return;
  }

  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath);

  if (ext === ".ts") {
    try {
      let tsContent = await readFile(filePath, "utf-8");

      const regex = /^import\s.*['"].*\.css['"];?$/gm;
      const matches = [...tsContent.matchAll(regex)];

      matches.forEach((match) => {
        tsContent = tsContent.replace(match, "");
      });

      const result = await esbuild.transform(tsContent, {
        loader: "ts",
        format: "esm",
        sourcemap: true,
        sourcefile: filePath,
      });

      res.writeHead(200, {
        "Content-Type": "application/javascript",
      });

      res.end(result.code);
    } catch (err) {
      res.writeHead(500);
      res.end("Error transforming TypeScript");
      console.error(err);
    }
    return;
  }

  if (ext === ".css") {
    try {
      const content = await readFile(filePath, "utf-8");
      res.writeHead(200, {
        "Content-Type": "text/css",
      });

      res.end(content);
    } catch (err) {
      res.writeHead(500);
      res.end("Error reading CSS file");
      console.error(err);
    }
    return;
  }

  try {
    const content = await readFile(filePath, "utf-8");
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "text/plain",
    });
    res.end(content);
  } catch (err) {
    res.writeHead(500);
    res.end("Server error");
    console.error(err);
  }
});

server.listen(3000, () => {
  console.log("Mini Vite dev server running at http://localhost:3000");
});

const wss = new ws.Server({ port: 3001 });

function broadcastReload(path: string) {
  const msg = JSON.stringify({ type: "reload", path });
  wss.clients.forEach((client: any) => {
    if (client.readyState === ws.OPEN) client.send(msg);
  });
}

chokidar.watch(["src", "public"]).on("change", (filePath: string) => {
  console.log(`[HMR] File changed: ${filePath}`);
  broadcastReload(filePath);
});
