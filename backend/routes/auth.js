"use strict";
const router = require("express").Router();
const ctrl   = require("../controllers/auth.controller");
const { authenticateToken }    = require("../middleware/auth");
const { validate, schemas }    = require("../middleware/validate");

router.post("/login",   validate(schemas.login), ctrl.login);
router.post("/refresh", ctrl.refresh);
router.get( "/verify",  authenticateToken, ctrl.verify);
router.post("/logout",  authenticateToken, ctrl.logout);

module.exports = router;
