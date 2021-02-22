import { Logger } from '@nestjs/common';

export class Paginator {
  currentPage: number;
  limit: number;
  baseUrl: string;
  hasNext: boolean;
  totalDocs: number;
  logger = new Logger(Paginator.name);
  constructor(pageBaseUrl: string, pageLimit: number) {
    this.currentPage = 0;
    this.limit = pageLimit;
    this.baseUrl = pageBaseUrl;
  }
  async getNextPage(get) {
    return await this.getPage(get, ++this.currentPage);
  }
  async getCurrentPage(get) {
    return await this.getPage(get, this.currentPage);
  }
  async getPage(get, page: number) {
    const res = await get(this.buildPageUrl(page));
    this.logger.debug(`Get page ${page}/${res.totalPages}`);
    this.hasNext = res.hasNextPage;
    this.totalDocs = res.totalDocs;
    return res.docs;
  }
  private buildPageUrl(page: number) {
    return `${this.baseUrl}?page=${page}&limit=${this.limit}`;
  }
}
