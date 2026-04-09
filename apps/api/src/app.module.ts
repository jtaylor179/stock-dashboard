import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WatchlistModule } from './watchlist/watchlist.module';
import { PortfoliosModule } from './portfolios/portfolios.module';
import { SecuritiesModule } from './securities/securities.module';
import { CoveredCallsModule } from './covered-calls/covered-calls.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { EtfsModule } from './etfs/etfs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    WatchlistModule,
    PortfoliosModule,
    SecuritiesModule,
    CoveredCallsModule,
    OpportunitiesModule,
    EtfsModule,
  ],
})
export class AppModule {}
