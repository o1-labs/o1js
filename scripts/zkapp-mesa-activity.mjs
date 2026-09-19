#!/usr/bin/env node
// List every zkApp account on a Mina network (accounts that currently have a
// verification key), collect the transactions the archive node knows about for
// those accounts, and mark the accounts that were active after the Mesa hard
// fork (2026-09-04 01:00 Asia/Bangkok = 2026-09-03T18:00:00Z).
//
// Data sources (all public, no authentication needed unless noted):
//
//   1. Mina daemon GraphQL (`--node`). `tokenAccounts(tokenId: MINA)` returns
//      every account of the best-tip ledger; accounts with a non-null
//      `verificationKey` are zkApp accounts. This is the only public query
//      that enumerates accounts, so the daemon is used for the account list.
//   2. Archive-Node-API GraphQL (`--archive`, the endpoint o1js calls the
//      "archive" in `Mina.Network({ archive })`). It cannot list accounts, but
//      per address it exposes `events`, `actions` and, per verification-key
//      hash, `verificationKeyUpdates`. Each result carries the block height,
//      block timestamp and transaction hash, so these three queries give the
//      transaction history of a zkApp account as far as the archive exposes it.
//      Transactions that neither emit events/actions nor set a verification key
//      are invisible through this API.
//   3. Optional: the Blockberry indexer (`--blockberry-key` or the
//      BLOCKBERRY_API_KEY env var). It has a per-account zkApp transaction
//      list that also covers transactions without events/actions. The response
//      shape is parsed leniently because it is not a versioned contract.
//
// Usage:
//   node scripts/zkapp-mesa-activity.mjs [options]
//
//   --node <url>            daemon GraphQL      (default: Minascan mainnet node)
//   --archive <url>         archive GraphQL     (default: Minascan mainnet archive)
//   --hardfork <iso-date>   hard fork instant   (default: 2026-09-03T18:00:00Z)
//   --hardfork-height <n>   skip deriving the first post-fork block height
//   --accounts-file <path>  newline separated addresses instead of tokenAccounts
//   --from-height <n>       scan the archive from this height (default: fork height)
//   --block-range <n>       archive block-range window (server default max: 10000)
//   --batch <n>             aliased sub-queries per archive request (max 15, default 10)
//   --concurrency <n>       parallel requests (default 4)
//   --limit <n>             only process the first n zkApp accounts (debugging)
//   --out <dir>             output directory (default: ./zkapp-mesa-activity)
//   --blockberry-key <key>  enable the Blockberry transaction history
//   --blockberry-url <url>  Blockberry base URL (default: mina-mainnet)
//
// Node >= 22 is required (built-in fetch). Behind an HTTPS proxy run with
// NODE_USE_ENV_PROXY=1.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MINA_TOKEN_ID = 'wSHV2S4qX9jFsLjQo8r1BsMLH2ZRKsZx6EJd1sbozGPieEC4Jf';
const DEFAULTS = {
  node: 'https://api.minascan.io/node/mainnet/v1/graphql',
  archive: 'https://api.minascan.io/archive/mainnet/v1/graphql',
  // 2026-09-04 01:00 in Asia/Bangkok (UTC+7)
  hardfork: '2026-09-03T18:00:00Z',
  blockRange: 10_000,
  batch: 10,
  concurrency: 4,
  out: 'zkapp-mesa-activity',
  blockberryUrl: 'https://api.blockberry.one/mina-mainnet/v1',
  blockberryPageSize: 50,
  blockberryMaxPages: 200,
};

// ---------------------------------------------------------------------------
// CLI

