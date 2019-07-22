'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path$1 = _interopDefault(require('path'));
var fs$1 = _interopDefault(require('fs'));

/**
 * @license
 * Copyright 2018 gRPC authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
// @enmeshed: Modification of gRPC's protobuf loader. The primary change
// is to give programmatic access to the Protobuf root.
var fs = require("fs");

var path = require("path");

var Protobuf = require("protobufjs");

var descriptor = require("protobufjs/ext/descriptor");

var camelCase = require("lodash.camelcase");

var descriptorOptions = {
  longs: String,
  enums: String,
  bytes: String,
  defaults: true,
  oneofs: true,
  json: true
};

function joinName(baseName, name) {
  if (baseName === '') {
    return name;
  } else {
    return baseName + '.' + name;
  }
}

function isHandledReflectionObject(obj) {
  return obj instanceof Protobuf.Service || obj instanceof Protobuf.Type || obj instanceof Protobuf.Enum;
}

function isNamespaceBase(obj) {
  return obj instanceof Protobuf.Namespace || obj instanceof Protobuf.Root;
}

function getAllHandledReflectionObjects(obj, parentName) {
  var objName = joinName(parentName, obj.name);

  if (isHandledReflectionObject(obj)) {
    return [[objName, obj]];
  } else {
    if (isNamespaceBase(obj) && typeof obj.nested !== undefined) {
      return Object.keys(obj.nested).map(function (name) {
        return getAllHandledReflectionObjects(obj.nested[name], objName);
      }).reduce(function (accumulator, currentValue) {
        return accumulator.concat(currentValue);
      }, []);
    }
  }

  return [];
}

function createDeserializer(cls, options) {
  return function deserialize(argBuf) {
    return cls.toObject(cls.decode(argBuf), options);
  };
}

function createSerializer(cls) {
  return function serialize(arg) {
    var message = cls.fromObject(arg);
    return cls.encode(message).finish();
  };
}

function createMethodDefinition(method, serviceName, options) {
  /* This is only ever called after the corresponding root.resolveAll(), so we
   * can assume that the resolved request and response types are non-null */
  var requestType = method.resolvedRequestType;
  var responseType = method.resolvedResponseType;
  return {
    path: '/' + serviceName + '/' + method.name,
    requestStream: !!method.requestStream,
    responseStream: !!method.responseStream,
    requestSerialize: createSerializer(requestType),
    requestDeserialize: createDeserializer(requestType, options),
    responseSerialize: createSerializer(responseType),
    responseDeserialize: createDeserializer(responseType, options),
    // TODO(murgatroid99): Find a better way to handle this
    originalName: camelCase(method.name),
    requestType: createMessageDefinition(requestType),
    responseType: createMessageDefinition(responseType)
  };
}

function createServiceDefinition(service, name, options) {
  var def = {};

  for (var _i = 0, _a = service.methodsArray; _i < _a.length; _i++) {
    var method = _a[_i];
    def[method.name] = createMethodDefinition(method, name, options);
  }

  return def;
}

var fileDescriptorCache = new Map();

function getFileDescriptors(root) {
  if (fileDescriptorCache.has(root)) {
    return fileDescriptorCache.get(root);
  } else {
    var descriptorList = root.toDescriptor('proto3').file;
    var bufferList = descriptorList.map(function (value) {
      return Buffer.from(descriptor.FileDescriptorProto.encode(value).finish());
    });
    fileDescriptorCache.set(root, bufferList);
    return bufferList;
  }
}

function createMessageDefinition(message) {
  var messageDescriptor = message.toDescriptor('proto3');
  return {
    format: 'Protocol Buffer 3 DescriptorProto',
    type: messageDescriptor.$type.toObject(messageDescriptor, descriptorOptions),
    fileDescriptorProtos: getFileDescriptors(message.root)
  };
}

function createEnumDefinition(enumType) {
  var enumDescriptor = enumType.toDescriptor('proto3');
  return {
    format: 'Protocol Buffer 3 EnumDescriptorProto',
    type: enumDescriptor.$type.toObject(enumDescriptor, descriptorOptions),
    fileDescriptorProtos: getFileDescriptors(enumType.root)
  };
}
/**
 * function createDefinition(obj: Protobuf.Service, name: string, options:
 * Options): ServiceDefinition; function createDefinition(obj: Protobuf.Type,
 * name: string, options: Options): MessageTypeDefinition; function
 * createDefinition(obj: Protobuf.Enum, name: string, options: Options):
 * EnumTypeDefinition;
 */


