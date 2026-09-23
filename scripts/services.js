const path = require("path");

const ROOT = path.join(__dirname, "..");

function resolvePackageBin(cwd, pkgName) {
  const pkgJsonPath = require.resolve(`${pkgName}/package.json`, { paths: [cwd] });
  const pkg = require(pkgJsonPath);
  const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin[pkgName];
  return path.join(path.dirname(pkgJsonPath), bin);
}

function backendArgs(cwd) {
  return [resolvePackageBin(cwd, "tsx"), "watch", "src/index.ts"];
}

function frontendArgs(cwd) {
  return [resolvePackageBin(cwd, "vite"), "--port", "5173", "--strictPort"];
}

const services = [
  {
    name: "backend",
    cwd: path.join(ROOT, "backend"),
    getDevArgs: backendArgs,
    port: 3001,
    healthPath: "/api/status",
  },
  {
    name: "frontend",
    cwd: path.join(ROOT, "frontend"),
    getDevArgs: frontendArgs,
    port: 5173,
    healthPath: "/",
  },
];

module.exports = { ROOT, services };
