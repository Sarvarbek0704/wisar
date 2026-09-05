import { Global, Module } from "@nestjs/common";
import { CacheService } from "./cache.service";
import { CleanupCron } from "./cleanup.cron";
import { PrismaService } from "../prisma.service";

/** Global yordamchi modul — CacheService hamma joyda inject qilinadi (36-vazifa). */
@Global()
@Module({
  providers: [CacheService, CleanupCron, PrismaService],
  exports: [CacheService],
})
export class CommonModule {}
