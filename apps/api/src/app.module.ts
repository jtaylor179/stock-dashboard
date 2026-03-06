import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WatchlistModule } from './watchlist/watchlist.module';
import { PortfoliosModule } from './portfolios/portfolios.module';
import { SecuritiesModule } from './securities/securities.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    WatchlistModule,
    PortfoliosModule,
    SecuritiesModule,
  ],
})
export class AppModule {}
