import express from "express";
import { authRoutes } from "../modules/auth/auth.routes";
import { contactRoutes } from "../modules/contact/contact.routes";
import { blogRoutes } from "../modules/blog/blog.routes";
import { publicationsRoutes } from "../modules/publications/publications.routes";
import { videosRoutes } from "../modules/videos/videos.routes";
import { podcastRoutes } from "../modules/podcast/podcast.routes";
import { SearchRoutes } from "../modules/search/search.routes";
import { lifeSuggestionRoutes } from "../modules/lifeSuggestion/lifeSuggestion.routes";

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
  {
    path: "/videos",
    route: videosRoutes,
  },
  {
    path: "/podcasts",
    route: podcastRoutes,
  },
  {
    path: "/search",
    route: SearchRoutes,
  },
  {
    path: "/life-suggestions",
    route: lifeSuggestionRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
