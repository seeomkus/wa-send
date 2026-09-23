const path = require("path");
const { spawnSync } = require("child_process");

const nodeBin = process.execPath;
const dir = __dirname;

console.log(">> Menghentikan service...");
spawnSync(nodeBin, [path.join(dir, "stop.js")], { stdio: "inherit" });

console.log("\n>> Menjalankan ulang service...");
spawnSync(nodeBin, [path.join(dir, "start.js")], { stdio: "inherit" });
