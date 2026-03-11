module.exports = {
 apps: [
   {
     name: "prod",
     cwd: "/home/ubuntu/SmartOrder/prod",
     script: "server.js",
     env: {
       NODE_ENV: "production",
       PORT: 3000
     }
   },
   {
     name: "preprod",
     cwd: "/home/ubuntu/SmartOrder/preprod",
     script: "server.js",
     env: {
       NODE_ENV: "preprod",
       PORT: 3001
     }
   }
 ]
};