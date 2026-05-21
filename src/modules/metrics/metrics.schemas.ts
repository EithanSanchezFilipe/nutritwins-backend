import { z } from "zod";

export const MetricsSchema = z.object({
  weight: z.number().min(20).max(500).optional(),
  height: z.number().min(50).optional(),
  bodyFat: z.number().min(0).max(100).optional(),
});
