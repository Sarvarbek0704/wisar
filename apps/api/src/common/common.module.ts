import { Global, Module } from "@nestjs/common";
import { CacheService } from "./cache.service";

/** Global yordamchi modul — CacheService hamma joyda inject qilinadi (36-vazifa). */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CommonModule {}
