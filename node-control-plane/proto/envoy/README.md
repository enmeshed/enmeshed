These protocols define the Envoy control plane and come from

The protocols have been cleaned up to remove syntax not supported by Protobuf.js.
There are several issues on file with Protobuf.js to fix these bugs and enable
processing of unmodified Envoy protocols. See:

https://github.com/protobufjs/protobuf.js/issues/1262

https://github.com/protobufjs/protobuf.js/issues/1142
