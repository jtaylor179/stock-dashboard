import { Controller, Get } from '@nestjs/common';
import { EtfsService } from './etfs.service';

@Controller('etfs')
export class EtfsController {
  constructor(private readonly service: EtfsService) {}

  @Get('rankings')
  getRankings() {
    return this.service.getRankings();
  }
}
