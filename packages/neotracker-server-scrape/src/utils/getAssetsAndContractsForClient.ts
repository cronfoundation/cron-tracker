import {
  addressToScriptHash,
  ConfirmedTransaction,
  Contract,
  nep5,
  ReadSmartContractAny,
  RegisterTransaction,
} from '@neo-one/client';
import { Monitor } from '@neo-one/monitor';
import {
  Asset as AssetModel,
  Contract as ContractModel,
  NEP5_CONTRACT_TYPE,
  UNKNOWN_CONTRACT_TYPE,
} from '@neotracker/server-db';
import { utils } from '@neotracker/shared-utils';
import BigNumber from 'bignumber.js';
import _ from 'lodash';
import { Context } from '../types';
import { strip0x } from './strip0x';

const getAsset = (transaction: ConfirmedTransaction, blockTime: number): Partial<AssetModel> | undefined => {
  // tslint:disable-next-line deprecation
  let asset: RegisterTransaction['asset'] | undefined;
  if (transaction.type === 'RegisterTransaction') {
    asset = transaction.asset;
  }

  if (transaction.type === 'InvocationTransaction') {
    asset = transaction.invocationData.asset;
  }

  if (asset !== undefined) {
    return {
      id: transaction.hash,
      transaction_id: transaction.receipt.globalIndex.toString(),
      transaction_hash: transaction.hash,
      type: asset.type,
      name_raw: JSON.stringify(asset.name),
      symbol: JSON.stringify(asset.name),
      amount: asset.amount.toString(),
      precision: asset.precision,
      owner: asset.owner,
      // tslint:disable-next-line no-null-keyword
      admin_address_id: asset.admin,
      block_time: blockTime,
      issued: '0',
      address_count: '0',
      transfer_count: '0',
      transaction_count: '0',
      aggregate_block_id: -1,
    };
  }

  return undefined;
};

const NEP5_ATTRIBUTES = ['totalSupply', 'name', 'symbol', 'decimals', 'balanceOf', 'transfer'].map((attribute) =>
  Buffer.from(attribute, 'utf8').toString('hex'),
);

const checkIsNEP5 = async (context: Context, contract: Contract) => {
  if (context.blacklistNEP5Hashes.has(strip0x(addressToScriptHash(contract.address)))) {
    return false;
  }

  return NEP5_ATTRIBUTES.every((attribute) => contract.script.includes(attribute));
};

const getContractAndAsset = async ({
  monitor,
  context,
  transaction,
  contract,
  blockIndex,
  blockTime,
}: {
  readonly monitor: Monitor;
  readonly context: Context;
  readonly transaction: ConfirmedTransaction;
  readonly contract: Contract;
  readonly blockIndex: number;
  readonly blockTime: number;
}): Promise<{
  readonly asset: Partial<AssetModel> | undefined;
  readonly contract: Partial<ContractModel> & { readonly id: string };
  readonly nep5Contract: ReadSmartContractAny | undefined;
}> => {
  const isNEP5 = await checkIsNEP5(context, contract);

  const contractModel = {
    id: strip0x(addressToScriptHash(contract.address)),
    script: contract.script,
    parameters_raw: JSON.stringify(contract.parameters),
    return_type: contract.returnType,
    needs_storage: contract.storage,
    name: contract.name,
    version: contract.codeVersion,
    author: contract.author,
    email: contract.email,
    description: contract.description,
    transaction_id: transaction.receipt.globalIndex.toString(),
    transaction_hash: transaction.hash,
    block_time: blockTime,
    block_id: blockIndex,
    type: isNEP5 ? NEP5_CONTRACT_TYPE : UNKNOWN_CONTRACT_TYPE,
  };
  let asset: Partial<AssetModel> | undefined;
  let nep5Contract: ReadSmartContractAny | undefined;
  if (isNEP5) {
    try {
      const decimals = await nep5.getDecimals(context.client, contract.address);
      // tslint:disable-next-line no-any
      nep5Contract = nep5.createNEP5ReadSmartContract(context.client, contract.address, decimals) as any;
      if (nep5Contract === undefined) {
        throw new Error('For TS');
      }

      const [name, symbol, totalSupply] = await Promise.all([
        nep5Contract.name(monitor),
        nep5Contract.symbol(monitor),
        nep5Contract.totalSupply(monitor).catch(() => new BigNumber(0)),
      ]);

      asset = {
        id: contractModel.id,
        transaction_id: transaction.receipt.globalIndex.toString(),
        transaction_hash: transaction.hash,
        type: 'NEP5',
        name_raw: JSON.stringify(name),
        symbol,
        amount: totalSupply.toString(),
        precision: decimals,
        // tslint:disable-next-line no-null-keyword
        owner: null,
        // tslint:disable-next-line no-null-keyword
        admin_address_id: null,
        block_time: blockTime,
        issued: '0',
        address_count: '0',
        transfer_count: '0',
        transaction_count: '0',
        aggregate_block_id: -1,
      };
    } catch (error) {
      monitor.logError({
        name: 'scrape_process_nep5_asset_error',
        error,
      });
    }
  }

  return { asset, contract: contractModel, nep5Contract };
};