function parseArgs(argv) {
  let opts = {
    node: DEFAULTS.node,
    archive: DEFAULTS.archive,
    hardfork: DEFAULTS.hardfork,
    hardforkHeight: undefined,
    accountsFile: undefined,
    fromHeight: undefined,
    blockRange: DEFAULTS.blockRange,
    batch: DEFAULTS.batch,
    concurrency: DEFAULTS.concurrency,
    limit: undefined,
    out: DEFAULTS.out,
    blockberryKey: process.env.BLOCKBERRY_API_KEY,
    blockberryUrl: DEFAULTS.blockberryUrl,
  };
  const intArg = (name, v) => {
    let n = Number.parseInt(v, 10);
    if (!Number.isFinite(n) || n < 0) throw new Error(`${name} expects a non-negative integer`);
    return n;
  };
  for (let i = 0; i < argv.length; i++) {
    let a = argv[i];
    let next = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      return argv[++i];
    };
    switch (a) {
      case '--node':
        opts.node = next();
        break;
      case '--archive':
        opts.archive = next();
        break;
      case '--hardfork':
        opts.hardfork = next();
        break;
      case '--hardfork-height':
        opts.hardforkHeight = intArg(a, next());
        break;
      case '--accounts-file':
        opts.accountsFile = next();
        break;
      case '--from-height':
        opts.fromHeight = intArg(a, next());
        break;
      case '--block-range':
        opts.blockRange = intArg(a, next());
        break;
      case '--batch':
        opts.batch = Math.min(15, Math.max(1, intArg(a, next())));
        break;
      case '--concurrency':
        opts.concurrency = Math.max(1, intArg(a, next()));
        break;
      case '--limit':
        opts.limit = intArg(a, next());
        break;
      case '--out':
        opts.out = next();
        break;
      case '--blockberry-key':
        opts.blockberryKey = next();
        break;
      case '--blockberry-url':
        opts.blockberryUrl = next();
        break;
      case '-h':
      case '--help':
        printHelp();
        process.exit(0);
      default:
        throw new Error(`unknown argument ${a} (use --help)`);
    }
  }
  if (Number.isNaN(Date.parse(opts.hardfork))) {
    throw new Error(`--hardfork is not a valid date: ${opts.hardfork}`);
  }
  return opts;
}

function printHelp() {
  let header = readFileSync(new URL(import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.startsWith('//'))
    .map((l) => l.replace(/^\/\/ ?/, ''))
    .join('\n');
  console.log(header);
}

// ---------------------------------------------------------------------------
// HTTP helpers

const log = (...args) => console.error(new Date().toISOString(), ...args);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, init, { attempts = 5, timeoutMs = 120_000 } = {}) {
  let delay = 2000;
  for (let attempt = 1; ; attempt++) {
    let controller = new AbortController();
    let timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let res = await fetch(url, { ...init, signal: controller.signal });
      if (res.status === 429 || res.status >= 500) {
        let retryAfter = Number(res.headers.get('retry-after'));
        let body = await res.text().catch(() => '');
        if (attempt >= attempts) throw new Error(`HTTP ${res.status} from ${url}: ${body}`);
        let wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : delay;
        log(`HTTP ${res.status} from ${url}, retrying in ${wait}ms (attempt ${attempt})`);
        await sleep(wait);
        delay *= 2;
        continue;
      }
      return res;
    } catch (err) {
      if (attempt >= attempts) throw err;
      log(`request to ${url} failed (${err.message}), retrying in ${delay}ms (attempt ${attempt})`);
      await sleep(delay);
      delay *= 2;
    } finally {
      clearTimeout(timer);
    }
  }
}

class GraphqlError extends Error {
  constructor(url, errors) {
    super(`GraphQL error from ${url}: ${JSON.stringify(errors)}`);
    this.errors = errors;
  }
}

async function graphql(url, query, { timeoutMs } = {}) {
  let res = await fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ query }),
    },
    { timeoutMs }
  );
  let text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`non-JSON response (HTTP ${res.status}) from ${url}: ${text.slice(0, 300)}`);
  }
  if (!res.ok && !json?.data)
    throw new Error(`HTTP ${res.status} from ${url}: ${text.slice(0, 300)}`);
  if (json.errors?.length && !json.data) throw new GraphqlError(url, json.errors);
  if (json.errors?.length)
    log('GraphQL partial errors:', JSON.stringify(json.errors).slice(0, 500));
  return json.data;
}

