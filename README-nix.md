# o1js README-nix

[Nix](https://nixos.org/) is a tool for package management and system
configurationthat can help developers build a project in a reproducible and
reliable manner, without messing up versions during upgrades.

Much like the `mina` repository, you can use Nix to
handle the dependencies required across the codebase, including npm scripts.

> **When should I use Nix?**
> If you cannot build the codebase locally (due to untrusty package manager,
> faulty versioning, or unavailable libraries), it is a good idea to try the Nix
> build instead. This can specially happen if you're using a Mac–and even more
> likely–with non-Intel chips.

## Installing Nix

The following command will install Nix on your machine.

```console
sh <(curl -L https://nixos.org/nix/install) --daemon
```

If you're unsure about your Nix setup, the assistant will guide you towards a
clean installation. It will involve backing up your old `/etc/X` and `/etc/X.backup-before-nix` for `X = {bashrc, zshrc}`, and finally uninstalling and
reinstalling Nix from scratch.

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

## Building with Nix

From a new shell, go to `{REPO_PATH}/o1js` and from there execute `./pin.sh` to
update the submodules and add the flakes entries. Then, you can open a Nix shell
with all the dependencies required executing `nix develop o1js#default`, or
alternatively `nix develop o1js#mina-shell` (which works better from MacOS). Once

```console
cd {REPO_PATH}/o1js
./pin.sh
nix develop o1js#default
```

You will observe that the current devshell becomes a Nix shell with the right
configuration for `o1js` and `mina`.

Then, you can build o1js and update the bindings.

```console
npm run build
npm run build:update-bindings
```

If you need to update the underlying `mina` code, you can also do so with Nix,
but from the corresopnding subdirectory.

## Common errors

Errors while using Nix have been reported. This section collects a set of common
errors and proposes fixes for them.

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

Install `cargo` on your host machine.
