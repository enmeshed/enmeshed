module.exports = {
  "parser": "@lightscript/eslint-plugin",
  "plugins": ["@lightscript/eslint-plugin"],
  "extends": [
    "eslint:recommended",
    "plugin:@lightscript/recommended"
  ],
  "parserOptions": {
    "sourceType": "module"
  },
  "env": {
    "node": true,
    "es6": true
  },
  "rules": {
    "@lightscript/no-implicit-imports": 1,
    "no-unreachable": 0,
    "constructor-super": 0,
    "no-this-before-super": 0
  }
}
