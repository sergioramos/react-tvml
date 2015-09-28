if (!global.window) {
  global.window = Object.keys(global).map(function(name) {
    return {
      name: name,
      value: global[name]
    };
  }).reduce(function(win, prop) {
    win[prop.name] = prop.value;
    return win;
  }, {});
}