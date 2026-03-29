import { Body, Controller, Post } from '@nestjs/common';
import { ProcessAiCommandDto } from './dto/process-ai-command.dto';
import { AiAgentService, ProcessAiCommandResult } from './ai-agent.service';

@Controller('internal/ai-agent')
export class AiAgentController {
  constructor(private readonly aiAgentService: AiAgentService) {}

  @Post('commands')
  processCommand(@Body() dto: ProcessAiCommandDto): Promise<ProcessAiCommandResult> {
    return this.aiAgentService.processCommand(dto);
  }
}
