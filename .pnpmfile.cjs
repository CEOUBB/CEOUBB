module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.name === "typescript-eslint" || pkg.name.startsWith("@typescript-eslint/")) {
        if (pkg.peerDependencies && pkg.peerDependencies.typescript) {
          delete pkg.peerDependencies.typescript;
        }
        pkg.dependencies = pkg.dependencies || {};
        pkg.dependencies.typescript = "6.0.3";
      }
      return pkg;
    },
  },
};
