'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path = _interopDefault(require('path'));
var grpc$1 = require('@enmeshed/grpc');

function _slicedToArray(arr, i) {
  return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest();
}

function _arrayWithHoles(arr) {
  if (Array.isArray(arr)) return arr;
}

function _iterableToArrayLimit(arr, i) {
  var _arr = [];
  var _n = true;
  var _d = false;
  var _e = undefined;

  try {
    for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
      _arr.push(_s.value);

      if (i && _arr.length === i) break;
    }
  } catch (err) {
    _d = true;
    _e = err;
  } finally {
    try {
      if (!_n && _i["return"] != null) _i["return"]();
    } finally {
      if (_d) throw _e;
    }
  }

  return _arr;
}

function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance");
}

class ResourceType {
  constructor(Any, index, typeId, shortName, messageClass) {
    this.index = 0;
    this.typeId = "";
    this.shortName = "";
    this.messageClass = null;
    Object.assign(this, {
      index,
      typeId,
      shortName,
      messageClass,
      Any
    });
  }

  getResourceName(resource) {
    return resource.name;
  } // Convert an object of this resource type to a google.protobuf.Any


  toAny(obj) {
    return this.Any.create({
      type_url: this.typeId,
      value: this.messageClass.encode(obj).finish()
    });
  } // Convert an object to a protobuf matching this resource


  fromObject(obj) {
    return this.messageClass.fromObject(obj);
  }

  checkResource(obj) {
    return obj instanceof this.messageClass.ctor;
  }

}
class ResourceTypes {
  constructor(controller) {
    this._byFqtn = {};
    this._byUrl = {};
    this._byIndex = [];
    this.controller = controller;

    this._loadTypes();
  }

  _loadType(idx, fqtn) {
    const proto = this.controller.proto;
    const path = fqtn.split('.');
    const shortName = path[path.length - 1];
    const url = `type.googleapis.com/${fqtn}`;
    const ty = new ResourceType(this.controller.Any, idx, url, shortName, proto.type(fqtn));
    this[shortName] = ty;
    this._byIndex[idx] = ty;
    this._byFqtn[fqtn] = ty;
    this._byUrl[url] = ty;
    return ty;
  }

  _loadTypes() {
    const ty = this._loadType(0, "envoy.api.v2.ClusterLoadAssignment");

    ty.getName = function getName(resource) {
      return resource.cluster_name;
    };

    this._loadType(1, "envoy.api.v2.Cluster");

    this._loadType(2, "envoy.api.v2.RouteConfiguration");

    this._loadType(3, "envoy.api.v2.Listener");

    return this._loadType(4, "envoy.api.v2.Secret");
  }

  forTypeId(id) {
    return this._byFqtn[id];
  }

  forTypeUrl(url) {
    return this._byUrl[url];
  }

  forIndex(idx) {
    return this._byIndex[idx];
  }

  typeOf(resource) {
    for (let _arr = this._byIndex, _i = 0, _len = _arr.length; _i < _len; _i++) {
      const rType = _arr[_i];
      if (rType.checkResource(resource)) return rType;
    }

    return null;
  }

} // A container storing an element of data for each resource type.

class ResourceTypeData {
  constructor() {
    this.values = [null, null, null, null, null];
  }

  get(type) {
    return this.values[type.index];
  }

  set(type, value) {
    this.values[type.index] = value;
  }

  reset() {
    this.values = [null, null, null, null, null];
  }

  _set(values) {
    this.values = values;
  }

}

const incoming = require('debug')('node-control-plane:traffic:incoming');

const outgoing = require('debug')('node-control-plane:traffic:outgoing'); // Node represents a remote Envoy node that is connected to this control
// plane.


class Node {
  // Connection between Envoy and this node
  // Versions most recently acked
  // Names of each kind of resource requested by the client
  constructor(key) {
    this.controller = null;
    this.environment = null;
    this.key = null;
    this.connection = null;
    this.acked = new ResourceTypeData();
    this.requested = new ResourceTypeData();
    this.key = key;
  } // Clear stateful data related to this connection


  clearConnectionData() {
    this.acked = new ResourceTypeData();
    this.requested = new ResourceTypeData();
  } // Node connected to control plane.


