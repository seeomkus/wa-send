const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawnSync } = require("child_process");
const { ROOT } = require("./services");

const RUN_DIR = path.join(ROOT, ".run");
const LOG_DIR = path.join(ROOT, "logs");

function ensureDirs() {
  if (!fs.existsSync(RUN_DIR)) fs.mkdirSync(RUN_DIR, { recursive: true });
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function pidFile(name) {
  return path.join(RUN_DIR, `${name}.pid`);
}

function logFile(name) {
  return path.join(LOG_DIR, `${name}.log`);
}

function readPid(name) {
  const file = pidFile(name);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf-8").trim();
  const pid = Number(raw);
  return Number.isFinite(pid) ? pid : null;
}

function writePid(name, pid) {
  ensureDirs();
  fs.writeFileSync(pidFile(name), String(pid), "utf-8");
}

function clearPid(name) {
  const file = pidFile(name);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

function isAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function killTree(pid) {
  if (!pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try {
      process.kill(-pid, "SIGTERM");
    } catch {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        /* already gone */
      }
    }
  }
}

function checkHttp(port, healthPath) {
  return new Promise((resolve) => {
    const req = http.get({ host: "localhost", port, path: healthPath, timeout: 1500 }, (res) => {
      res.resume();
      resolve(res.statusCode !== undefined && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  RUN_DIR,
  LOG_DIR,
  ensureDirs,
  pidFile,
  logFile,
  readPid,
  writePid,
  clearPid,
  isAlive,
  killTree,
  checkHttp,
  sleep,
};
