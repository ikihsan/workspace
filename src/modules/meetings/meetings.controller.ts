import { Body, Controller, Post } from '@nestjs/common';
import { CreateMeetingRequestDto } from './dto/create-meeting-request.dto';
import { MeetingCreationResult, MeetingsService } from './meetings.service';

@Controller('internal/meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post('requests')
  createRequest(@Body() dto: CreateMeetingRequestDto): Promise<MeetingCreationResult> {
    return this.meetingsService.createMeetingRequest(dto);
  }
}