// Run `fn` over `items` with at most `concurrency` in flight; preserves order.
async function mapConcurrent(items, concurrency, fn) {
  let results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      let i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

const gqlString = (s) => JSON.stringify(String(s));

// ---------------------------------------------------------------------------
// Step 0: network state and hard fork height

async function fetchNetworkState(opts) {
  let archive = await graphql(
    opts.archive,
    `
      {
        networkState {
          maxBlockHeight {
            canonicalMaxBlockHeight
            pendingMaxBlockHeight
          }
        }
      }
    `
  );
  let tip = archive.networkState?.maxBlockHeight;
  if (!tip) throw new Error('archive networkState returned no maxBlockHeight');
  return { canonicalTip: tip.canonicalMaxBlockHeight, pendingTip: tip.pendingMaxBlockHeight };
}

// First block whose timestamp is >= the hard fork instant. Blocks are only
// produced after the post-fork restart, so this is the first Mesa block.
async function deriveHardforkHeight(opts) {
  if (opts.hardforkHeight !== undefined) return { height: opts.hardforkHeight, how: 'argument' };
  let hf = new Date(opts.hardfork).toISOString();
  try {
    let data = await graphql(
      opts.archive,
      `{ blocks(query: { dateTime_gte: ${gqlString(hf)} }, limit: 1, sortBy: BLOCKHEIGHT_ASC) { blockHeight dateTime } }`
    );
    let block = data.blocks?.[0];
    if (block) return { height: block.blockHeight, how: `archive block at ${block.dateTime}` };
  } catch (err) {
    log('archive `blocks` query failed, falling back to the daemon genesis block:', err.message);
  }
  // After a hard fork the daemon's genesis block is the fork block. It carries
  // no transactions, so the first produced post-fork block is height + 1.
  let data = await graphql(
    opts.node,
    `
      {
        genesisBlock {
          protocolState {
            consensusState {
              blockHeight
            }
            blockchainState {
              utcDate
            }
          }
        }
      }
    `
  );
  let cs = data.genesisBlock?.protocolState;
  let genesisDate = Number(cs?.blockchainState?.utcDate);
  let genesisHeight = Number(cs?.consensusState?.blockHeight);
  let hfMs = Date.parse(opts.hardfork);
  if (!Number.isFinite(genesisHeight) || Math.abs(genesisDate - hfMs) > 36 * 3600 * 1000) {
    throw new Error(
      'could not derive the hard fork height: the archive has no block after the hard fork date and the ' +
        'daemon genesis block is not within 36h of it. Pass --hardfork-height explicitly.'
    );
  }
  return { height: genesisHeight + 1, how: 'daemon genesis block + 1' };
}

// ---------------------------------------------------------------------------
// Step 1: zkApp accounts (accounts with a verification key)

const ACCOUNT_FIELDS = `publicKey tokenId nonce zkappUri provedState verificationKey { hash }`;

function toAccountRecord(a) {
  return {
    address: a.publicKey,
    tokenId: a.tokenId,
    nonce: a.nonce == null ? null : Number(a.nonce),
    zkappUri: a.zkappUri ?? null,
    provedState: a.provedState ?? null,
    verificationKeyHash: a.verificationKey?.hash ?? null,
  };
}

async function fetchAllZkappAccounts(opts) {
  log(
    'fetching every MINA-token account from the daemon (tokenAccounts); this can take minutes...'
  );
  let data = await graphql(
    opts.node,
    `{ tokenAccounts(tokenId: ${gqlString(MINA_TOKEN_ID)}) { ${ACCOUNT_FIELDS} } }`,
    { timeoutMs: 15 * 60 * 1000 }
  );
  let all = data.tokenAccounts ?? [];
  let zkapps = all.filter((a) => a.verificationKey?.hash).map(toAccountRecord);
  log(`daemon returned ${all.length} accounts, ${zkapps.length} have a verification key`);
  return zkapps;
}

async function fetchAccountsFromFile(opts) {
  let addresses = readFileSync(opts.accountsFile, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  log(`checking ${addresses.length} addresses from ${opts.accountsFile} against the daemon`);
  let batches = chunk(addresses, 20);
  let records = await mapConcurrent(batches, opts.concurrency, async (batch) => {
    let query = batch
      .map((addr, i) => `a${i}: account(publicKey: ${gqlString(addr)}) { ${ACCOUNT_FIELDS} }`)
      .join('\n');
    let data = await graphql(opts.node, `{ ${query} }`);
    return batch.map((addr, i) => ({ addr, account: data[`a${i}`] }));
  });
  let zkapps = [];
  for (let { addr, account } of records.flat()) {
    if (!account) log(`  ${addr}: not found in the ledger, skipped`);
    else if (!account.verificationKey?.hash) log(`  ${addr}: no verification key, skipped`);
    else zkapps.push(toAccountRecord(account));
  }
  return zkapps;
}

function chunk(arr, size) {
  let out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ---------------------------------------------------------------------------
// Step 2: transactions from the archive node

function blockWindows(from, tipInclusive, size) {
  let windows = [];
  for (let start = from; start <= tipInclusive; start += size) {
    windows.push({ from: start, to: Math.min(start + size, tipInclusive + 1) }); // `to` is exclusive
  }
  return windows;
}

function txRecord(source, blockInfo, transactionInfo) {
  return {
    source,
    hash: transactionInfo?.hash ?? null,
    status: transactionInfo?.status ?? null,
    memo: transactionInfo?.memo ?? null,
    blockHeight: blockInfo?.height ?? null,
    timestamp: blockInfo?.timestamp ? new Date(Number(blockInfo.timestamp)).toISOString() : null,
    chainStatus: blockInfo?.chainStatus ?? null,
  };
}

// Sends one archive request holding `kind(...)` sub-queries for several
// addresses (aliases). Falls back to one request per address if the server
// rejects the batched query (alias / token / cost limits).
async function archiveBatched(opts, kind, addresses, window, selection) {
  let build = (addrs) =>
    `{ ${addrs
      .map(
        (addr, i) =>
          `a${i}: ${kind}(input: { address: ${gqlString(addr)}, from: ${window.from}, to: ${window.to} }) ${selection}`
      )
      .join('\n')} }`;
  try {
    let data = await graphql(opts.archive, build(addresses));
    return addresses.map((_, i) => data[`a${i}`] ?? []);
  } catch (err) {
    if (addresses.length === 1 || !(err instanceof GraphqlError)) throw err;
    log(
      `batched ${kind} query rejected (${err.message.slice(0, 200)}); retrying one address per request`
    );
    let out = [];
    for (let addr of addresses) {
      let data = await graphql(opts.archive, build([addr]));
      out.push(data.a0 ?? []);
    }
    return out;
  }
}

const EVENTS_SELECTION = `{ blockInfo { height timestamp chainStatus } eventData { transactionInfo { hash status memo } } }`;
const ACTIONS_SELECTION = `{ blockInfo { height timestamp chainStatus } transactionInfo { hash status memo } }`;

async function fetchArchiveTransactions(opts, accounts, windows) {
  let txsByAddress = new Map(accounts.map((a) => [a.address, new Map()]));
  const add = (address, tx) => {
    if (!tx.hash) return;
    let map = txsByAddress.get(address);
    let key = `${tx.source}:${tx.hash}`;
    if (map && !map.has(key)) map.set(key, tx);
  };

  // events + actions: per address, batched by alias
  let jobs = [];
  for (let window of windows)
    for (let batch of chunk(accounts, opts.batch)) jobs.push({ window, batch });
  log(
    `archive events/actions: ${jobs.length} batched requests x2 over ${windows.length} block window(s)`
  );
  let done = 0;
  await mapConcurrent(jobs, opts.concurrency, async ({ window, batch }) => {
    let addrs = batch.map((a) => a.address);
    let [events, actions] = await Promise.all([
      archiveBatched(opts, 'events', addrs, window, EVENTS_SELECTION),
      archiveBatched(opts, 'actions', addrs, window, ACTIONS_SELECTION),
    ]);
    addrs.forEach((addr, i) => {
      for (let e of events[i] ?? [])
        for (let ed of e?.eventData ?? [])
          add(addr, txRecord('archive-events', e.blockInfo, ed.transactionInfo));
      for (let a of actions[i] ?? [])
        add(addr, txRecord('archive-actions', a.blockInfo, a.transactionInfo));
    });
    if (++done % 25 === 0 || done === jobs.length) log(`  events/actions ${done}/${jobs.length}`);
  });

  // verification key updates: one query per distinct verification key hash
  let byVk = new Map();
  for (let a of accounts) {
    if (!byVk.has(a.verificationKeyHash)) byVk.set(a.verificationKeyHash, new Set());
    byVk.get(a.verificationKeyHash).add(a.address);
  }
  let vkJobs = [];
  for (let window of windows) for (let vk of byVk.keys()) vkJobs.push({ window, vk });
  log(
    `archive verificationKeyUpdates: ${vkJobs.length} requests for ${byVk.size} distinct verification keys`
  );
  await mapConcurrent(vkJobs, opts.concurrency, async ({ window, vk }) => {
    let data = await graphql(
      opts.archive,
      `{ verificationKeyUpdates(input: { verificationKeyHash: ${gqlString(vk)}, from: ${window.from}, to: ${window.to} })
         { address tokenId blockInfo { height timestamp chainStatus } transactionInfo { hash status memo } } }`
    );
    for (let u of data.verificationKeyUpdates ?? []) {
      if (byVk.get(vk).has(u.address))
        add(u.address, txRecord('archive-vk-update', u.blockInfo, u.transactionInfo));
    }
  });

  return txsByAddress;
}

// ---------------------------------------------------------------------------
// Step 2b (optional): transactions from the Blockberry indexer

function pickField(obj, names) {
  for (let n of names) if (obj?.[n] !== undefined && obj[n] !== null) return obj[n];
  return undefined;
}

function toIsoTimestamp(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'number') return new Date(v < 1e12 ? v * 1000 : v).toISOString();
  let n = Number(v);
  if (Number.isFinite(n) && String(v).trim() !== '') return toIsoTimestamp(n);
  let t = Date.parse(v);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

async function fetchBlockberryTransactions(opts, address) {
  let txs = [];
  let seen = new Set();
  let warnedShape = false;
  for (let page = 0; page < DEFAULTS.blockberryMaxPages; page++) {
    let url =
      `${opts.blockberryUrl}/zkapps/accounts/${address}/txs` +
      `?page=${page}&size=${DEFAULTS.blockberryPageSize}&orderBy=DESC&sortBy=AGE`;
    let res = await fetchWithRetry(url, {
      headers: { accept: 'application/json', 'x-api-key': opts.blockberryKey },
    });
    let text = await res.text();
    if (!res.ok) {
      log(`Blockberry ${res.status} for ${address}: ${text.slice(0, 200)}`);
      break;
    }
    let json = JSON.parse(text);
    let rows = Array.isArray(json) ? json : (json.data ?? json.content ?? json.items ?? []);
    if (!Array.isArray(rows)) {
      log(`Blockberry: unexpected response shape for ${address}: ${text.slice(0, 200)}`);
      break;
    }
    for (let row of rows) {
      let hash = pickField(row, ['hash', 'txHash', 'transactionHash']);
      let timestamp = toIsoTimestamp(
        pickField(row, ['dateTime', 'timestamp', 'age', 'blockTime', 'time'])
      );
      if ((!hash || !timestamp) && !warnedShape) {
        warnedShape = true;
        log(`Blockberry: could not map fields of ${JSON.stringify(row).slice(0, 300)}`);
      }
      if (!hash || seen.has(hash)) continue;
      seen.add(hash);
      txs.push({
        source: 'blockberry',
        hash,
        status: pickField(row, ['status', 'txStatus']) ?? null,
        memo: pickField(row, ['memo']) ?? null,
        blockHeight: pickField(row, ['blockHeight', 'height']) ?? null,
        timestamp,
        chainStatus: pickField(row, ['canonical']) === false ? 'pending' : null,
      });
    }
    let totalPages = pickField(json, ['totalPages']);
    if (rows.length < DEFAULTS.blockberryPageSize) break;
    if (totalPages !== undefined && page + 1 >= Number(totalPages)) break;
  }
  return txs;
}

// ---------------------------------------------------------------------------
// Step 3: mark activity and write results

function summarize(account, txs, hardforkMs, hardforkHeight) {
  let sorted = [...txs].sort(
    (a, b) => (Date.parse(a.timestamp ?? 0) || 0) - (Date.parse(b.timestamp ?? 0) || 0)
  );
  let isAfterFork = (tx) => {
    let t = tx.timestamp ? Date.parse(tx.timestamp) : NaN;
    if (Number.isFinite(t)) return t >= hardforkMs;
    return tx.blockHeight != null && Number(tx.blockHeight) >= hardforkHeight;
  };
  let after = sorted.filter(isAfterFork);
  let uniqueHashes = new Set(sorted.map((t) => t.hash));
  let uniqueAfter = new Set(after.map((t) => t.hash));
  let last = sorted.at(-1);
  return {
    ...account,
    activeAfterMesa: uniqueAfter.size > 0,
    txCount: uniqueHashes.size,
    txCountAfterMesa: uniqueAfter.size,
    lastTxTimestamp: last?.timestamp ?? null,
    lastTxHash: last?.hash ?? null,
    signals: [...new Set(after.map((t) => t.source))].sort(),
    transactions: sorted,
  };
}

function toCsv(rows) {
  let cols = [
    'address',
    'verificationKeyHash',
    'zkappUri',
    'provedState',
    'nonce',
    'activeAfterMesa',
    'txCount',
    'txCountAfterMesa',
    'lastTxTimestamp',
    'lastTxHash',
    'signals',
  ];
  let esc = (v) => {
    if (v === null || v === undefined) return '';
    let s = Array.isArray(v) ? v.join('|') : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return (
    [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n') + '\n'
  );
}

function formatBangkok(iso) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

async function main() {
  let opts = parseArgs(process.argv.slice(2));
  let hardforkMs = Date.parse(opts.hardfork);
  log(
    `hard fork instant: ${new Date(hardforkMs).toISOString()} (${formatBangkok(hardforkMs)} Asia/Bangkok)`
  );
  log(`daemon: ${opts.node}`);
  log(`archive: ${opts.archive}`);

  let { canonicalTip, pendingTip } = await fetchNetworkState(opts);
  let { height: hardforkHeight, how } = await deriveHardforkHeight(opts);
  log(
    `archive tip: canonical ${canonicalTip}, pending ${pendingTip}; first post-fork block: ${hardforkHeight} (${how})`
  );

  // 1. zkApp accounts
  let accounts = opts.accountsFile
    ? await fetchAccountsFromFile(opts)
    : await fetchAllZkappAccounts(opts);
  accounts.sort((a, b) => a.address.localeCompare(b.address));
  if (opts.limit !== undefined) accounts = accounts.slice(0, opts.limit);
  log(`zkApp accounts to process: ${accounts.length}`);
  console.log('\n# zkApp accounts (address, verification key hash, zkappUri)');
  for (let a of accounts)
    console.log(`${a.address}  ${a.verificationKeyHash}  ${a.zkappUri ?? ''}`);
  console.log();

  // 2. transactions
  let fromHeight = opts.fromHeight ?? hardforkHeight;
  let windows = blockWindows(fromHeight, pendingTip, opts.blockRange);
  log(
    `scanning archive blocks [${fromHeight}, ${pendingTip}] in ${windows.length} window(s) of ${opts.blockRange}`
  );
  let txsByAddress = await fetchArchiveTransactions(opts, accounts, windows);

  if (opts.blockberryKey) {
    log(`fetching zkApp transaction history from Blockberry for ${accounts.length} accounts`);
    let done = 0;
    await mapConcurrent(accounts, Math.min(opts.concurrency, 2), async (a) => {
      let txs = await fetchBlockberryTransactions(opts, a.address);
      let map = txsByAddress.get(a.address);
      for (let tx of txs) map.set(`${tx.source}:${tx.hash}`, tx);
      if (++done % 25 === 0 || done === accounts.length)
        log(`  blockberry ${done}/${accounts.length}`);
    });
  } else {
    log(
      'Blockberry disabled (no --blockberry-key / BLOCKBERRY_API_KEY): transactions without events, actions or a verification key update are not visible'
    );
  }

  // 3. results
  let results = accounts.map((a) =>
    summarize(a, [...txsByAddress.get(a.address).values()], hardforkMs, hardforkHeight)
  );
  let active = results.filter((r) => r.activeAfterMesa);

  mkdirSync(opts.out, { recursive: true });
  let meta = {
    generatedAt: new Date().toISOString(),
    node: opts.node,
    archive: opts.archive,
    blockberry: Boolean(opts.blockberryKey),
    hardfork: new Date(hardforkMs).toISOString(),
    hardforkHeight,
    scannedFromHeight: fromHeight,
    archiveTip: { canonical: canonicalTip, pending: pendingTip },
    zkappAccounts: results.length,
    activeAfterMesa: active.length,
  };
  writeFileSync(
    join(opts.out, 'zkapp-accounts.json'),
    JSON.stringify({ meta, accounts: results }, null, 2)
  );
  writeFileSync(join(opts.out, 'zkapp-accounts.csv'), toCsv(results));

  console.log('# zkApp accounts with activity after the Mesa hard fork');
  console.log('address  txsAfterMesa  lastTx  signals');
  for (let r of active) {
    console.log(
      `${r.address}  ${r.txCountAfterMesa}  ${r.lastTxTimestamp ?? ''}  ${r.signals.join('|')}`
    );
  }
  console.log();
  console.log(`zkApp accounts: ${results.length}`);
  console.log(`active after Mesa (${meta.hardfork}): ${active.length}`);
  console.log(`inactive since Mesa: ${results.length - active.length}`);
  console.log(
    `written: ${join(opts.out, 'zkapp-accounts.json')}, ${join(opts.out, 'zkapp-accounts.csv')}`
  );
}

main().catch((err) => {
  console.error('error:', err.message);
  process.exit(1);
});
