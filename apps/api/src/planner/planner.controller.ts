import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import { IsString, MaxLength } from "class-validator";
import { PlannerService } from "./planner.service";
import { JwtGuard } from "../auth/jwt.guard";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";

// DIQQAT: har bir maydonda class-validator dekoratori BO'LISHI SHART.
// Global ValidationPipe `whitelist: true` bilan ishlaydi — dekoratorsiz maydonlar
// jimgina o'chirib tashlanadi va saqlash hech qachon ishlamaydi.
class SavePlannerDayDto {
  @IsString()
  @MaxLength(100_000)
  data!: string;
}

class SavePlannerHabitsDto {
  @IsString()
  @MaxLength(50_000)
  habits!: string;

  @IsString()
  @MaxLength(200_000)
  log!: string;
}

@UseGuards(JwtGuard)
@Controller("planner")
export class PlannerController {
  constructor(private readonly planner: PlannerService) {}

  @Get("habits")
  getPlannerHabits(@CurrentUser() u: AuthUser) {
    return this.planner.getPlannerHabits(u.sub);
  }

  @Put("habits")
  savePlannerHabits(@CurrentUser() u: AuthUser, @Body() dto: SavePlannerHabitsDto) {
    return this.planner.savePlannerHabits(u.sub, dto.habits, dto.log);
  }

  @Get(":date")
  getPlannerDay(@CurrentUser() u: AuthUser, @Param("date") date: string) {
    return this.planner.getPlannerDay(u.sub, date);
  }

  @Put(":date")
  savePlannerDay(
    @CurrentUser() u: AuthUser,
    @Param("date") date: string,
    @Body() dto: SavePlannerDayDto,
  ) {
    return this.planner.savePlannerDay(u.sub, date, dto.data);
  }
}
