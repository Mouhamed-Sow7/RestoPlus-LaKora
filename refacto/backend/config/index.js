 "use strict";
 require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
 
 module.exports = {
   env: process.env.NODE_ENV || "development",
   port: parseInt(process.env.PORT, 10) || 4001,
   mongo: {
     uri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/restoplus_lakora",
   },
   jwt: {
     secret: process.env.JWT_SECRET || (() => { throw new Error("JWT_SECRET is required"); })(),
     accessExpiry: "15m",
     refreshExpiry: "7d",
   },
   cors: {
     origins: (process.env.CORS_ORIGINS || "http://localhost:4001").split(",").map(s => s.trim()),
   },
   rateLimit: {
     auth: { windowMs: 15 * 60 * 1000, max: 10 },
     api:  { windowMs: 60 * 1000,       max: 100 },
   },
 };
