import {
  Injectable,
  HttpService,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { map } from 'rxjs/operators';
import * as chokidar from 'chokidar';
import * as fs from 'fs';
import getFolderSize = require('get-folder-size');

import { MessengerService } from '../messenger/messenger.service';
import * as serviceConfig from '../../config/config.json';
import { StreamInfoDto } from 'src/dto/stream-info.dto';
import { CacheItem } from './model/cache-item';
import { CacheStatistic } from './model/cache-statistic';
import { Paginator } from './paginator';
import { CacheStateUpdateDto } from 'src/dto/cache-state-update.dto';

@Injectable()
export class MonitorService implements OnModuleDestroy {
  private readonly logger = new Logger(MonitorService.name);

  private readonly WATCH_PATH = serviceConfig.internal.watchPath;
  private readonly MAX_PAGE_SIZE = 1000;

  private paginator: Paginator;
  private cacheStateUrls: CacheStateUpdateDto;
  private configMap: Record<string, CacheItem>;
  private watcher = null;
  private cacheStateUpdateSub: any;

  private stats: CacheStatistic;

  constructor(private http: HttpService, private messenger: MessengerService) {
    this.messenger.onConnectionChange.subscribe(state => {
      if (state === this.messenger.connectState.CONNECTED) {
        this.cacheStateUpdateSub = this.messenger.subscribe(
          this.messenger.NEW_CACHE_STATE,
        );
        this.cacheStateUpdateSub.on('message', message =>
          this.handleCacheStateUpdate(message),
        );
        this.logger.debug(`Set listener: ${this.messenger.NEW_CACHE_STATE}`);
      }
    });
  }

  onModuleDestroy() {
    this.cacheStateUpdateSub.unsubscribe();
    this.messenger.disconnect();
  }

  private async handleCacheStateUpdate(message: any) {
    this.cacheStateUrls = JSON.parse(message.getData()) as CacheStateUpdateDto;

    this.logger.debug(
      `'${
        this.messenger.NEW_CACHE_STATE
      }': [${message.getSequence()}]: ${message.getData()}`,
    );

    this.paginator = new Paginator(
      this.cacheStateUrls.base + this.cacheStateUrls.streams.all,
      this.MAX_PAGE_SIZE,
    );

    this.stats = new CacheStatistic();
    await this.compare();
    this.logger.log('Done comparing');
    this.logger.log(`Streams available: ${this.stats.toString()}`);
    this.setWatchDogs();
  }

  private async compare() {
    const config = (await this.paginator.getNextPage((url: string) =>
      this.get(url),
    )) as StreamInfoDto[];

    this.stats.setExpected(this.paginator.totalDocs);

    this.comparePage(config);
    this.logger.log(config.reduce((a, c) => (c.available ? a + 1 : a), 0));
    await this.updatePage(config);

    if (this.paginator.hasNext) {
      await this.compare();
    }
  }

  private comparePage(config: StreamInfoDto[]) {
    const files = fs.readdirSync(this.WATCH_PATH);
    return config.map(item => {
      if (files.indexOf(item.urlHash) > -1) {
        this.stats.incrAvailable();
        item.available = true;
      } else {
        item.available = false;
      }
    });
  }

  // TODO: Check if usage of path "/available" makes sense here
  private async updatePage(config: StreamInfoDto[]) {
    return this.post(
      this.cacheStateUrls.base + this.cacheStateUrls.streams.all + '/available',
      config,
    );
  }

  private setWatchDogs() {
    if (this.watcher === null) {
      this.logger.log(`Start monitoring: ${this.WATCH_PATH}`);
      this.watcher = chokidar
        .watch(this.WATCH_PATH, {
          ignorePermissionErrors: true,
          ignoreInitial: true,
          usePolling: true,
        })
        .on('add', path => this.handleFileAdd(path))
        .on('unlink', path => this.handleFileRemove(path));
    }
  }

  private async handleFileAdd(path: string) {
    const key = path.split('/').pop();
    /* NGINX names temporary files (e.g. files that are not yet cached completely)
     * like <string>.<string>. Update commands shall not be sent for temporary files
     * as streams with the respective keys won't be known in the data base anyways.
     * Thus we filter respective file names here. */
    if (key.indexOf('.') < 0) {
      /* Update promise will resolve true in case a stream item with ID "key" is
       * known in the data base. */
      const res = await this.updateStreamAvailability(key, true);
      if (res) {
        this.stats.incrAvailable();
        this.logger.verbose(`ADD: '${key}' (+) ${this.stats.toString()}`);
      } else {
        this.logger.warn(`ADD: '${key}' (?) ${this.stats.toString()}`);
      }
    }
  }

  private async handleFileRemove(path: any) {
    const key = path.split('/').pop();
    // Reasoning behind the if clause, see: handleFileAdd()
    if (key.indexOf('.') < 0) {
      const res = await this.updateStreamAvailability(key, false);
      if (res) {
        this.stats.incrMissing();
        this.logger.verbose(`REM: '${key}' (-) ${this.stats.toString()}`);
      } else {
        this.logger.verbose(`REM: '${key}' (?) ${this.stats.toString()}`);
      }
    }
  }

  private async updateStreamAvailability(urlHash: string, available: boolean) {
    const url =
      this.cacheStateUrls.base +
      this.cacheStateUrls.streams.one.replace(':id', urlHash) +
      '/available';
    return this.patch(url, {
      available,
    }).catch(error => {
      this.logger.error(`updateStreamAvailability(): ${url}: ${error}`);
    });
  }

  async getDiscUsage() {
    return new Promise((resolve, reject) => {
      getFolderSize(this.WATCH_PATH, (error, size) => {
        if (error) {
          reject(error);
          this.logger.error(error);
        } else {
          this.logger.log(size);
          resolve(Math.round(100 * (size / Math.pow(1024, 3))) / 100); // GigaByte
        }
      });
    });
  }

  private async get(url: string): Promise<any> {
    return this.http
      .get(url)
      .pipe(map(response => response.data))
      .toPromise();
  }

  private async patch(url, data): Promise<any> {
    return this.http
      .patch(url, data)
      .pipe(map(response => response.data))
      .toPromise();
  }

  private async post(url, data): Promise<any> {
    return this.http
      .post(url, data)
      .pipe(map(response => response.data))
      .toPromise();
  }
}
