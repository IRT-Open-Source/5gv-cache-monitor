import { StreamInfoDto } from 'src/dto/stream-info.dto';

export class CacheItem {
  publicationId: string;
  url: string;
  available: boolean;

  constructor(streamInfo: StreamInfoDto) {
    this.url = streamInfo.url;
    this.publicationId = streamInfo.mediaItemId;
    this.available = false;
  }
}
