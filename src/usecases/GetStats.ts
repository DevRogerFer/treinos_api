import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

import { WeekDay } from "../generated/prisma/enums.js";
import { prisma } from "../lib/db.js";

dayjs.extend(utc);

const WEEKDAY_MAP: Record<number, WeekDay> = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

interface InputDto {
  userId: string;
  from: string;
  to: string;
}

interface OutputDto {
  workoutStreak: number;
  consistencyByDay: Record<
    string,
    {
      workoutDayCompleted: boolean;
      workoutDayStarted: boolean;
    }
  >;
  completedWorkoutsCount: number;
  conclusionRate: number;
  totalTimeInSeconds: number;
}

export class GetStats {
  async execute(dto: InputDto): Promise<OutputDto> {
    const from = dayjs.utc(dto.from);
    const to = dayjs.utc(dto.to);

    const fromStart = from.startOf("day").toDate();
    const toEnd = to.endOf("day").toDate();

    const sessions = await prisma.workoutSession.findMany({
      where: {
        workoutDay: {
          workoutPlan: {
            userId: dto.userId,
          },
        },
        startedAt: {
          gte: fromStart,
          lte: toEnd,
        },
      },
    });

    const consistencyByDay: Record<
      string,
      { workoutDayCompleted: boolean; workoutDayStarted: boolean }
    > = {};

    for (const session of sessions) {
      const dayKey = dayjs.utc(session.startedAt).format("YYYY-MM-DD");

      if (!consistencyByDay[dayKey]) {
        consistencyByDay[dayKey] = {
          workoutDayCompleted: false,
          workoutDayStarted: false,
        };
      }

      consistencyByDay[dayKey].workoutDayStarted = true;

      if (session.completedAt) {
        consistencyByDay[dayKey].workoutDayCompleted = true;
      }
    }

    const completedWorkoutsCount = sessions.filter(
      (s) => s.completedAt !== null,
    ).length;

    const conclusionRate =
      sessions.length > 0 ? completedWorkoutsCount / sessions.length : 0;

    const totalTimeInSeconds = sessions.reduce((total, session) => {
      if (!session.completedAt) {
        return total;
      }
      const start = dayjs.utc(session.startedAt);
      const end = dayjs.utc(session.completedAt);
      return total + end.diff(start, "second");
    }, 0);

    const workoutStreak = await this.calculateStreak(dto.userId, dayjs.utc());

    return {
      workoutStreak,
      consistencyByDay,
      completedWorkoutsCount,
      conclusionRate,
      totalTimeInSeconds,
    };
  }

  private async calculateStreak(
    userId: string,
    date: dayjs.Dayjs,
  ): Promise<number> {
    const activePlan = await prisma.workoutPlan.findFirst({
      where: { userId, isActive: true },
      include: { workoutDays: true },
    });

    if (!activePlan) {
      return 0;
    }

    const planWeekDays = activePlan.workoutDays.map((d) => d.weekDay);
    let streak = 0;
    let currentDate = date;

    while (true) {
      const currentWeekDay = WEEKDAY_MAP[currentDate.day()];

      if (!planWeekDays.includes(currentWeekDay)) {
        currentDate = currentDate.subtract(1, "day");
        continue;
      }

      const dayStart = currentDate.startOf("day").toDate();
      const dayEnd = currentDate.endOf("day").toDate();

      const session = await prisma.workoutSession.findFirst({
        where: {
          workoutDay: {
            workoutPlan: {
              userId,
              isActive: true,
            },
          },
          completedAt: { not: null },
          startedAt: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      });

      if (!session) {
        break;
      }

      streak++;
      currentDate = currentDate.subtract(1, "day");
    }

    return streak;
  }
}
