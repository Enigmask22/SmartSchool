const fs = require("fs");
const path = require("path");

function checkLoggerImports(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  const filesNeedingImport = [];

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      if (file.name !== "node_modules" && file.name !== "build") {
        filesNeedingImport.push(...checkLoggerImports(fullPath));
      }
    } else if (file.name.endsWith(".jsx") || file.name.endsWith(".js")) {
      if (fullPath.includes("utils" + path.sep + "logger.js")) {
        continue; // Skip logger.js itself
      }

      const content = fs.readFileSync(fullPath, "utf8");
      const usesLogger = /logger\.(debug|error|warn|info)/.test(content);
      const hasImport = /import logger from/.test(content);

      if (usesLogger && !hasImport) {
        filesNeedingImport.push(fullPath);
      }
    }
  }

  return filesNeedingImport;
}

const srcDir = path.join(__dirname, "src");
const filesNeedingImport = checkLoggerImports(srcDir);

if (filesNeedingImport.length > 0) {
  console.log("Files using logger without import:");
  filesNeedingImport.forEach((file) => console.log(file));
} else {
  console.log("All files have proper logger imports!");
}
