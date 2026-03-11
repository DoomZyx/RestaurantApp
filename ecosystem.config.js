module.exports = {
  apps: [
    {
      name: "prod",
      script: "./server.js",
      interpreter: "node",
      watch: true,
      env: {
        NODE_ENV: "prod",
      },
    },
    {
      name: "preprod",
      script: "./server.js",
      interpreter: "node",
      watch: true,
      env: {
        NODE_ENV: "preprod",
      },
    },
  ],
};
