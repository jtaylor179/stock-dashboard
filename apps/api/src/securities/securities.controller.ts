import { Controller, Get, Param, Res, HttpStatus } from '@nestjs/common';
import { SecuritiesService } from './securities.service';
import { LiveMetricsService } from './live-metrics.service';
import { Response } from 'express';
import { existsSync, createReadStream } from 'fs';
import { join } from 'path';

const CHARTS_DIR = join(process.env.HOME || '', '.openclaw', 'workspace', 'charts');

@Controller('securities')
export class SecuritiesController {
  constructor(
    private readonly securitiesService: SecuritiesService,
    private readonly liveMetricsService: LiveMetricsService,
  ) {}

  @Get(':id')
  getSecurity(@Param('id') id: string) {
    return this.securitiesService.getSecurity(id);
  }

  @Get(':id/analyses')
  getAnalyses(@Param('id') id: string) {
    return this.securitiesService.getAnalyses(id);
  }

  @Get(':symbol/live')
  getLiveMetrics(@Param('symbol') symbol: string) {
    return this.liveMetricsService.getLiveMetrics(symbol.toUpperCase());
  }

  @Get(':symbol/chart/:interval')
  getChart(
    @Param('symbol') symbol: string,
    @Param('interval') interval: string,
    @Res() res: Response,
  ) {
    const safe = symbol.replace(/[^A-Za-z0-9\-]/g, '');
    const safeInterval = interval.replace(/[^a-z0-9]/g, '');
    const filename = `${safe}_${safeInterval}_ema6_26.png`;
    const filepath = join(CHARTS_DIR, filename);
    if (!existsSync(filepath)) {
      return res.status(HttpStatus.NOT_FOUND).json({ error: 'Chart not found' });
    }
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=300');
    createReadStream(filepath).pipe(res);
  }
}
