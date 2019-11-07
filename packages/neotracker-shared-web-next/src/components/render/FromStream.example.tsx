import { PExample } from '@neotracker/component-explorer';
import * as React from 'react';
import { concat, interval, of as _of } from 'rxjs';
import { map } from 'rxjs/operators';
import { FromStream } from './FromStream';

// tslint:disable-next-line export-name
export const examples: [PExample<FromStream<number>['props']>, PExample<FromStream<number>['props']>] = [
  {
    element: (ref) => (
      <FromStream ref={ref} props$={concat(_of(0), interval(10).pipe(map((idx) => Math.round(idx / 100))))}>
        {(value: number) => (
          <div>
            {value} second
            {value > 1 ? 's' : ''}
          </div>
        )}
      </FromStream>
    ),
  },
  {
    element: (ref) => (
      <FromStream ref={ref} props$={_of<number>()}>
        {() => <div>Will not be rendered</div>}
      </FromStream>
    ),
  },
];
