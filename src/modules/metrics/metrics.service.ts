import { PrismaClient } from "../../generated/prisma/client";
import { MetricsBody } from "./metrics.interfaces";
export default class MetricsServices {
  constructor(private prisma: PrismaClient) {}

  async getAll(userId: string) {
    return this.prisma.metrics.findMany({
      where: {
        userId,
      },
    });
  }

  async getById(userId: string, id: string) {
    return this.prisma.metrics.findFirst({
      where: { id, userId },
    });
  }

  async createMetric(data: MetricsBody, userId: string) {
    const metrics = await this.prisma.metrics.create({
      data: {
        ...data,
        userId: userId,
      },
    });
    return metrics;
  }
}
