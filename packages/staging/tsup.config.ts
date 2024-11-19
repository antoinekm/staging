import fs from "fs";
import path from "path";
import { defineConfig } from "tsup";

// Read templates during build time
const readTemplate = (filename: string): string => {
  try {
    return fs.readFileSync(path.join(__dirname, "src", filename), "utf-8");
  } catch (err) {
    console.error(`Error reading template ${filename}:`, err);
    throw err;
  }
};

// Generate the templates module content
const generateTemplatesModule = () => {
  const template = readTemplate("template.html");
  const setup = readTemplate("setup.html");
  const styles = readTemplate("styles.css");

  return `// This file is auto-generated. Do not edit.
/* eslint-disable */
export const loginTemplate = ${JSON.stringify(template)};
export const setupTemplate = ${JSON.stringify(setup)};
export const stylesContent = ${JSON.stringify(styles)};
`;
};

// Generate templates.ts before build starts
const templatesPath = path.join(__dirname, "src", "templates.ts");
fs.writeFileSync(templatesPath, generateTemplatesModule());
console.log("✓ Generated templates.ts");

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
  // Don't remove templates.ts after build since we're in watch mode
  async onSuccess() {
    console.log("✓ Build completed successfully");
  },
});