const getContracts = async ({
  monitor,
  context,
  transaction,
  blockIndex,
  blockTime,
}: {
  readonly monitor: Monitor;
  readonly context: Context;
  readonly transaction: ConfirmedTransaction;
  readonly blockIndex: number;
  readonly blockTime: number;
}): Promise<{
  readonly assets: ReadonlyArray<Partial<AssetModel>>;
  readonly contracts: ReadonlyArray<Partial<ContractModel>>;
  readonly nep5Contracts: ReadonlyArray<{ readonly contractID: string; readonly nep5Contract: ReadSmartContractAny }>;
}> => {
  let contracts: ReadonlyArray<Contract> = [];
  if (transaction.type === 'InvocationTransaction') {
    contracts = transaction.invocationData.contracts;
  }

  if (transaction.type === 'PublishTransaction') {
    contracts = [transaction.contract];
  }

  const results = await Promise.all(
    contracts.map(async (contract) =>
      getContractAndAsset({ monitor, context, transaction, contract, blockIndex, blockTime }),
    ),
  );

  return {
    assets: results.map(({ asset }) => asset).filter(utils.notNull),
    contracts: results.map(({ contract }) => contract),
    nep5Contracts: results
      .map(
        ({ contract, nep5Contract }) =>
          nep5Contract === undefined ? undefined : { contractID: contract.id, nep5Contract },
      )
      .filter(utils.notNull),
  };
};

export const getAssetsAndContractsForClient = async ({
  monitor,
  context,
  transactions,
  blockIndex,
  blockTime,
}: {
  readonly monitor: Monitor;
  readonly context: Context;
  readonly transactions: ReadonlyArray<{
    readonly transaction: ConfirmedTransaction;
    readonly transactionIndex: number;
  }>;
  readonly blockIndex: number;
  readonly blockTime: number;
}): Promise<{
  readonly assets: ReadonlyArray<Partial<AssetModel>>;
  readonly contracts: ReadonlyArray<Partial<ContractModel>>;
  readonly context: Context;
}> => {
  const assets = transactions.map(({ transaction }) => getAsset(transaction, blockTime)).filter(utils.notNull);
  const results = await Promise.all(
    transactions.map(async ({ transaction }) => getContracts({ monitor, context, transaction, blockIndex, blockTime })),
  );

  return {
    assets: assets.concat(_.flatMap(results.map(({ assets: contractAssets }) => contractAssets))),
    contracts: _.flatMap(results.map(({ contracts }) => contracts)),
    context: {
      ...context,
      nep5Contracts: _.flatMap(results.map(({ nep5Contracts }) => nep5Contracts)).reduce(
        (acc, { contractID, nep5Contract }) => ({
          ...acc,
          [contractID]: nep5Contract,
        }),
        context.nep5Contracts,
      ),
    },
  };
};
