import { exec as execCallback } from 'child_process';
import fs from 'fs';
import assert from 'node:assert';
import { Cache, ProofBase, VerificationKey, verify as verifyProof } from 'o1js';
import path from 'path';
import util from 'util';

const exec = util.promisify(execCallback);

export async function tmpdir(): Promise<string> {
  const { stdout } = await exec(`mktemp -d`);
  return stdout.trim();
}

export async function untar(tarball: string): Promise<string> {
  const d = await tmpdir();
  await exec(`tar -xzf ${tarball} -C ${d}`);

  return d;
}

export const allowedModes = ['check', 'dump'] as const;
export type AllowedMode = (typeof allowedModes)[number];
export function isAllowedMode(val: string): val is AllowedMode {
  return (allowedModes as readonly string[]).includes(val);
}

export async function tar(directory: string, out: string) {
  const dirPath = path.resolve(directory);
  const outPath = path.resolve(out);
  const dirName = path.dirname(outPath);
  fs.mkdirSync(dirName, { recursive: true });
  await exec(`tar -czf ${outPath} .`, {
    cwd: dirPath,
  });
}

export async function CacheHarness({
  mode,
  tarball,
  debug = true,
}: {
  mode: string;
  tarball: string;
  debug?: boolean;
}) {
  if (!isAllowedMode(mode)) {
    throw new Error(`mode should be one of ${allowedModes.join(' | ')}`);
  }

  const workingDir = await (async () => {
    if (mode === 'check') {
      return await untar(tarball);
    } else {
      return tmpdir();
    }
  })();

  const cacheDir = path.join(workingDir, 'cache');
  const cache = { ...Cache.FileSystem(cacheDir, debug), canWrite: mode === 'dump' };

  const check = (verificationKey: VerificationKey, label: string) => {
    if (mode === 'check') {
      const expectedVk = JSON.parse(
        fs.readFileSync(path.join(workingDir, `${label}.json`), 'utf8')
      );
      assert.deepEqual(
        expectedVk.data,
        verificationKey.data,
        `expected (${label}) verification keys to remain the same`
      );

      return;
    }

    if (mode === 'dump') {
      fs.writeFileSync(path.join(workingDir, `${label}.json`), JSON.stringify(verificationKey));
    }
  };

  const verify = async <T, U>(proof: ProofBase<T, U>, label: string): Promise<boolean> => {
    const expectedVk = JSON.parse(fs.readFileSync(path.join(workingDir, `${label}.json`), 'utf8'));

    const expectedOk = await verifyProof(proof, expectedVk);
    return expectedOk;
  };

  const finish = async () => {
    await tar(workingDir, tarball);
  };

  return {
    cache,
    check,
    verify,
    finish,
  };
}
