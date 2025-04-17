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

@Controller('plans')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Post()
  async create(@Body() createPlanDto: CreatePlanDto) {
    return this.planService.create(createPlanDto);
  }

  @Get()
  async getAll() {
    return this.planService.getAll();
  }

  @Get(':id')
  async getById(@Param() params: ParamsIdDto) {
    return this.planService.getById(params.id);
  }

  @Put(':id')
  async update(
    @Param() params: ParamsIdDto,
    @Body() updatePlanDto: UpdatePlanDto,
  ) {
    return this.planService.update(params.id, updatePlanDto);
  }

  @Delete(':id')
  async delete(@Param() params: ParamsIdDto) {
    return this.planService.delete(params.id);
  }
}