function createDefinition(obj, name, options) {
  if (obj instanceof Protobuf.Service) {
    return createServiceDefinition(obj, name, options);
  } else if (obj instanceof Protobuf.Type) {
    return createMessageDefinition(obj);
  } else if (obj instanceof Protobuf.Enum) {
    return createEnumDefinition(obj);
  } else {
    throw new Error('Type mismatch in reflection object handling');
  }
}

function createPackageDefinition(root, options) {
  var def = {};
  root.resolveAll();

  for (var _i = 0, _a = getAllHandledReflectionObjects(root, ''); _i < _a.length; _i++) {
    var _b = _a[_i],
        name = _b[0],
        obj = _b[1];
    def[name] = createDefinition(obj, name, options);
  }

  return def;
}

function addIncludePathResolver(root, includePaths) {
  var originalResolvePath = root.resolvePath;

  root.resolvePath = function (origin, target) {
    if (path.isAbsolute(target)) {
      return target;
    }

    for (var _i = 0, includePaths_1 = includePaths; _i < includePaths_1.length; _i++) {
      var directory = includePaths_1[_i];
      var fullPath = path.join(directory, target);

      try {
        fs.accessSync(fullPath, fs.constants.R_OK);
        return fullPath;
      } catch (err) {
        continue;
      }
    }

    return originalResolvePath(origin, target);
  };
}
function loadSync(filename, options) {
  options = options || {};
  var root = options.root || new Protobuf.Root();

  if (!!options.includeDirs) {
    if (!Array.isArray(options.includeDirs)) {
      throw new Error('The includeDirs option must be an array');
    }

    addIncludePathResolver(root, options.includeDirs);
  }

  var loadedRoot = root.loadSync(filename, options);
  loadedRoot.resolveAll();
  return createPackageDefinition(root, options);
} // Load Google's well-known proto files that aren't exposed by Protobuf.js.

{
  // Protobuf.js exposes: any, duration, empty, field_mask, struct, timestamp,
  // and wrappers. compiler/plugin is excluded in Protobuf.js and here.
  var wellKnownProtos = ['api', 'descriptor', 'source_context', 'type'];
  var sourceDir = path.join(path.dirname(require.resolve('protobufjs')), 'google', 'protobuf');

  for (var _i = 0, wellKnownProtos_1 = wellKnownProtos; _i < wellKnownProtos_1.length; _i++) {
    var proto = wellKnownProtos_1[_i];
    var file = path.join(sourceDir, proto + ".proto");
    var descriptor_1 = Protobuf.loadSync(file).toJSON(); // @ts-ignore

    Protobuf.common(proto, descriptor_1.nested.google.nested);
  }
}

// Create a client for a grpc service bouncing off an Envoy sidecar on port 3000

const grpc = require('@grpc/grpc-js');

const Protobuf$1 = require("protobufjs");

function at(obj, path) {
  let ret = obj;

  for (let _i = 0, _len = path.length; _i < _len; _i++) {
    const e = path[_i];
    ret = ret[e];
  }

  return ret;
}

class Protocols {
  constructor() {
    this._loaded = false;
    this._root = null;
    this._includeDirs = [];
    this._files = [];
    this._pkgs = null;
    this.loadOptions = {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    };
  }

  setProtoPath(...includeDirs) {
    this._includeDirs = includeDirs;
    return this;
  }

  addProtoPath(dir) {
    this._includeDirs.push(dir);

    return this;
  } // Create a gRPC client for the given named service


  client(protoName, port, credentials, opts) {
    const pth = protoName.split('.');
    const client = at(this._pkgs, pth);
    return new client(port, credentials, opts);
  } // Retrieve a gRPC service def for the given named service


  service(protoName) {
    const pth = protoName.split('.');
    const client = at(this._pkgs, pth);
    return client.service;
  }

  type(typeName) {
    return this._root.lookupType(typeName);
  }

