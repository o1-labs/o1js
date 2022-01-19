export { proxyClasses };

function proxyClasses(getModuleObject, moduleSpec, getIsReady) {
  let moduleProxy = {};
  for (let classSpec of moduleSpec) {
    let className = classSpec.name;
    // constructor
    let Class = function (...args) {
      if (!getIsReady()) throw Error(constructError(className));
      let moduleObject = getModuleObject();
      return new moduleObject[className](...args);
    };
    for (let prop of classSpec.props) {
      let propName = prop.name;
      if (prop.type === 'function') {
        // static method
        Class[propName] = function (...args) {
          if (!getIsReady()) throw Error(methodError(className, propName));
          let moduleObject = getModuleObject();
          return moduleObject[className][propName].apply(this, args);
        };
      } else {
        // other static prop
        Object.defineProperty(Class, propName, {
          get: function () {
            let moduleObject = getModuleObject();
            return moduleObject[className][propName];
          },
        });
      }
    }
    moduleProxy[className] = Class;
  }
  return moduleProxy;
}

let constructError = (
  className
) => `Cannot call class constructor because snarkyjs has not finished loading.
Try calling \`await isReady\` before \`new ${className}()\``;
let methodError = (
  className,
  methodName
) => `Cannot call static method because snarkyjs has not finished loading.
Try calling \`await isReady\` before \`${className}.${methodName}()\``;
