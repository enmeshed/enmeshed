const { CodeGenerator } = require('.')

const path = require('path')
const fs = require('fs')

const gen = new CodeGenerator({internalPreamble: true})

// Add google protos
var wellKnownProtos = ['api', 'descriptor', 'source_context', 'type'];
var sourceDir = path.join(path.dirname(require.resolve('protobufjs')), 'google', 'protobuf');
for (var _i = 0, wellKnownProtos_1 = wellKnownProtos; _i < wellKnownProtos_1.length; _i++) {
    var proto = wellKnownProtos_1[_i];
    var file = path.join(sourceDir, proto + ".proto");
    var descriptor_1 = CodeGenerator.loadFile(file)
    gen.addDefinition(proto, descriptor_1.nested.google.nested.protobuf.nested)
}

fs.writeFileSync('wkp.js', gen.finish())
