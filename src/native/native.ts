import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { platform, arch } = process;
const slug = `@o1js/native-${platform}-${arch}`;

export default (() => {
  try {
    return require(slug);
  } catch (e) {
    if (process.env.O1JS_REQUIRE_NATIVE_BINDINGS) {
      throw e;
    }
  }
})();
