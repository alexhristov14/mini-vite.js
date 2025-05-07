import { build } from "esbuild";
import { copyFile, mkdir } from "fs/promises";
import { existsSync } from "fs";

const run = async () => {
  if (!existsSync("dist")) await mkdir("dist");

  await copyFile("public/index.html", "dist/index.html");

  await build({
    entryPoints: ["src/main.ts"],
    bundle: true,
    minify: true,
    outfile: "dist/main.js",
    sourcemap: true,
    target: "esnext",
    loader: { ".ts": "ts" },
  });

  console.log("Production build completed!");
};

run();
