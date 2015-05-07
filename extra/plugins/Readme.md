
Plugin api

# Plugin manifest

```javascript
{
  /* required */
  id: str // unique id for this plugin
  title: str // human readable name
  plugin: str (abs path to plugin class mogule) or class (the plugin class)
  /* optional */
  // for displaying extra widgets in the UI
  blocks: {
    projectHeader(project, config) -> ReactElement,
  }
  // for project-level config
  projectConfig: {
    schema: // schema for the project config
    form: ReactComponent class. if falsy, the schema will be rendered as a form.
  },
  // if your plugin needs global config (for example, github auth)
  globalConfig: {
    schema: // schema for the global (user-level) config
    form: ReactComponent class. if falsy, the schema will be rendered as a form.
  },
  // if you want to define your own stores, this is the place for it
  flux(api) {
    // returns {store, actions}
  },
}
```


# Plugin Interface

## `onConfig`
Called when global config changes for a plugin.
This is required for plugins that define a `globalConfig` in their manifest.

## `onProject(project, config)`

project: the projectObj. either the project was just created with this plugin configured, or the plugin was just added to the project
config: the plugin config

## `offProject(project, config)`

project: the projectObj. the plugin was just deconfigured from this project, or the project was deleted
config: the old plugin config

## `onBuild(project, build, onStep, config)`

A build is starting.

onStep can return a Promise to indicate that async work is being done.
```
onStep('test', (builder, ctx, io) => {
  io.emit('info', 'doing something')
  return builder.run('echo "yup, something")
})
```

## `offBuild(project, build, config)`

A build ended

## `projectDataFromBuild(build, config, currentData, project)`

This is used to aggregate build data into the project, for plugins that want to do that sort of thing. See `time-tracker` for an example.

This is called when a build ends.

build: the data of the build that just ended
config: plugin config as defined on the project
currentData: the current pluginData on the project for this plugin
project: the full project object

## `changeProject(project, prevConfig, newConfig)`

... this might not be implemented yet.



