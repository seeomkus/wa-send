const { spawnSync } = require("child_process");
const path = require("path");
const { ROOT, services } = require("./services");

for (const service of services) {
  console.log(`\n>> npm run build di ${path.relative(ROOT, service.cwd) || "."}`);
  const result = spawnSync("npm", ["run", "build"], {
    cwd: service.cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.error(`Build gagal di ${service.cwd}`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nBuild selesai.");
console.log("Backend  : backend/dist (jalankan dengan `npm run start` di folder backend)");
console.log("Frontend : frontend/dist (sajikan sebagai static file, mis. dengan `npx serve frontend/dist`)");
