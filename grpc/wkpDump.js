const path = require('path')
const fs = require('fs')
const Protobuf = require("protobufjs")

let code = `
// Install precompiled well-known protocols.
// THIS FILE IS AUTO-GENERATED
const Protobuf = require('protobufjs')
`

var wellKnownProtos = ['api', 'descriptor', 'source_context', 'type'];
var sourceDir = path.join(path.dirname(require.resolve('protobufjs')), 'google', 'protobuf');
var protoMap = {}
for (var _i = 0, wellKnownProtos_1 = wellKnownProtos; _i < wellKnownProtos_1.length; _i++) {
    var proto = wellKnownProtos_1[_i];
    var file = path.join(sourceDir, proto + ".proto");
    var descriptor_1 = Protobuf.loadSync(file).toJSON();
    // @ts-ignore
    protoMap[proto] = descriptor_1.nested.google.nested
    code += `
Protobuf.common(${JSON.stringify(proto)},${JSON.stringify(descriptor_1.nested.google.nested)})
    `
    // Protobuf.common(proto, descriptor_1.nested.google.nested);
}

code += `
export function nonce() {}
`

fs.writeFileSync('wkp.js', code)
