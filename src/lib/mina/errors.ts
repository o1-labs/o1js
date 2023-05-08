export { CatchAndPrettifyStacktrace };

function CatchAndPrettifyStacktrace(
  _target: any,
  _propertyName: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  descriptor.value = async function (...args: any[]) {
    try {
      const result = await originalMethod.apply(this, args);
      return result;
    } catch (error) {
      const prettyStacktrace = prettifyStacktrace(error);
      if (prettyStacktrace && error instanceof Error) {
        error.stack = prettyStacktrace;
      }
      throw error;
    }
  };
}

const lineRemovalKeywords = [
  'snarky_js_node.bc.cjs',
  '/builtin/',
  'CatchAndPrettifyStacktrace', // Decorator name to remove from stacktrace
] as const;

function prettifyStacktrace(error: unknown): string | undefined {
  if (!(error instanceof Error) || !error.stack) return undefined;

  const stacktrace = error.stack;
  const stacktraceLines = stacktrace.split('\n');
  const newStacktrace: string[] = [];

  for (let i = 0; i < stacktraceLines.length; i++) {
    const shouldRemoveLine = lineRemovalKeywords.some((lineToRemove) =>
      stacktraceLines[i].includes(lineToRemove)
    );
    if (shouldRemoveLine) {
      continue;
    }
    const trimmedLine = trimPaths(stacktraceLines[i]);
    newStacktrace.push(trimmedLine);
  }
  return newStacktrace.join('\n');
}

function trimPaths(stacktracePath: string) {
  const includesSnarkyJS = stacktracePath.includes('snarkyjs');
  if (includesSnarkyJS) {
    return trimSnarkyJSPath(stacktracePath);
  }

  const includesOpam = stacktracePath.includes('opam');
  if (includesOpam) {
    return trimOpamPath(stacktracePath);
  }
  return stacktracePath;
}

function trimSnarkyJSPath(stacktraceLine: string) {
  // Regex to match the path inside the parentheses (e.g. (/home/../snarkyjs/../*.ts))
  const fullPathRegex = /\(([^)]+)\)/;
  const matchedPaths = stacktraceLine.match(fullPathRegex);
  if (!matchedPaths) {
    return stacktraceLine;
  }

  const fullPath = matchedPaths[1];
  const snarkyJSIndex = fullPath.indexOf('snarkyjs');
  if (snarkyJSIndex === -1) {
    return stacktraceLine;
  }

  // Grab the text before the parentheses as the prefix
  const prefix = stacktraceLine.slice(0, stacktraceLine.indexOf('(') + 1);
  // Grab the text including and after the snarkyjs path
  const updatedPath = fullPath.slice(snarkyJSIndex);
  return `${prefix}${updatedPath})`;
}

function trimOpamPath(stacktraceLine: string) {
  // Regex to match the path inside the parentheses (e.g. (/home/../snarkyjs/../*.ts))
  const fullPathRegex = /\(([^)]+)\)/;
  const matchedPaths = stacktraceLine.match(fullPathRegex);
  if (!matchedPaths) {
    return stacktraceLine;
  }

  const fullPath = matchedPaths[1];
  const opamIndex = fullPath.indexOf('opam');
  if (opamIndex === -1) {
    return stacktraceLine;
  }

  const updatedPathArray = fullPath.slice(opamIndex).split('/');
  const libIndex = updatedPathArray.lastIndexOf('lib');
  if (libIndex === -1) {
    return stacktraceLine;
  }

  // Grab the text before the parentheses as the prefix
  const prefix = stacktraceLine.slice(0, stacktraceLine.indexOf('(') + 1);
  // Grab the text including and after the opam path, removing the lib directory
  const trimmedPath = updatedPathArray.slice(libIndex + 1);
  // Add the ocaml directory to the beginning of the path
  trimmedPath.unshift('ocaml');
  return `${prefix}${trimmedPath.join('/')})`;
}
