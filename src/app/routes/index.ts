import express from "express";
import { authRoutes } from "../modules/auth/auth.routes";
import { contactRoutes } from "../modules/contact/contact.routes";
import { blogRoutes } from "../modules/blog/blog.routes";
import { publicationsRoutes } from "../modules/publications/publications.routes";
import { videosRoutes } from "../modules/videos/videos.routes";
import { podcastRoutes } from "../modules/podcast/podcast.routes";
import { SearchRoutes } from "../modules/search/search.routes";
import { lifeSuggestionRoutes } from "../modules/lifeSuggestion/lifeSuggestion.routes";
import { socialLinkRoutes } from "../modules/socialLink/socialLink.routes";
import { rssFeedRoutes } from "../modules/RssFeedUsers/RssFeed.route";
import { notificationRoutes } from "../modules/notification/notification.routes";
import { websiteContentRoutes } from "../modules/websiteContent/websiteContent.routes";
import { websiteImageRoutes } from "../modules/websiteContent/websiteImage.routes";
import { motivationRoutes } from "../modules/websiteContent/motivation.routes";

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
  {
    path: "/social-links",
    route: socialLinkRoutes,
  },
  {
    path: "/rss-feed",
    route: rssFeedRoutes,
  },
  {
    path: "/notifications",
    route: notificationRoutes,
  },
  {
    path: "/website-content",
    route: websiteContentRoutes,
  },
  {
    path: "/website-images",
    route: websiteImageRoutes,
  },
  {
    path: "/motivations",
    route: motivationRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
