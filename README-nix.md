# o1js README-nix

[Nix](https://nixos.org/) is a tool for package management and system
configuration that can help developers build a project in a reproducible and
reliable manner, without messing up versions during upgrades.

Much like the `mina` repository, you can use Nix to
handle the dependencies required across the codebase, including npm scripts.

> **When should I use Nix?**
> If you cannot build the codebase locally (due to untrusty package manager,
> faulty versioning, or unavailable libraries), it is a good idea to try the Nix
> build instead. This can happen especially if you're using a Mac–and even more
> likely–with non-Intel chips.

## Installing Nix

The following command will install Nix on your machine.

```console
sh <(curl -L https://nixos.org/nix/install) --daemon
```

If you're unsure about your Nix setup, the assistant will guide you towards a
clean installation. It will involve backing up your old `/etc/X` and `/etc/X.backup-before-nix` for `X = {bash.bashrc, bashrc, zshrc}`, and finally
uninstalling and reinstalling Nix from scratch.

> **warning for macOS users**: macOS updates will often break your nix
> installation. To prevent that, you can add the following to your `~/.bashrc`
> or `~/.zshrc`:
>
> ```bash
> # avoid macOS updates to destroy nix
> if [ -e '/nix/var/nix/profiles/default/etc/profile.d/>nix-daemon.sh' ]; then
>  source '/nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh'
> fi
> ```

After installing, the current shell won't be a Nix shell. To create one, open a
new shell and type

```console
nix-shell -p nix-info --run "nix-info -m"
```

That should output some basic information about the configuration parameters for Nix.

## Enabling Flakes (recommended)

Mina is packaged using [Nix Flakes](https://nixos.wiki/wiki/Flakes),
which are an experimental feature of Nix. However, compatibility with
pre-flake Nix is provided. If you wish to contribute the Nix
expressions in this repository, or want to get some convenience
features and speed improvements, **it is advisable to enable flakes**. For
this, you'll want to make sure you're running recent Nix (⩾2.5) and
have enabled the relevant experimental features, either in
`/etc/nix/nix.conf` or (recommended) in `~/.config/nix/nix.conf` (meaning to add
`experimental-features = nix-command flakes` in that file):

```console
mkdir -p "${XDG_CONFIG_HOME-${HOME}/.config}/nix"
echo 'experimental-features = nix-command flakes' > "${XDG_CONFIG_HOME-${HOME}/.config}/nix/nix.conf"
```

Verify your flake support is working by running:

```console
nix flake metadata github:nixos/nixpkgs
```

## Building with Nix

Start by cloning the repository. Optionally, you can install dependencies with
`npm i`, but Nix should take care of all the packages.

```bash
git clone --recurse-submodules git@github.com:o1-labs/o1js.git
cd o1js
# npm install
```

From a new shell, go to `{REPO_PATH}/o1js` and from there execute `./pin.sh` to
update the submodules and add the flakes entries. Then, you can open a Nix shell
with all the dependencies required executing `nix develop o1js#default`, or
alternatively `nix develop o1js#mina-shell` (which works better from MacOS).

```console
./pin.sh
nix develop o1js#default
```

The first time you run this command, you can expect it to take hours (or even a full day) to complete. Then, you will observe that the current devshell becomes a Nix shell with the right
configuration for `o1js` and `mina`.

In order to make sure that the bindings will be regenerated in the case that you
are modifying them, make sure to comment out the conditionals in
`src/mina/src/lib/crypto/kimchi_bindings/js/node_js/build.sh` and `src/mina/src/lib/crypto/kimchi_bindings/js/web/build.sh` locally. That's because otherwise the
PLONK_WASM_WEB check prevents `proof-systems` from compiling with each build.

```sh
if true; then # [[ -z "${PLONK_WASM_WEB-}" ]]; then
    export RUSTFLAGS="-C target-feature=+atomics,+bulk-memory,+mutable-globals -C link-arg=--no-check-features -C link-arg=--max-memory=4294967296"
    rustup run nightly-2023-09-01 wasm-pack build --target web --out-dir ../js/web ../../wasm -- -Z build-std=panic_abort,std
else
    cp "$PLONK_WASM_WEB"/* -R .
fi
```

Then, you can build o1js and update the bindings.

```console
npm run build
npm run build:update-bindings
```

If you need to update the underlying `mina` code, you can also do so with Nix,
but from the corresopnding subdirectory. In particular, you should build Mina
from the o1js subdirectory from a Nix shell. That means,

```console
cd ./src/mina
./nix/pin.sh
nix develop mina
```

## Desirable configurations

### Storage handling

Using Nix can take up a lot of disk space if not optimized. Every time you run `nix develop {SOMETHING}`, Nix will create new generations taking gigabytes of data instead of replacing the old ones. This can soon become a problem in your hard disk if you don't handle it carefully. Here are a few indications that can help with this. 

Nix has a garbage collector that **is not used by default** after every run. Instead, artifacts get accumulated in your disk unless configured otherwise. But if the full gargabe collector is executed (`nix-store --gc`), it will get the dependencies removed completely, and you can expect that the next time executing the Nix build will take hours to complete.

Instead, you can try to run `nix-env --delete-generations old` or any other time bound like `7d`. This will not have any effect on MacOS though. Alternatively, the [direnv](https://github.com/direnv/direnv) / [nix-direnv](https://github.com/nix-community/nix-direnv) tool can create garbage collector roots that won't be collected for removal. It just keeps one gc-root to the latest build of the dev shell so that `nix-store --gc` only removes older generations.

On top of that, adding `auto-optimise-store = true` to `/etc/nix/nix.conf` and running `nix-store --optimize` shoud help with disk usage, as it replaces duplicated files with symlinks.

### Runtime optimization

Other configurations are worth adding into your `/etc/nix/nix.conf`: 

```bash
keep-otuputs = true 
max-jobs = 20
extra-substituters = https://storage.googleapis.com/mina-nix-cache
extra-trusted-public-keys = nix-cache.minaprotocol.org:fdcuDzmnM0Kbf7yU4yywBuUEJWClySc1WIF6t6Mm8h4= nix-cache.minaprotocol.org:D3B1W+V7ND1Fmfii8EhbAbF1JXoe2Ct4N34OKChwk2c= mina-nix-cache-1:djtioLfv2oxuK2lqPUgmZbf8bY8sK/BnYZCU2iU5Q10=
```

The first of those flags tells the garbage collector to keep build time dependencies of current gc-roots, which should help reduce the amount of data that gets removed and rebuilt. 

The second flag increases the default number of jobs being 1, so that rebuilding from scratch will take shorter time.

The last two lines tell Nix to use the Mina Foundation's cache whenever possible, which should as well speed things up when building code that has been build in Mina's CI before.

## Common errors

Errors while using Nix have been reported. This section collects a set of common
errors and proposes fixes for them.

```console
DISCLAIMER!

The proposed solutions might not work universally, and could vary depending on your local environment.
This section should be read as a starting roadmap, and engineers are highly encouraged to add any new error found
and possible fixes to improve the helpfulness of this document.
```

### Compiling _export_test_vectors_

When trying to update the bindings for o1js in MacOS, Nix might fail at
compiling the `export_test_vectors` with the following error log:

```console
error: linking with `cc` failed: exit status: 1
  = note: ld: library not found for -liconv
          collect2: error: ld returned 1 exit status

error: could not compile `export_test_vectors` (bin "export_test_vectors") due to previous error
```

That is because this library is not symlinked into `/opt/homebrew` since macOS
already provides this software and installing another version could cause
problems.

#### Fix for MacOS

Install `libiconv` with

```console
brew install libiconv
```

and update your `~/.zshrc` with the following lines

```bash
# libiconv config
export PATH="/opt/homebrew/opt/libiconv/bin:$PATH"
export LDFLAGS="-L/opt/homebrew/opt/libiconv/lib"
export CPPFLAGS="-I/opt/homebrew/opt/libiconv/include"
export LIBRARY_PATH="/opt/homebrew/opt/libiconv/lib:$LIBRARY_PATH"
```

Alternatively, try this change in the `src/mina/flake.nix` file:

```
-        devShellPackages = with pkgs; [ rosetta-cli wasm-pack nodejs binaryen ];
+        devShellPackages = with pkgs; [ rosetta-cli wasm-pack nodejs binaryen cargo libiconvI];
```

### wasm32-unknown-unknown

The rust compiler and/or Wasm-pack might not be correctly setup in the Nix shell.

```console
Error: wasm32-unknown-unknown target not found in sysroot:  "/nix/store/w30zw23kmgks77d870i502a3185hjycv-rust"

Used rustc from the following path: "/nix/store/wcm8caqd6g7bcbddpyxan1jzj3apkmxy-rustup-1.26.0/bin/rustc"
It looks like Rustup is not being used. For non-Rustup setups, the wasm32-unknown-unknown target needs to be installed manually. See https://rustwasm.github.io/wasm-pack/book/prerequisites/non-rustup-setups.html on how to do this.

Caused by: wasm32-unknown-unknown target not found in sysroot: "/nix/store/w30zw23kmgks77d870i502a3185hjycv-rust"
```

#### Fix

This is caused because the Rust compiler in Nix does not have access to the
corresponding `wasm32-unknown-unknown` target. Let `{RUSTDIR}` be the directory
of the Rust location inside Nix, as shown in the error code; e.g.
`/nix/store/wcm8caqd6g7bcbddpyxan1jzj3apkmxy-rustup-1.26.0/bin`, then you can
check the version of the compiler used by typing:

```bash
{RUSTDIR}/rustc --version
```

Which will reply with something like

```bash
rustc 1.82.0 (f6e511eec 2024-10-15)
```

Then the Wasm target can be automatically installed using

```console
{RUSTDIR}/rustup target add wasm32-unknown-unknown
```

Alternatively, this can be done manually downloading the right version of the
target with

```console
wget https://static.rust-lang.org/dist/rust-std-x.xx.x-wasm32-unknown-unknown.tar.gz
```

where _`x.xx.x`_ corresponds to the version of `rustc` (in the example, 1.82.0).
Once unpacked, you should see a similar structure:

```console
rust-std-1.82.0-wasm32-unknown-unknown
├── components
├── install.sh
├── rust-installer-version
└── rust-std-wasm32-unknown-unknown
    ├── lib
    │   └── rustlib
    │       └── wasm32-unknown-unknown
```

Finally, the `wasm32-unknown-unknown` folder must be moved into the
`./lib/rustlib/` directory in the sysroot like so:

Let `{SYSROOT}` be the directory of the Rust in Nix shown in the error code;
e.g. `/nix/store/w30zw23kmgks77d870i502a3185hjycv-rust`, then the Wasm target
can be automatically installed downloading it from

```bash
mv rust-std-1.82.0-wasm32-unknown-unknown/rust-std-wasm32-unknown-unknown/lib/rustlib/wasm32-unknown-unknown {SYSROOT}/lib/rustlib/wasm32-unknown-unknown/
```

### Cargo not found

```console
error: "/nix/store/w30zw23kmgks77d870i502a3185hjycv-rust/lib/rustlib/src/rust/Cargo.lock"
       does not exist, unable to build with the standard library, try:
                   rustup component add rust-src --toolchain nix
```

#### Fix

Install `cargo` on your host machine. If doing so does not solve the problem, it
is very likely that the whole Nix setup has gone wrong and it is very advisable
to install it from scratch.

### Old path

When several clones of the repository are present in the system and both have
used Nix (or if it has been moved from one location to another), Nix might cache
an old path, breaking builds. For example, typing `nix develop mina`
would complain and produce the following error:

```console
error: resolving Git reference 'master': revspec 'master' not found
```

Then, the error message would still contain old directories.

#### Fix

Create a new environment for Nix and start from scratch. In particular, run the garbage collector which will remove old dependencies. 