  require(protoFile) {
    if (this._loaded) {
      throw new Error(`Protocols.require: cannot call require() after protocols are already loaded.`);
    }

    const fileName = `${protoFile}.proto`; // Resolve the proto package in the include dirs

    for (let _arr = this._includeDirs, _i2 = 0, _len2 = _arr.length; _i2 < _len2; _i2++) {
      const dir = _arr[_i2];
      const target = path$1.resolve(dir, fileName);

      if (fs$1.existsSync(target)) {
        this._files.push(target);

        return;
      }
    } // first match wins
    // File not found


    throw new Error(`Protocols.require: could not find protocol file matching '${fileName}' in include path.`);
  }

  load() {
    if (this._loaded) return;
    this._root = new Protobuf$1.Root();
    const opts = Object.assign({}, this.loadOptions, {
      includeDirs: this._includeDirs,
      root: this._root
    });
    const pkgDef = loadSync(this._files, opts);
    this._pkgs = grpc.loadPackageDefinition(pkgDef);
  }

}

const deferred = require('p-defer'); // Classify a method on a grpc client object


function classifyMethod(method) {
  const requestStream = method.requestStream,
        responseStream = method.responseStream;

  if (!requestStream && !responseStream) {
    return 'unary';
  } else if (requestStream && !responseStream) {
    return 'requestStream';
  } else if (!requestStream && responseStream) {
    return 'responseStream';
  } else if (requestStream && responseStream) {
    return 'bidirectionalStream';
  } else {
    throw new Error('classifyMethod: unrecognized method');
  }
}
function isThenable(thing) {
  const ty = typeof thing;
  return thing && (ty === 'object' || ty === 'function') && typeof thing.then === 'function';
}

class StreamHandler {
  constructor(stream) {
    this.stream = stream;
  } // Create a stream handler on the fly with given callbacks.


  static with(callbacks) {
    const next = new this(null);
    Object.assign(next, callbacks);
    return next;
  }

  marshalError(err) {
    return err;
  } // Hangs up this end of the stream, indicating no more data will be sent.
  // If the `err` argument exists, the stream will instead end with an
  // error condition.


  end(err) {
    if (err) {
      this._iFailed = true;
      return this.stream.emit('error', this.marshalError(err));
    } else {
      return this.stream.end();
    }
  } // if(
  //   this.stream.writable
  //   // XXX: It may be that the peer hung up BOTH ends of the stream,
  //   // for example if the peer process was killed at the OS level.
  //   // gRPC does not handle this well and still tries to write a final
  //   // packet, crashing the whole app.
  //   //
  //   // Dig into the innards here and verify this isn't the case.
  //   and this.stream.call?.stream?.writable
  // ):
  //   this.stream.end()
  // else:
  //   console.error("wtf stream not writeable", this.stream.call.stream)
  // Writes data to the stream. Data must be an object matching the appropriate
  // protobuf.


  write(data) {
    return this.stream.write(data);
  } // Handle an error. Any error automatically closes the stream, so it is
  // not necessary to close the stream in the handler.
  // The isInternal argument is `true` if the error was generated by
  // user code on this side of the stream.


  error(err, isInternal) {
    return;
  } // Called when the stream is opened, before any incoming data is processed.
  // The stream is writeable at this point; metadata can be sent as well as
  // initial greetings.


  start(stream) {
    return;
  } // Called when the other end of the stream hangs up, indicating no more
  // data will be received on this end. It is still OK to write responses
  // to the stream at this point.


  hangup() {
    return;
  } // Called when receiving a packet. If this method returns a Promise,
  // it is treated as asynchronously producing a response which will be
  // written to the stream. Otherwise it is treated as a synchronous
  // event handler


  data(packet) {
    return;
  } // A promise that is settled when the stream is closed.


  closedPromise() {
    // Already closed!
    const err = this.getError();

    if (err) {
      return Promise.reject(err);
    } else if (this.isClosed()) {
      return Promise.resolve(this);
    } // Defer


    if (!this._doneDeferred) this._doneDeferred = deferred();
    return this._doneDeferred.promise;
  } // True when both ends of the stream have hung up, or an error occurred.


  isClosed() {
    if (this._error || this._end && this._finish) return true;else return false;
  } // True when any error occured.


  getError() {
    return this._error;
  } // Internal event processing.


