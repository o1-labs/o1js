export { withPrefix };

function withPrefix<prefix extends string, T extends Record<string, any>>(
  prefix: prefix,
  obj: T
) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      return [`${prefix}_${k}`, v];
    })
  ) as {
    [k in keyof T & string as `${prefix}_${k}`]: T[k];
  };
}
