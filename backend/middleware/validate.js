"use strict";
const Joi = require("joi");

const validate = (schema, target = "body") => (req, res, next) => {
  const { error, value } = schema.validate(req[target], { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(422).json({
      message: "Données invalides",
      errors: error.details.map(d => ({ field: d.path.join("."), message: d.message })),
    });
  }
  req[target] = value;
  next();
};

const schemas = {
  login: Joi.object({
    username: Joi.string().alphanum().min(2).max(30),
    email:    Joi.string().email(),
    password: Joi.string().min(6).max(100).required(),
  }).or("username", "email"),

  createOrder: Joi.object({
    orderId:       Joi.string().optional(),
    table:         Joi.number().integer().min(1).max(50).required(),
    mode:          Joi.string().valid("group", "individual").default("group"),
    items: Joi.array().items(Joi.object({
      id:       Joi.string().required(),
      name:     Joi.string().required(),
      price:    Joi.number().min(0).required(),
      quantity: Joi.number().integer().min(1).required(),
      category: Joi.string().optional(),
    })).min(1).required(),
    total:         Joi.number().min(0).required(),
    paymentMethod: Joi.string().valid("cash", "card", "mobile").required(),
    notes:         Joi.string().max(500).optional().allow(""),
  }),

  updateStatus: Joi.object({
    status: Joi.string()
      .valid("pending","pending_scan","pending_approval","accepted","preparing","ready","served","cancelled")
      .required(),
  }),

  updatePayment: Joi.object({
    paymentStatus: Joi.string().valid("pending", "paid", "failed").required(),
    paymentMethod: Joi.string().valid("cash", "card", "mobile").optional(),
  }),

  fuseOrders: Joi.object({
    orderIds: Joi.array().items(Joi.string()).min(2).required(),
    table:    Joi.number().integer().min(1).required(),
  }),

  queryOrders: Joi.object({
    page:                  Joi.number().integer().min(1).default(1),
    limit:                 Joi.number().integer().min(1).max(100).default(20),
    status:                Joi.string().optional(),
    paymentStatus:         Joi.string().valid("pending", "paid", "failed").optional(),
    table:                 Joi.number().integer().optional(),
    startDate:             Joi.date().iso().optional(),
    endDate:               Joi.date().iso().optional(),
    includePendingApproval: Joi.string().valid("true", "false").default("false"),
  }),
};

module.exports = { validate, schemas };
