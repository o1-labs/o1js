import { Guard } from './types.js';

export { MatchBuilder, UntouchedMatchBuilder, match };

class UntouchedMatchBuilder<T> {
  when<M extends T, R>(guard: Guard<T, M>, handler: (value: M) => R) {
    return new MatchBuilder<Exclude<T, M>, R>(this, handler, guard);
  }

  whenInstance<M extends T, R>(
    guard: new (...args: any) => M,
    ctor: (value: M) => R
  ) {
    return new MatchBuilder<Exclude<T, M>, R>(
      this,
      ctor,
      (value: T): value is M => value instanceof guard
    );
  }
}

class MatchBuilder<T, R> {
  constructor(
    readonly previous: UntouchedMatchBuilder<T> | MatchBuilder<T, R>,
    readonly handler: (value: any) => R,
    readonly guard?: Guard<T, any>
  ) {}

  when<M extends T>(guard: Guard<T, M>, handler: (value: M) => R) {
    return new MatchBuilder<Exclude<T, M>, R>(this, handler, guard);
  }

  whenInstance<M extends T>(
    guard: new (...args: any) => M,
    ctor: (value: M) => R
  ) {
    return new MatchBuilder<Exclude<T, M>, R>(
      this,
      ctor,
      (value: T): value is M => value instanceof guard
    );
  }

  else(handler: (value: T) => R) {
    return new MatchBuilder<never, R>(this, handler);
  }
}

function match<T, R>(
  value: T,
  build: (builder: UntouchedMatchBuilder<T>) => MatchBuilder<never, R>
): R {
  const final = build(new UntouchedMatchBuilder<T>());
  let current: MatchBuilder<never, R> | UntouchedMatchBuilder<R> = final;
  const arms: MatchBuilder<never, R>[] = [];
  while (current instanceof MatchBuilder) {
    arms.unshift(current);
    current = current.previous;
  }
  while (arms.length) {
    const arm = arms.shift()!;
    if (!arm.guard || arm.guard(value as never)) {
      return arm.handler(value);
    }
  }
  return null!;
}
