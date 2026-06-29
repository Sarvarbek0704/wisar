import { Controller, Get, Param, Query } from "@nestjs/common";
import { ContentService } from "./content.service";

@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  // GET /api/stats
  @Get("stats")
  stats() {
    return this.content.stats();
  }

  // GET /api/topics
  @Get("topics")
  topics() {
    return this.content.topics();
  }

  // GET /api/topics/:slug
  @Get("topics/:slug")
  topic(@Param("slug") slug: string) {
    return this.content.topicBySlug(slug);
  }

  // GET /api/search?q=...
  @Get("search")
  search(@Query("q") q: string) {
    return this.content.search(q);
  }

  // GET /api/articles/:topicSlug/:sectionSlug/:articleSlug
  @Get("articles/:topicSlug/:sectionSlug/:articleSlug")
  article(
    @Param("topicSlug") topicSlug: string,
    @Param("sectionSlug") sectionSlug: string,
    @Param("articleSlug") articleSlug: string,
  ) {
    return this.content.article(topicSlug, sectionSlug, articleSlug);
  }

  // GET /api/users/:id/public
  @Get("users/:id/public")
  publicProfile(@Param("id") id: string) {
    return this.content.getPublicProfile(id);
  }
}
