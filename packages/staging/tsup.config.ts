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

  return `// This file is auto-generated during build. Do not edit.
export const loginTemplate = ${JSON.stringify(template)};
export const setupTemplate = ${JSON.stringify(setup)};
export const stylesContent = ${JSON.stringify(styles)};
`;
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
    // Generate templates module
    const templatesContent = generateTemplatesModule();
    const templatesPath = path.join(__dirname, "src", "templates.ts");

    // Write templates module
    await fs.promises.writeFile(templatesPath, templatesContent);
    console.log("✓ Generated templates.ts");

    // Clean up the templates file after build
    process.on("exit", () => {
      try {
        fs.unlinkSync(templatesPath);
        console.log("✓ Cleaned up templates.ts");
      } catch (err) {
        // Ignore cleanup errors
      }
    });
  },
});
