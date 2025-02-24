import { UInt64, Mina, AccountUpdate, PublicKey, Field, TokenId, PrivateKey } from 'o1js';
import { describe, it, before, beforeEach, afterEach } from 'node:test';
import { expect } from 'expect';

const defaultNetwork = Mina.Network({
  networkId: 'testnet',
  mina: 'https://example.com/graphql',
  archive: 'https://example.com//graphql',
});

const enforcedNetwork = Mina.Network({
  networkId: 'testnet',
  mina: 'https://example.com/graphql',
  archive: 'https://example.com//graphql',
  bypassTransactionLimits: false,
});

const unlimitedNetwork = Mina.Network({
  networkId: 'testnet',
  mina: 'https://unlimited.com/graphql',
  archive: 'https://unlimited.com//graphql',
  bypassTransactionLimits: true,
});

const networkWithHeaders = Mina.Network({
  networkId: 'testnet',
  mina: 'https://mina.dummy/graphql',
  archive: 'https://archive.dummy/graphql',
  minaDefaultHeaders: {
    Authorization: 'Bearer mina-default-token',
    'X-Test': 'mina-test',
  },
  archiveDefaultHeaders: {
    Authorization: 'Bearer archive-default-token',
    'X-Test': 'archive-test',
  },
});

describe('Test default network', () => {
  let bobAccount: PublicKey, bobKey: PrivateKey;

  before(async () => {
    Mina.setActiveInstance(defaultNetwork);
    bobKey = PrivateKey.random();
    bobAccount = bobKey.toPublicKey();
  });

  it('Simple account update', async () => {
    let txn = await Mina.transaction(async () => {
      const accountUpdateBob = AccountUpdate.create(bobAccount, Field.from(1));
      accountUpdateBob.account.balance.requireEquals(UInt64.zero);
      accountUpdateBob.balance.addInPlace(UInt64.one);
    });
    await txn.prove();
    await txn.sign([bobKey]).safeSend();
  });

  it('Multiple account update', async () => {
    let txn = await Mina.transaction(async () => {
      for (let index = 0; index < 2; index++) {
        const accountUpdateBob = AccountUpdate.create(bobAccount, Field.from(index));
        accountUpdateBob.account.balance.requireEquals(UInt64.zero);
        accountUpdateBob.balance.addInPlace(UInt64.one);
      }
    });
    await txn.prove();
    await txn.sign([bobKey]).safeSend();
  });

  it('More than limit account update', async () => {
    let txn = await Mina.transaction(async () => {
      for (let index = 0; index < 12; index++) {
        const accountUpdateBob = AccountUpdate.create(bobAccount, Field.from(index));
        accountUpdateBob.account.balance.requireEquals(UInt64.zero);
        accountUpdateBob.balance.addInPlace(UInt64.one);
      }
    });
    await txn.prove();
    // failure with default bypassTransactionLimits value
    await expect(txn.sign([bobKey]).safeSend()).rejects.toThrow();
  });
});

describe('Test enforced network', () => {
  let bobAccount: PublicKey, bobKey: PrivateKey;

  before(async () => {
    Mina.setActiveInstance(enforcedNetwork);
    bobKey = PrivateKey.random();
    bobAccount = bobKey.toPublicKey();
  });

  it('Simple account update', async () => {
    let txn = await Mina.transaction(async () => {
      const accountUpdateBob = AccountUpdate.create(bobAccount, Field.from(1));
      accountUpdateBob.account.balance.requireEquals(UInt64.zero);
      accountUpdateBob.balance.addInPlace(UInt64.one);
    });
    await txn.prove();
    await txn.sign([bobKey]).safeSend();
  });

  it('Multiple account update', async () => {
    let txn = await Mina.transaction(async () => {
      for (let index = 0; index < 2; index++) {
        const accountUpdateBob = AccountUpdate.create(bobAccount, Field.from(index));
        accountUpdateBob.account.balance.requireEquals(UInt64.zero);
        accountUpdateBob.balance.addInPlace(UInt64.one);
      }
    });
    await txn.prove();
    await txn.sign([bobKey]).safeSend();
  });

  it('More than limit account update', async () => {
    let txn = await Mina.transaction(async () => {
      for (let index = 0; index < 12; index++) {
        const accountUpdateBob = AccountUpdate.create(bobAccount, Field.from(index));
        accountUpdateBob.account.balance.requireEquals(UInt64.zero);
        accountUpdateBob.balance.addInPlace(UInt64.one);
      }
    });
    await txn.prove();
    // failure with bypassTransactionLimits = false
    await expect(txn.sign([bobKey]).safeSend()).rejects.toThrow();
  });
});

