import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

import { NotFoundError } from "../errors/index.js";
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
  date: string;
}

interface OutputDto {
  activeWorkoutPlanId: string;
  todayWorkoutDay?: {
    workoutPlanId: string;
    id: string;
    name: string;
    isRest: boolean;
    weekDay: WeekDay;
    estimatedDurationInSeconds: number;
    coverImageUrl?: string;
    exercisesCount: number;
  };
  workoutStreak: number;
  consistencyByDay: Record<
    string,
    {
      workoutDayCompleted: boolean;
      workoutDayStarted: boolean;
    }
  >;
}

export class GetHomeData {
  async execute(dto: InputDto): Promise<OutputDto> {
    const date = dayjs.utc(dto.date);
    const weekDayEnum = WEEKDAY_MAP[date.day()];

    const workoutPlan = await prisma.workoutPlan.findFirst({
      where: {
        userId: dto.userId,
        isActive: true,
      },
      include: {
        workoutDays: {
          include: {
            exercises: true,
          },
        },
      },
    });

    if (!workoutPlan) {
      throw new NotFoundError("Active workout plan not found");
    }

    const todayWorkoutDay = workoutPlan.workoutDays.find(
      (day) => day.weekDay === weekDayEnum,
    );

    const workoutStreak = await this.calculateStreak(
      dto.userId,
      date,
      workoutPlan.workoutDays.map((d) => d.weekDay),
    );

    const consistencyByDay = await this.calculateConsistencyByDay(
      dto.userId,
      date,
    );

    return {
      activeWorkoutPlanId: workoutPlan.id,
      todayWorkoutDay: todayWorkoutDay
        ? {
            workoutPlanId: workoutPlan.id,
            id: todayWorkoutDay.id,
            name: todayWorkoutDay.name,
            isRest: todayWorkoutDay.isRest,
            weekDay: todayWorkoutDay.weekDay,
            estimatedDurationInSeconds:
              todayWorkoutDay.estimatedDurationInSeconds,
            coverImageUrl: todayWorkoutDay.coverImageUrl ?? undefined,
            exercisesCount: todayWorkoutDay.exercises.length,
          }
        : undefined,
      workoutStreak,
      consistencyByDay,
    };
  }

  private async calculateStreak(
    userId: string,
    date: dayjs.Dayjs,
    planWeekDays: WeekDay[],
  ): Promise<number> {
    let streak = 0;
    let currentDate = date;
    const maxDays = 365;

    for (let i = 0; i < maxDays; i++) {
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

      if (session) {
        streak++;
        currentDate = currentDate.subtract(1, "day");
        continue;
      }

      const currentWeekDay = WEEKDAY_MAP[currentDate.day()];

      if (planWeekDays.includes(currentWeekDay)) {
        if (i === 0) {
          currentDate = currentDate.subtract(1, "day");
          continue;
        }
        break;
      }

      currentDate = currentDate.subtract(1, "day");
    }

    return streak;
  }

  private async calculateConsistencyByDay(
    userId: string,
    date: dayjs.Dayjs,
  ): Promise<
    Record<string, { workoutDayCompleted: boolean; workoutDayStarted: boolean }>
  > {
    const sundayStart = date.day(0).startOf("day").toDate();
    const saturdayEnd = date.day(6).endOf("day").toDate();

    const sessions = await prisma.workoutSession.findMany({
      where: {
        workoutDay: {
          workoutPlan: {
            userId,
            isActive: true,
          },
        },
        startedAt: {
          gte: sundayStart,
          lte: saturdayEnd,
        },
      },
    });

    const consistency: Record<
      string,
      { workoutDayCompleted: boolean; workoutDayStarted: boolean }
    > = {};

    for (let i = 0; i < 7; i++) {
      const day = date.day(i);
      const dayKey = day.format("YYYY-MM-DD");

      const daySessions = sessions.filter((s) =>
        dayjs.utc(s.startedAt).isSame(day, "day"),
      );

      const workoutDayStarted = daySessions.length > 0;
      const workoutDayCompleted = daySessions.some(
        (s) => s.completedAt !== null,
      );

      consistency[dayKey] = { workoutDayCompleted, workoutDayStarted };
    }

    return consistency;
  }
}
