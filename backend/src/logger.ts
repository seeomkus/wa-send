import fs from "fs";
import path from "path";

const LOG_DIR = path.join(__dirname, "..", "logs");

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function logFilePath(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return path.join(LOG_DIR, `${digits}.log`);
}

export function logMessage(phone: string, message: string) {
  ensureLogDir();
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message.replace(/\r?\n/g, "\\n")}\n`;
  fs.appendFileSync(logFilePath(phone), line, "utf-8");
}

export function readHistory(phone: string): { timestamp: string; message: string }[] {
  const file = logFilePath(phone);
  if (!fs.existsSync(file)) return [];

  const lines = fs.readFileSync(file, "utf-8").split("\n").filter(Boolean);
  return lines.map((line) => {
    const match = line.match(/^\[(.+?)\]\s(.*)$/);
    if (!match) return { timestamp: "", message: line };
    return { timestamp: match[1], message: match[2].replace(/\\n/g, "\n") };
  });
}

export function listContacts(): { phone: string; lastMessageAt: string }[] {
  ensureLogDir();
  const files = fs.readdirSync(LOG_DIR).filter((f) => f.endsWith(".log"));

  return files
    .map((f) => {
      const phone = f.replace(/\.log$/, "");
      const stat = fs.statSync(path.join(LOG_DIR, f));
      return { phone, lastMessageAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}
