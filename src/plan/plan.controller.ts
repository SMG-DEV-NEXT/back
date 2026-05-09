import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PlanService } from './plan.service';
import { CreatePlanDto, UpdatePlanDto, ParamsIdDto } from './dto';
import sendErrorNotification from 'src/utils/sendTGError';
import { AuthGuard } from '@nestjs/passport';
import { Role } from 'constants/roles';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';

@Controller('plans')
export class PlanController {
  constructor(private readonly planService: PlanService) { }

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async create(@Body() createPlanDto: CreatePlanDto) {
    try {
      return this.planService.create(createPlanDto);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get()
  async getAll() {
    try {
      return this.planService.getAll();
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Get(':id')
  async getById(@Param() params: ParamsIdDto) {
    try {
      return this.planService.getById(params.id);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async update(
    @Param() params: ParamsIdDto,
    @Body() updatePlanDto: UpdatePlanDto,
  ) {
    try {
      return this.planService.update(params.id, updatePlanDto);
    } catch (error) {
      await sendErrorNotification(error);
    }
  }

  // @Delete(':id')
  // async delete(@Param() params: ParamsIdDto) {
  //   try {
  //     return this.planService.delete(params.id);
  //   } catch (error) {
  //     await sendErrorNotification(error);
  //   }
  // }
}
