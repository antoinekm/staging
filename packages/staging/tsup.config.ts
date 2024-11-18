import fs from "fs";
import path from "path";
import { defineConfig } from "tsup";

const copyAssets = async () => {
  const assets = [
    { src: "template.html", dest: "template.html" },
    { src: "setup.html", dest: "setup.html" },
    { src: "styles.css", dest: "styles.css" },
  ];

  for (const asset of assets) {
    const sourcePath = path.join(__dirname, "src", asset.src);
    const destPath = path.join(__dirname, "dist", asset.dest);

    try {
      await fs.promises.copyFile(sourcePath, destPath);
      console.log(`✓ Copied ${asset.src} to dist`);
    } catch (err) {
      console.error(`✗ Failed to copy ${asset.src}:`, err);
      throw err;
    }
  }
};

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: true,
  target: "node14",
  outDir: "dist",
  external: [
    "express",
    "express-session",
    "cookie-parser",
    "jsonwebtoken",
    "crypto",
  ],
  async onSuccess() {
    await copyAssets();
  },
});
