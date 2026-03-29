import {
  AttendanceEvent,
  AttendanceSession,
  Prisma,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class AttendanceRepository {
  constructor(private readonly prismaService: PrismaService) {}

  withTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prismaService.$transaction((tx) => callback(tx), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  findEventByIdempotencyKey(
    tx: Prisma.TransactionClient,
    idempotencyKey: string,
  ): Promise<AttendanceEvent | null> {
    return tx.attendanceEvent.findUnique({
      where: { idempotencyKey },
    });
  }

  findSessionById(
    tx: Prisma.TransactionClient,
    sessionId: string,
  ): Promise<AttendanceSession | null> {
    return tx.attendanceSession.findUnique({
      where: { id: sessionId },
    });
  }

  findSessionByUserAndWorkDate(
    tx: Prisma.TransactionClient,
    userId: string,
    workDate: string,
  ): Promise<AttendanceSession | null> {
    return tx.attendanceSession.findFirst({
      where: {
        userId,
        workDate,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findLatestEventForSession(
    tx: Prisma.TransactionClient,
    sessionId: string,
  ): Promise<AttendanceEvent | null> {
    return tx.attendanceEvent.findFirst({
      where: { sessionId },
      orderBy: {
        eventTimestamp: 'desc',
      },
    });
  }

  createSession(
    tx: Prisma.TransactionClient,
    data: Prisma.AttendanceSessionCreateInput,
  ): Promise<AttendanceSession> {
    return tx.attendanceSession.create({ data });
  }

  updateSession(
    tx: Prisma.TransactionClient,
    sessionId: string,
    data: Prisma.AttendanceSessionUpdateInput,
  ): Promise<AttendanceSession> {
    return tx.attendanceSession.update({
      where: { id: sessionId },
      data,
    });
  }

  createEvent(
    tx: Prisma.TransactionClient,
    data: Prisma.AttendanceEventCreateInput,
  ): Promise<AttendanceEvent> {
    return tx.attendanceEvent.create({ data });
  }
}
