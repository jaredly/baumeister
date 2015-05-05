
import {
  struct, union as tunion, maybe, enums,
  list, Str, Num, Bool, Arr,
  Obj, Func, Err,
  Re, Dat, Nil, Any
} from 'tcomb'

import {validate} from 'tcomb-validation'

function union(types, name) {
  var Union = tunion(types, name);
  // automatically define a dispatch function
  Union.dispatch = function (x) {
    var ctor = null;
    for (var i = 0; i < types.length; i++) {
      if (validate(x, types[i]).isValid()) {
        ctor = types[i];
        break;
      }
    }
    return ctor;
  };
  return Union;
}

export default {
  Build: struct({
    project: Str, // id
    started: Dat,
    finished: maybe(Dat),
    status: enums.of('unstarted running errored failed succeeded'),
    num: Num,
    events: list(struct({
      evt: Str,
      val: union([Obj, Str]),
      time: Dat,
    })),
  }, 'Build'),

  Config: struct({
    notifications: enums.of('all none failures'),
  }),

  Project: struct({
    name: Str,
    modified: Dat,
    status: maybe(Str),
    latestBuild: maybe(Str),

    plugins: Obj,
  }, 'Project'),
}