  didConnect(connection) {
    if (this.connection) {
      throw new Error("Node connected twice");
    }

    if (!this.environment) {
      throw new Error("Node must be assigned an environment by Controller.identifyNode");
    }

    this.connection = connection;
    this.controller = connection.controller;
    this.environment.nodeWillJoin(this);
  } // Node disconnected from control plane.


  didDisconnect() {
    this.connection = null;
    this.clearConnectionData();
    this.environment.nodeDidLeave(this);
    this.environment = null;
  } // Environment data changed


  environmentDidChange(environment, diffs) {
    // Issue a discovery response for each type of data that was previously
    // requested by the Envoy server.
    for (let _i = 0, _len = diffs.length; _i < _len; _i++) {
      const ty = diffs[_i];

      if (ty && this.requested.get(ty)) {
        this.sendDiscoveryResponse(ty);
      }
    }
  }

  sendDiscoveryResponse(type) {
    var _this$connection;

    const names = this.requested.get(type);

    const _this$environment$get = this.environment.getMatchingResources(type, names),
          _this$environment$get2 = _slicedToArray(_this$environment$get, 2),
          version = _this$environment$get2[0],
          resources = _this$environment$get2[1];

    outgoing('-> node', this.key, ':', type.typeId, version, resources); // Convert resources to an array of google.protobuf.Any's

    const anyResources = (() => {
      const _arr = [];

      for (let _i2 = 0, _keys = Object.keys(resources), _len2 = _keys.length; _i2 < _len2; _i2++) {
        const _k = _keys[_i2];
        const e = resources[_k];

        _arr.push(type.toAny(e));
      }

      return _arr;
    })();

    return (_this$connection = this.connection) === null || _this$connection === void 0 ? void 0 : _this$connection.write({
      version_info: version.toString(),
      type_url: type.typeId,
      resources: anyResources
    });
  } // Receive a discovery request from Envoy


  discoveryRequest(packet) {
    if (packet.type_url) {
      const type = this.controller.types.forTypeUrl(packet.type_url);
      this.discoveryRequestForType(type, packet);
      return;
    }
  }

  discoveryRequestForType(type, packet) {
    // request is a NACK
    if (packet.error_detail) {
      incoming(`<- node ${this.key}: nack ${type.typeId}`, packet.error_detail); // XXX: nack handling?

      return;
    } // request is an ACK


    if (!packet.error_detail && packet.version_info) {
      incoming(`<- node ${this.key}: ack ${type.typeId} v${packet.version_info}`);
      this.acked.set(type, packet.version_info);
      return;
    } // Specific resource request


    incoming(`<- node ${this.key}: discovery request`, packet);
    this.requested.set(type, packet.resource_names);
    this.sendDiscoveryResponse(type);
  }

}

const debug = require('debug')('node-control-plane:environment');

const obnoxious = require('debug')('node-control-plane:environment:obnoxious');

class Environment {
  // Version for each resource type is an auto-incrementing number
  // Data for each resource type is a Hash<Name, Resource>
  // Nodes that are members of this environment
  // Version nonce string added to each version when propagating to Envoy
  constructor(controller, id) {
    this.id = "";
    this.controller = null;
    this.version = new ResourceTypeData();
    this.data = new ResourceTypeData();
    this.nodes = [];
    this.versionNonce = "";
    this.controller = controller;
    this.id = id || "";

    this.version._set([0, 0, 0, 0, 0]); // XXX: do something better than a random number


    this.versionNonce = `${this.id}_${Math.floor(Math.random() * 100000)}`;
  }

  nodeWillJoin(node) {
    if (this.nodes.find(function (x) {
      return x === node;
    })) {
      throw new Error(`Environment ${this.id}: node ${node.key} was added twice`);
    }

    this.nodes.push(node);
    debug("environment", this.id, ": node", node.key, "joined");
    obnoxious("environment", this.id, "membership:", this.nodes.map(function (x) {
      return x.key;
    }));
  }

  nodeDidLeave(node) {
    if (!this.nodes.find(function (x) {
      return x === node;
    })) {
      throw new Error(`Environment ${this.id}: node ${node.key} was deleted twice`);
    }

    this.nodes = this.nodes.filter(function (x) {
      return x !== node;
    });
    debug("environment", this.id, ": node", node.key, "left");
    obnoxious("environment", this.id, "membership:", this.nodes.map(function (x) {
      return x.key;
    }));
  } // Answer a discovery request for a list of named resources of a given type.
  // For empty name lists, just return all resources of the type.


