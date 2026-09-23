const { spawnSync } = require("child_process");
const { ROOT, services } = require("./services");
const path = require("path");

function run(cwd) {
  console.log(`\n>> npm install di ${path.relative(ROOT, cwd) || "."}`);
  const result = spawnSync("npm", ["install"], {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.error(`Gagal npm install di ${cwd}`);
    process.exit(result.status ?? 1);
  }
}

for (const service of services) {
  run(service.cwd);
}

console.log("\nInstalasi selesai. Jalankan `npm run start` untuk menjalankan aplikasi.");
