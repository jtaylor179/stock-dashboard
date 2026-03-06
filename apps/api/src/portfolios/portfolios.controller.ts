import { Controller, Get, Param } from '@nestjs/common';
import { PortfoliosService } from './portfolios.service';

@Controller('portfolios')
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) {}

  @Get(':id')
  getPortfolio(@Param('id') id: string) {
    return this.portfoliosService.getPortfolioPositions(id);
  }
}
