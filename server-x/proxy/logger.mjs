import fs from "node:fs";
import path from "node:path";

export function createAuditLogger(logPath) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  const stream = fs.createWriteStream(logPath, { flags: "a" });

  return {
    write(entry) {
      stream.write(`${JSON.stringify(entry)}\n`);
    },
    close() {
      stream.end();
    },
  };
}
