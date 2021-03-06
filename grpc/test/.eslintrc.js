module.exports = {
  "parser": "@lightscript/eslint-plugin",
  "plugins": ["@lightscript/eslint-plugin"],
  "extends": [
    "plugin:@lightscript/recommended"
  ],
  "parserOptions": {
    "sourceType": "module"
  },
  "env": {
    "node": true,
    "es6": true,
    "jest": true
  },
  "rules": {
    "no-debugger": 0
  }
}
