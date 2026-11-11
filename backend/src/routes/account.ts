import { Router } from "express";
import { all } from "../db.js";
import { requireAuth } from "../lib/auth.js";
import { bookingView } from "./bookings.js";
import { orderView } from "./orders.js";

export const accountRouter = Router();

accountRouter.get("/account/bookings", requireAuth, async (req, res) =>
  res.json((await all("SELECT b.*, s.name AS service_name FROM bookings b JOIN services s ON s.slug=b.service_slug WHERE b.user_id=$1 ORDER BY b.date DESC, b.time DESC", req.user!.id)).map(bookingView)));
accountRouter.get("/account/orders", requireAuth, async (req, res) =>
  res.json((await all("SELECT * FROM orders WHERE user_id=$1 ORDER BY id DESC", req.user!.id)).map(async (o) => await orderView(o))));
