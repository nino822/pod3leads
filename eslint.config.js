const nextConfig = require("eslint-config-next");

module.exports = [
  ...nextConfig,
  {
    ignores: [
      ".vercel/**",
      "coverage/**"
    ]
  }
];
