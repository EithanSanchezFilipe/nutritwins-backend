import { Gender, ActivityLevel, Goal } from "../../types/dbSchema";
interface calculateCaloriesBody {
  gender: Gender;
  birthDate: string;
  height: number;
  weight: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}

export { calculateCaloriesBody };
