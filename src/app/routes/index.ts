import express from "express";
import { authRoutes } from "../modules/auth/auth.routes";
import { contactRoutes } from "../modules/contact/contact.routes";
import { blogRoutes } from "../modules/blog/blog.routes";
import { publicationsRoutes } from "../modules/publications/publications.routes";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/auth",
    route: authRoutes,
  },
  {
    path: "/blog",
    route: blogRoutes,
  },
  {
    path: "/contact",
    route: contactRoutes,
  },
  {
    path: "/publications",
    route: publicationsRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
