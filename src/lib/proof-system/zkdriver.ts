import { CompileOptions, ConfigBaseType, ZkProgram, verify as zkprogramVerify } from './zkprogram.js';

class ZKDriverImpl {
  _options: CompileOptions

  constructor(options: CompileOptions = {}) {
    this._options = options
  }

  verify = zkprogramVerify
  compile<C extends ConfigBaseType>(program: ZkProgram<C>, userOptions: CompileOptions = {}) {
    // locality takes precedence
    const options = { ...this._options, ...userOptions }
    return program.compile(options)
  }
}

export class ZKDriver extends ZKDriverImpl { };