import {
  Meeting,
  MeetingProvider,
  MeetingRequest,
  MeetingRequestStatus,
  Prisma,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class MeetingsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  createMeetingRequest(data: {
    organizerUserId: string;
    participantUserIds: string[];
    startTime: Date;
    durationMinutes: number;
    title: string;
  }): Promise<MeetingRequest> {
    return this.prismaService.meetingRequest.create({
      data: {
        organizerUserId: data.organizerUserId,
        participantUserIds: data.participantUserIds,
        startTime: data.startTime,
        durationMinutes: data.durationMinutes,
        title: data.title,
        status: MeetingRequestStatus.PENDING,
      },
    });
  }

  findMeetingRequestById(id: string): Promise<MeetingRequest | null> {
    return this.prismaService.meetingRequest.findUnique({
      where: { id },
    });
  }

  findMeetingByRequestId(requestId: string): Promise<Meeting | null> {
    return this.prismaService.meeting.findUnique({
      where: {
        requestId,
      },
    });
  }

  markMeetingRequestCreated(id: string): Promise<MeetingRequest> {
    return this.prismaService.meetingRequest.update({
      where: { id },
      data: {
        status: MeetingRequestStatus.CREATED,
        failureReason: null,
      },
    });
  }

  markMeetingRequestFailed(id: string, failureReason: string): Promise<MeetingRequest> {
    return this.prismaService.meetingRequest.update({
      where: { id },
      data: {
        status: MeetingRequestStatus.FAILED,
        failureReason,
      },
    });
  }

  createMeeting(data: {
    requestId: string;
    externalMeetingId: string;
    joinUrl: string;
    metadata: Prisma.InputJsonValue;
  }): Promise<Meeting> {
    return this.prismaService.meeting.create({
      data: {
        requestId: data.requestId,
        provider: MeetingProvider.MICROSOFT_TEAMS,
        externalMeetingId: data.externalMeetingId,
        joinUrl: data.joinUrl,
        metadata: data.metadata,
      },
    });
  }
}
