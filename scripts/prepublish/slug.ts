export function targetToSlug(target: { platform: string; arch: string }) {
  return `@o1js/native-${target.platform}-${target.arch}`;
}
