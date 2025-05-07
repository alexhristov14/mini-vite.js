import { build } from "esbuild";
import { copyFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import postcssPlugin from "esbuild-plugin-postcss";

const run = async () => {
  if (!existsSync("dist")) await mkdir("dist");

  await copyFile("public/index.html", "dist/index.html");

  await build({
    entryPoints: ["src/main.ts", "src/styles.css"],
    bundle: true,
    minify: true,
    outfile: "dist/main.js",
    sourcemap: true,
    target: "esnext",
    loader: { ".ts": "ts", ".css": "css" },
    plugins: [postcssPlugin()],
  });

  console.log("Production build completed!");
};

run();
