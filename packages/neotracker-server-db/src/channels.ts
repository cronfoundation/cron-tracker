import { Monitor } from '@neo-one/monitor';
import { pubsub as globalPubSub } from '@neotracker/server-utils';
import { Observable, Observer } from 'rxjs';
import { share } from 'rxjs/operators';
import { createPubSub, PROCESSED_NEXT_INDEX, PubSub, PubSubEnvironment, PubSubOptions } from './createPubSub';

// tslint:disable-next-line no-let
let pubSub: PubSub<{ readonly index: number }> | undefined;
export const createProcessedNextIndexPubSub = ({
  options,
  environment,
  monitor,
}: {
  readonly monitor: Monitor;
  readonly options: PubSubOptions;
  readonly environment: PubSubEnvironment;
}): PubSub<{ readonly index: number }> => {
  if (pubSub === undefined) {
    pubSub = createPubSub<{ readonly index: number }>({
      options,
      environment,
      monitor: monitor.at('subscribe_processed_next_index'),
      channel: PROCESSED_NEXT_INDEX,
    });
  }

  return pubSub;
};

export const subscribeProcessedNextIndex = ({
  options,
  environment,
  monitor,
}: {
  readonly monitor: Monitor;
  readonly options: PubSubOptions;
  readonly environment: PubSubEnvironment;
}): Observable<{ readonly index: number }> =>
  Observable.create((observer: Observer<{ readonly index: number }>) => {
    const pubsub = createProcessedNextIndexPubSub({ options, environment, monitor });
    const subscription = pubsub.value$.subscribe({
      next: (payload) => {
        globalPubSub.publish(PROCESSED_NEXT_INDEX, payload);
        observer.next(payload);
      },
      complete: observer.complete,
      error: observer.error,
    });

    return () => {
      subscription.unsubscribe();
      pubsub.close();
    };
  }).pipe(share());