  getMatchingResources(type, names) {
    const version = this.version.get(type);
    const allResources = this.data.get(type);
    const result = !allResources || !names || names.length === 0 ? [version, allResources || {}] : [version // Filter resources by requested names
    , (() => {
      const _obj = {};

      for (let _i = 0, _len = names.length; _i < _len; _i++) {
        const e = names[_i];
        if (allResources[e]) _obj[e] = allResources[e];
      }

      return _obj;
    })()];
    obnoxious("getMatchingResources", type.typeId, names, result);
    return result;
  }

  hasResourcesOfType(type) {
    const data = this.data.get(type);
    if (data && Object.keys(data).length > 0) return true;else return false;
  }

  _setResources(type, resourceList) {
    const nextData = (() => {
      const _obj2 = {};

      for (let _i2 = 0, _len2 = resourceList.length; _i2 < _len2; _i2++) {
        const resource = resourceList[_i2];
        _obj2[type.getResourceName(resource)] = resource;
      }

      return _obj2;
    })();

    this.data.set(type, nextData);
  }

  _clearResources(type) {
    this.data.set(type, null);
  }

  _bumpVersion(type) {
    const version = this.version.get(type);
    this.version.set(type, version + 1);
  } // Inform nodes in this environment that data has changed.


  _handleDiff(diff) {
    var _diff$, _diff$2, _diff$3, _diff$4, _diff$5;

    obnoxious("diff", (_diff$ = diff[0]) === null || _diff$ === void 0 ? void 0 : _diff$.typeId, (_diff$2 = diff[1]) === null || _diff$2 === void 0 ? void 0 : _diff$2.typeId, (_diff$3 = diff[2]) === null || _diff$3 === void 0 ? void 0 : _diff$3.typeId, (_diff$4 = diff[3]) === null || _diff$4 === void 0 ? void 0 : _diff$4.typeId, (_diff$5 = diff[4]) === null || _diff$5 === void 0 ? void 0 : _diff$5.typeId);

    for (let _arr = this.nodes, _i3 = 0, _len3 = _arr.length; _i3 < _len3; _i3++) {
      const node = _arr[_i3];
      node.environmentDidChange(this, diff);
    }
  } // Set the resources in this environment equal to the resources in the list.
  // Removes all other resources.


  set(resourceList) {
    const diff = [null, null, null, null, null];
    const seen = [null, null, null, null, null];
    const next = [[], [], [], [], []]; // Collate by type

    for (let _i4 = 0, _len4 = resourceList.length; _i4 < _len4; _i4++) {
      const resource = resourceList[_i4];
      const ty = this.controller.types.typeOf(resource);

      if (!ty) {
        throw new Error("Resource of invalid type " + resource);
      }

      seen[ty.index] = ty;
      diff[ty.index] = ty;
      next[ty.index].push(resource);
    } // Perform updates for types seen


    for (let i = 0, _len5 = seen.length; i < _len5; i++) {
      const ty = seen[i];

      if (ty) {
        // For those types seen, store the new resources
        this._bumpVersion(ty);

        this._setResources(ty, next[i]);
      } else {
        // For those types not seen, if they are populated, create a diff entry
        // indicating that they will be emptied
        const unseenType = this.controller.types.forIndex(i);

        if (this.hasResourcesOfType(unseenType)) {
          this._bumpVersion(unseenType);

          this._clearResources(unseenType);

          diff[i] = unseenType;
        }
      }
    } // Broadcast differences to interested nodes


    this._handleDiff(diff);
  }

  update(resourceList, deletions) {
    const diff = [null, null, null, null, null]; // Modifications

    for (let _i5 = 0, _len6 = resourceList.length; _i5 < _len6; _i5++) {
      const resource = resourceList[_i5];
      const ty = this.controller.types.typeOf(resource);
      if (!ty) throw new Error("Resource of invalid type " + resource);
      diff[ty.index] = ty; // Store resource

      let data = this.data.get(ty);

      if (!data) {
        data = {};
        this.data.set(ty, data);
      }

      data[ty.getResourceName(resource)] = resource;
    } // Deletions


    for (let _arr2 = deletions || [], _i6 = 0, _len7 = _arr2.length; _i6 < _len7; _i6++) {
      const _arr2$_i = _slicedToArray(_arr2[_i6], 2),
            ty = _arr2$_i[0],
            name = _arr2$_i[1];

      diff[ty.index] = ty;
      const data = this.data.get(ty);
      if (data) delete data[name];
    } // Bump versions for types with diffs


    for (let _i7 = 0, _len8 = diff.length; _i7 < _len8; _i7++) {
      const ty = diff[_i7];
      if (ty) this._bumpVersion(ty);
    }

    this._handleDiff(diff);
  }

}

