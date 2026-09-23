const { services } = require("./services");
const { readPid, isAlive, checkHttp } = require("./utils");

async function main() {
  for (const service of services) {
    const pid = readPid(service.name);
    const alive = isAlive(pid);
    const healthy = alive ? await checkHttp(service.port, service.healthPath) : false;

    const processState = alive ? `berjalan (PID ${pid})` : "tidak berjalan";
    const httpState = healthy ? `merespons di port ${service.port}` : "belum merespons";

    console.log(`[${service.name}] ${processState} - ${httpState}`);
  }
}

main();
