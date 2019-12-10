module.exports = {
  "presets": [
    [
      "@lightscript",
      {
        "stdlib": {
          "lodash": false
        },
        "env": {
          "targets": {
            "chrome": 77,
            "firefox": 68,
            "edge": 17,
            "node": 10
          }
        }
      }
    ]
  ]
}
