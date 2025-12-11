import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  Put,
} from '@nestjs/common';
import { PlanService } from './plan.service';
import { CreatePlanDto, UpdatePlanDto, ParamsIdDto } from './dto';
import sendErrorNotification from 'src/utils/sendTGError';

@Controller('plans')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Post()
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
