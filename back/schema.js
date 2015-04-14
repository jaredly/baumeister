
import {
  struct, union, maybe, enums,
  list, Str, Num, Bool, Arr,
  Obj, Func, Err,
  Re, Dat, Nil, Any
} from 'tcomb'

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

  Project: struct({
    name: Str,
    modified: Dat,
    status: Str,
    latestBuild: maybe(Str),
    source: union([
      struct({
        path: Str,
      }),
      struct({
        shell: Str,
      }),
      struct({
        provider: Str,
        config: Obj,
      })
    ], 'source'),

    build: union([
      // Str,
      // Bool,
      struct({
        dockerfile: Str,
        context: maybe(union([Bool, Str])),
        noRebuild: maybe(Bool),
      }),
      struct({
        prefab: Str,
      })
    ], 'build'),

    test: struct({
      cwd: maybe(Str),
      cmd: maybe(Str),
    }, 'test'),
  }, 'Project'),
}

