const { services } = require("./services");
const { readPid, isAlive, killTree, clearPid } = require("./utils");

for (const service of services) {
  const pid = readPid(service.name);
  if (isAlive(pid)) {
    killTree(pid);
    console.log(`[${service.name}] dihentikan (PID ${pid}).`);
  } else {
    console.log(`[${service.name}] tidak sedang berjalan.`);
  }
  clearPid(service.name);
}
