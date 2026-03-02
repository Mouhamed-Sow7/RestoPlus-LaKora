"use strict";
const mongoose = require("mongoose");
const config   = require("./config");
const app      = require("./app");

mongoose
  .connect(config.mongo.uri, { autoIndex: true })
  .then(() => {
    app.listen(config.port, () => {
      console.log(`[${new Date().toISOString()}] Restoplus v2 running on port ${config.port}`);
      console.log(`[${new Date().toISOString()}] MongoDB: ${config.mongo.uri}`);
      console.log(`[${new Date().toISOString()}] Env: ${config.env}`);
    });
  })
  .catch(err => { console.error("[FATAL] MongoDB:", err.message); process.exit(1); });

process.on("SIGTERM", async () => {
  await mongoose.connection.close();
  process.exit(0);
});
