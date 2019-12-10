const { CodeGenerator } = require('@enmeshed/protobuf')

const path = require('path')
const fs = require('fs')

const gen = new CodeGenerator({internalPreamble: true})

// Add google protos
var protos = [
  'google/rpc/code.proto',
  'google/rpc/error_details.proto',
  'google/rpc/status.proto',
  'mesh/MarshalledError.proto',
  'mesh/MarshalledErrorDetail.proto'
];

var sourceDir = path.join(__dirname, 'proto');

for (const proto of protos) {
  var fullPath = path.join(sourceDir, proto)
  var descriptor = CodeGenerator.loadFile(fullPath)
  gen.addDefinition(proto, descriptor)
}


fs.writeFileSync('wkp.js', gen.finish())