  _internal() {
    if (this._doneDeferred) {
      if (this._error) {
        this._doneDeferred.reject(this._error);
      } else if (this._end && this._finish) {
        this._doneDeferred.resolve(this);
      }
    }
  }

}
function handleStream(stream, handler) {
  handler.stream = stream;
  stream.on('error', function (err) {
    handler._error = err; // XXX: Google's grpc.js doesn't do any client-side error handling.
    // The only way to indicate an uncaught client side error is to
    // cancel the gRPC call.

    if (handler._isClient) {
      // console.log("cancelling call due to error")
      stream.cancel();
    }

    if (!handler._iFailed) {
      handler.error(err, false);
    } else {
      handler.error(err, true);
    }

    handler._internal();
  });
  handler.start(stream);
  stream.on('data', function (packet) {
    let hres;

    try {
      hres = handler.data(packet, stream);
    } catch (err) {
      handler.end(err);
      return;
    } // Handler may be sync or async. If it's a promise, handle it


    if (isThenable(hres)) {
      hres.then(function (val) {
        if (val && typeof val === "object") {
          stream.write(val);
        }
      }).catch(function (err) {
        handler.end(err);
      });
    }
  });
  stream.on('end', function () {
    handler._end = true; // Remote hangup

    handler.hangup();
    return handler._internal();
  });
  stream.on('finish', function () {
    handler._finish = true;
    return handler._internal();
  });
}

function wrapUnaryMethod(method, context) {
  function grpcUnary(request, metadata) {
    if (metadata) {
      return new Promise(function (resolve, reject) {
        return method.call(context, request, metadata, function (err, response) {
          return err ? reject(err) : resolve(response);
        });
      });
    } else {
      return new Promise(function (resolve, reject) {
        return method.call(context, request, function (err, response) {
          return err ? reject(err) : resolve(response);
        });
      });
    }
  }

  return grpcUnary;
} // Streams are already async iterable.


function wrapResponseStreamMethod(method, context) {
  return method.bind(context);
} // When calling a method with a request stream, the user provides an async
// generator that produces the stream of values.


function wrapRequestStreamMethod(method, context) {
  function grpcRequestStream(asyncGenerator, metadata) {
    // Promisify the grpc callback
    return new Promise((resolve, reject) => {
      let stream = null; // Dump from the async generator to the stream

      const writer = async function () {
        try {
          for await (const packet of asyncGenerator(stream)) stream.write(packet);
        } catch (err) {
          // If the async generator errors, cancel the call to the
          // server.
          stream.cancel(); // XXX: custom error type, "ClientError"?

          reject(err);
        } finally {
          stream.end();
        }
      };

      stream = metadata ? method.call(context, metadata, function (err, response) {
        return err ? reject(err) : resolve(response);
      }) : method.call(context, function (err, response) {
        return err ? reject(err) : resolve(response);
      });
      writer();
    });
  }

  return grpcRequestStream;
} // new Promise!
// For the time being, just use the streaming API.
// There is probably some solution involving async generators but in this case
// it is going to require a bunch of combinators and be really slow.


function wrapBidiStreamMethod(method, context) {
  function grpcBidiStream(handler) {
    const stream = method.call(context);
    handler.stream = stream; // XXX: client-side handlers need different error handling

    handler._isClient = true;
    handleStream(stream, handler);
    return handler;
  }

  return grpcBidiStream;
}

function wrapMethod(methodName, method, context) {
  const classification = classifyMethod(method);

  if (classification === 'unary') {
    return wrapUnaryMethod(method, context);
  } else if (classification === 'requestStream') {
    return wrapRequestStreamMethod(method, context);
  } else if (classification === 'responseStream') {
    return wrapResponseStreamMethod(method, context);
  } else if (classification === 'bidirectionalStream') {
    return wrapBidiStreamMethod(method, context);
  } else {
    // XXX: throw?
    console.log(`Couldn't wrap method ${methodName}`);
    return method;
  }
} // Allow clients to be enhanced


class ClientEnhancer {
  constructor(grpcClient) {
    this.grpcClient = grpcClient;

    this._wrapMethods();
  }

  _wrapMethods() {
    const grpcClient = this.grpcClient;

    for (let _obj = Object.getPrototypeOf(grpcClient), _i = 0, _keys = Object.keys(_obj), _len = _keys.length; _i < _len; _i++) {
      const k = _keys[_i];
      const method = _obj[k];

      if (typeof method === 'function') {
        this[k] = wrapMethod(k, method, grpcClient);
      }
    }
  }

}