const debug$1 = require('debug')('node-control-plane'); // An ADS Streaming API connection


class Connection extends grpc$1.StreamHandler {
  // The Node on the other side of this connection
  constructor(stream, server) {
    super(stream, server);
    this.peer = null;
    this.controller = server.controller;
  }

  didDisconnect() {
    if (this.peer) {
      debug$1("Node will disconnect: ", this.peer.key);
      this.peer.didDisconnect();
      this.controller.nodeDidDisconnect(this.peer);
      this.peer = null;
    }
  }

  start() {
    debug$1("gRPC connection opened");
    return;
  }

  error(err, isInternal) {
    debug$1("Connection encountered error", err);
    this.didDisconnect();
  }

  data(packet) {
    // If we don't know which Envoy instance we're talking to, find out using
    // the Node protobuf info
    if (!this.peer) {
      debug$1("New node connected, identifying", packet.node);
      const node = this.controller.identifyNode(packet.node);

      if (!node) {
        debug$1("Node was unidentified, dropping");
        this.end(new Error("unrecognized node"));
      }

      debug$1("Opened stream with peer id: ", node.key);
      this.peer = node;
      node.didConnect(this);
      this.controller.nodeDidConnect(this.peer);
    }

    this.peer.discoveryRequest(packet);
  }

  hangup() {
    debug$1("Envoy peer hung up: ", this.peer.key);
    this.end();
    return this.didDisconnect();
  }

}

const grpc = require('@grpc/grpc-js');

const debug$2 = require('debug')('node-control-plane');

const PROTO_PATH = path.resolve(__dirname, '..', 'proto');

const GOOG_PROTO_PATH = require.resolve('protobufjs');

class Controller {
  constructor(opts) {
    this.Connection = Connection;
    this.Environment = (opts === null || opts === void 0 ? void 0 : opts.Environment) || Environment;
    this.proto = new grpc$1.Protocols();

    this._requireProtocols();

    this.types = new ResourceTypes(this);
    this.server = new grpc$1.ServerEnhancer(new grpc.Server());
    this.server.controller = this;
    this.server.addService(this.proto.service("envoy.service.discovery.v2.AggregatedDiscoveryService"), {
      StreamAggregatedResources: this.Connection
    });
  } // Require envoy protocols


  _requireProtocols() {
    const proto = this.proto;
    proto.addProtoPath(PROTO_PATH);
    proto.addProtoPath(GOOG_PROTO_PATH);

    proto.require('envoy/api/v2/rds');

    proto.require('envoy/api/v2/cds');

    proto.require('envoy/api/v2/eds');

    proto.require('envoy/api/v2/lds');

    proto.require('envoy/service/discovery/v2/ads');

    proto.require('envoy/service/discovery/v2/sds');

    proto.load();
    this.Any = proto.type("google.protobuf.Any");
    this.typeProtocols = [proto.type("envoy.api.v2.ClusterLoadAssignment"), proto.type("envoy.api.v2.Cluster"), proto.type("envoy.api.v2.RouteConfiguration"), proto.type("envoy.api.v2.Listener"), proto.type("envoy.api.v2.Secret")];
  }

  nodeDidConnect(node) {
    return;
  }

  nodeDidDisconnect(node) {
    return;
  }

  createEnvironment(id) {
    return new this.Environment(this, id);
  }

  async serve(port, creds) {
    await this.server.bind(port, creds || grpc.ServerCredentials.createInsecure());
    this.server.start();
    debug$2(`gRPC server listening on ${port}`);
  }

  stop() {
    return this.server.shutdown();
  }

}

exports.Controller = Controller;
exports.Environment = Environment;
exports.Node = Node;
//# sourceMappingURL=index.js.map
