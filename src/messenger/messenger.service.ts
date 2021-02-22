import { Injectable } from '@nestjs/common';
import { BehaviorSubject } from 'rxjs';

import { Messenger } from 'messenger';

@Injectable()
export class MessengerService {
  private messenger: Messenger;
  onConnectionChange = new BehaviorSubject<number>(Messenger.DISCONNECTED);
  connectState = {
    CONNECTED: Messenger.CONNECTED,
    DISCONNECTED: Messenger.DISCONNECTED,
  };
  NEW_CACHE_STATE = 'new-cache-state';

  constructor() {
    this.messenger = Messenger.getInstance('cache-monitor');
    this.messenger.onConnectionChange.subscribe(state =>
      this.onConnectionChange.next(state),
    );
  }
  subscribe(ch: string) {
    return this.messenger.subscribe(ch);
  }
  disconnect() {
    // TODO: Disconnect messenger
  }
}