class UnaryResponse {}

function marshalUnary(promisedUnary, callback, marshalErrorContext) {
  return promisedUnary.then(function (result) {
    if (typeof result !== 'object') {
      throw new Error("invalid response");
    } else if (result instanceof UnaryResponse) {
      return callback(null, result.value, result.trailer, result.flags);
    } else {
      return callback(null, result);
    }
  }).catch(function (err) {
    return callback(marshalErrorContext.marshalError(err));
  });
} // Marshal a stream of response objects produced by an async generator function.


async function marshalStream(asyncGenerator, stream, marshalErrorContext, arg1, arg2) {
  try {
    const asyncGeneratorInstance = asyncGenerator(arg1, arg2);

    for await (const packet of asyncGeneratorInstance) stream.write(packet);

    return stream.end();
  } catch (err) {
    // gRPC automatically destroys the stream on error event.
    return stream.emit('error', marshalErrorContext.marshalError(err));
  }
} // XXX: metadata api


class ServerEnhancer {
  constructor(grpcServer) {
    this.grpcServer = grpcServer;
  } // Promisified bindAsync


  bind(port, credentials) {
    const server = this.grpcServer;
    return new Promise(function (resolve, reject) {
      return server.bindAsync(port, credentials, function (err) {
        if (err) {
          return reject(err);
        } else {
          return resolve(true);
        }
      });
    });
  }

  start() {
    return this.grpcServer.start();
  } // Promisified tryShutdown


  shutdown() {
    const server = this.grpcServer;
    return new Promise(function (resolve, reject) {
      return server.tryShutdown(function (err) {
        return err ? reject(err) : resolve(true);
      });
    });
  } // Override in a subclass to control how JS errors are marshalled into
  // gRPC errors and returned to the client.


  marshalError(err) {
    return err;
  }

  _wrapUnary(asyncHandler) {
    const unaryAsyncHandler = (call, callback) => {
      marshalUnary(asyncHandler(call.request, call), callback, this);
    };

    return unaryAsyncHandler;
  }

  _wrapRequestStream(asyncHandler) {
    const requestStreamAsyncHandler = (stream, callback) => {
      // In Node 10, stream is an async iterable which is how request streams
      // should be processed.
      marshalUnary(asyncHandler(stream), callback, this);
    };

    return requestStreamAsyncHandler;
  }

  _wrapResponseStream(asyncGenerator) {
    const responseStreamAsyncHandler = stream => {
      marshalStream(asyncGenerator, stream, this, stream.request, stream);
    };

    return responseStreamAsyncHandler;
  }

  _wrapBidiStream(handlerClass) {
    const marshalContext = this;

    function bidiStreamAsyncHandler(stream) {
      const handler = new handlerClass(stream, marshalContext);

      handler.marshalError = function (err) {
        return marshalContext.marshalError(err);
      };

      handleStream(stream, handler);
    }

    return bidiStreamAsyncHandler;
  }

  addService(serviceDef, bindings) {
    // Transform bindings
    const nextBindings = (() => {
      const _obj = {};

      for (let _i = 0, _keys = Object.keys(bindings), _len = _keys.length; _i < _len; _i++) {
        const name = _keys[_i];
        const handler = bindings[name];
        // Get protobuf method definition
        const methodDef = serviceDef[name];

        if (!methodDef) {
          throw new Error(`ServerEnhancer.addService: service has no method named ${name}`);
        } // Wrap async handlers


        _obj[name] = (_it => {
          if (_it === 'unary') {
            return this._wrapUnary(handler);
          } else if (_it === 'requestStream') {
            return this._wrapRequestStream(handler);
          } else if (_it === 'responseStream') {
            return this._wrapResponseStream(handler);
          } else if (_it === 'bidirectionalStream') {
            return this._wrapBidiStream(handler);
          } else {
            throw new Error("invalid method definition " + name);
          }
        })(classifyMethod(methodDef));
      }

      return _obj;
    })();

    this.grpcServer.addService(serviceDef, nextBindings);
  }

}

exports.ClientEnhancer = ClientEnhancer;
exports.Protocols = Protocols;
exports.ServerEnhancer = ServerEnhancer;
exports.StreamHandler = StreamHandler;
//# sourceMappingURL=index.js.map
