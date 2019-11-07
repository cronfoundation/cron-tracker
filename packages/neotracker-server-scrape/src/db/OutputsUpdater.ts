import { Monitor } from '@neo-one/monitor';
import { TransactionInputOutput as TransactionInputOutputModel } from '@neotracker/server-db';
import _ from 'lodash';
import { Context } from '../types';
import { SameContextDBUpdater } from './SameContextDBUpdater';

export interface OutputsSaveSingle {
  readonly outputs: ReadonlyArray<Partial<TransactionInputOutputModel>>;
}
export interface OutputsSave {
  readonly transactions: ReadonlyArray<OutputsSaveSingle>;
}
export interface OutputsRevert {
  readonly outputIDs: ReadonlyArray<string>;
}

export class OutputsUpdater extends SameContextDBUpdater<OutputsSave, OutputsRevert> {
  public async save(context: Context, monitor: Monitor, { transactions }: OutputsSave): Promise<void> {
    return monitor.captureSpanLog(
      async (span) => {
        const allOutputs = _.flatMap(transactions.map(({ outputs }) => outputs));

        await Promise.all(
          _.chunk(allOutputs, context.chunkSize).map(async (chunk) => {
            await TransactionInputOutputModel.insertAll(context.db, context.makeQueryContext(span), chunk);
          }),
        );
      },
      { name: 'neotracker_scrape_save_outputs', level: 'verbose', error: {} },
    );
  }

  public async revert(context: Context, monitor: Monitor, { outputIDs }: OutputsRevert): Promise<void> {
    return monitor.captureSpan(
      async (span) => {
        await Promise.all(
          _.chunk(outputIDs, context.chunkSize).map(async (chunk) => {
            await TransactionInputOutputModel.query(context.db)
              .context(context.makeQueryContext(span))
              .whereIn('id', chunk)
              .delete();
          }),
        );
      },
      { name: 'neotracker_scrape_revert_outputs' },
    );
  }
}
