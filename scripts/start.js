const fs = require("fs");
const { spawn } = require("child_process");
const { services } = require("./services");
const { ensureDirs, readPid, writePid, isAlive, logFile } = require("./utils");

function startService(service) {
  const existingPid = readPid(service.name);
  if (isAlive(existingPid)) {
    console.log(`[${service.name}] sudah berjalan (PID ${existingPid}), dilewati.`);
    return;
  }

  ensureDirs();
  const out = fs.openSync(logFile(service.name), "a");

  const child = spawn(process.execPath, service.getDevArgs(service.cwd), {
    cwd: service.cwd,
    detached: true,
    stdio: ["ignore", out, out],
  });

  child.unref();
  fs.closeSync(out);
  writePid(service.name, child.pid);
  console.log(`[${service.name}] dijalankan (PID ${child.pid}), log: logs/${service.name}.log`);
}

for (const service of services) {
  startService(service);
}

console.log("\nSemua service diminta jalan. Cek statusnya dengan `npm run status`.");
console.log("Backend  : http://localhost:3001");
console.log("Frontend : http://localhost:5173");
