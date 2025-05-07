const { readFile } = require("fs/promises");
const { createServer } = require("http");
const path = require("path");
const { existsSync } = require("fs");
const esbuild = require("esbuild");

const mimeTypes: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
};

const server = createServer(async (req: any, res: any) => {
  let filePath = req.url === "/" ? "/public/index.html" : req.url!;
  filePath = path.join(__dirname, filePath);

  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  console.log(filePath);

  const ext = path.extname(filePath);

  if (ext === ".ts") {
    try {
      let tsContent = await readFile(filePath, "utf-8");

      const regex = /^import\s.*['"].*\.css['"];?$/gm;
      const matches = [...tsContent.matchAll(regex)];

      matches.forEach((match) => {
        tsContent = tsContent.replace(match, "");
      });

      console.log("TsContent: ", tsContent);

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
