
import {struct, union, Str, Num, Bool,
        Arr, Obj, Func, Err, Re,
        Dat, Nil, Any} from 'tcomb'

export default {
  Build: struct({
    project: Str,
    modified: Dat,
    num: Num,
  }, 'Build'),

  Project: struct({
    name: Str,
    modified: Dat,
    source: union([struct({
      path: Str,
    }), struct({
      provider: Str,
      config: Obj,
    })]),
    build: union([Bool, struct({
      dockerfile: Str,
      context: union([Bool, Str]),
    }), struct({
      prefab: Str,
    })]),
    test: Obj,
  }, 'Project'),
}

