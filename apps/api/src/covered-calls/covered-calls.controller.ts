import { Controller, Get } from '@nestjs/common';
import { CoveredCallsService } from './covered-calls.service';

@Controller('covered-calls')
export class CoveredCallsController {
  constructor(private readonly service: CoveredCallsService) {}

  @Get()
  getAll() { return this.service.getAll(); }
}