describe('Test unlimited network', () => {
  let bobAccount: PublicKey, bobKey: PrivateKey;

  before(async () => {
    Mina.setActiveInstance(unlimitedNetwork);
    bobKey = PrivateKey.random();
    bobAccount = bobKey.toPublicKey();
  });

  it('Simple account update', async () => {
    let txn = await Mina.transaction(async () => {
      const accountUpdateBob = AccountUpdate.create(bobAccount, Field.from(1));
      accountUpdateBob.account.balance.requireEquals(UInt64.zero);
      accountUpdateBob.balance.addInPlace(UInt64.one);
    });
    await txn.prove();
    await txn.sign([bobKey]).safeSend();
  });

  it('Multiple account update', async () => {
    let txn = await Mina.transaction(async () => {
      for (let index = 0; index < 2; index++) {
        const accountUpdateBob = AccountUpdate.create(bobAccount, Field.from(index));
        accountUpdateBob.account.balance.requireEquals(UInt64.zero);
        accountUpdateBob.balance.addInPlace(UInt64.one);
      }
    });
    await txn.prove();
    await txn.sign([bobKey]).safeSend();
  });

  it('More than limit account update', async () => {
    let txn = await Mina.transaction(async () => {
      for (let index = 0; index < 12; index++) {
        const accountUpdateBob = AccountUpdate.create(bobAccount, Field.from(index));
        accountUpdateBob.account.balance.requireEquals(UInt64.zero);
        accountUpdateBob.balance.addInPlace(UInt64.one);
      }
    });
    await txn.prove();
    // success with bypassTransactionLimits = true
    await txn.sign([bobKey]).safeSend();
  });
});

describe('Test network with headers', () => {
  let bobAccount: PublicKey, bobKey: PrivateKey;
  let originalFetch: typeof global.fetch;
  let lastFetchOptions: any = null;

  before(async () => {
    Mina.setActiveInstance(networkWithHeaders);
    bobKey = PrivateKey.random();
    bobAccount = bobKey.toPublicKey();
  });

  beforeEach(() => {
    originalFetch = global.fetch;
    lastFetchOptions = undefined;
    global.fetch = ((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      lastFetchOptions = init;
      let url: string;
      if (typeof input === 'string') {
        url = input;
      } else if (input instanceof URL) {
        url = input.toString();
      } else {
        url = input.url;
      }

      if (url.includes('archive.dummy')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: {
              events: [],
            },
          }),
        } as Response);
      } else {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: {},
          }),
        } as Response);
      }
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    lastFetchOptions = null;
  });

  it('Simple account update', async () => {
    let txn = await Mina.transaction(async () => {
      const accountUpdateBob = AccountUpdate.create(bobAccount, Field.from(1));
      accountUpdateBob.account.balance.requireEquals(UInt64.zero);
      accountUpdateBob.balance.addInPlace(UInt64.one);
    });
    await txn.prove();
    await txn.sign([bobKey]).safeSend();

    // we can check the headers here too
    // expect(lastFetchOptions.headers).toEqual({
    //   Authorization: 'Bearer archive-default-token',
    //   'Content-Type': 'application/json',
    //   'X-Test': 'archive-test',
    // });
  });

  it('Multiple account update', async () => {
    let txn = await Mina.transaction(async () => {
      for (let index = 0; index < 2; index++) {
        const accountUpdateBob = AccountUpdate.create(bobAccount, Field.from(index));
        accountUpdateBob.account.balance.requireEquals(UInt64.zero);
        accountUpdateBob.balance.addInPlace(UInt64.one);
      }
    });
    await txn.prove();
    await txn.sign([bobKey]).safeSend();
  });

  it('More than limit account update', async () => {
    let txn = await Mina.transaction(async () => {
      for (let index = 0; index < 12; index++) {
        const accountUpdateBob = AccountUpdate.create(bobAccount, Field.from(index));
        accountUpdateBob.account.balance.requireEquals(UInt64.zero);
        accountUpdateBob.balance.addInPlace(UInt64.one);
      }
    });
    await txn.prove();
    await expect(txn.sign([bobKey]).safeSend()).rejects.toThrow();
  });

  it('Archive default headers with fetchActions', async () => {
    await Mina.fetchActions(bobAccount);

    expect(lastFetchOptions.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer archive-default-token',
      'X-Test': 'archive-test',
    });
  });

  it('Archive default headers with fetchEvents', async () => {
    await Mina.fetchEvents(bobAccount, TokenId.empty());

    expect(lastFetchOptions.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer archive-default-token',
      'X-Test': 'archive-test',
    });
  });

  it('Archive default headers with per request headers in fetchActions', async () => {
    await Mina.fetchActions(bobAccount, undefined, undefined, {
      'X-Test': 'per-request-test',
    });

    expect(lastFetchOptions.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer archive-default-token',
      'X-Test': 'per-request-test',
    });
  });
});
