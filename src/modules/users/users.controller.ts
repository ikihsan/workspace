import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  ParseUUIDPipe,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { FindUserByEmailDto } from './dto/find-user-by-email.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('internal/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Get('by-email')
  async findByEmail(@Query() query: FindUserByEmailDto): Promise<User> {
    const user = await this.usersService.findByEmail(query.email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  @Get('by-slack/:slackUserId')
  async findBySlackId(@Param('slackUserId') slackUserId: string): Promise<User> {
    const user = await this.usersService.findBySlackId(slackUserId);

    if (!user) {
      throw new NotFoundException('User not found for provided Slack user id');
    }

    return user;
  }

  @Get(':id')
  findById(@Param('id', new ParseUUIDPipe()) id: string): Promise<User> {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<{ deleted: true }> {
    await this.usersService.remove(id);
    return { deleted: true };
  }
}
