import { Module, HttpModule } from '@nestjs/common';
import { MonitorService } from './monitor/monitor.service';
import { MessengerService } from './messenger/messenger.service';

@Module({
  imports: [HttpModule],
  controllers: [],
  providers: [MonitorService, MessengerService],
})
export class AppModule {}
