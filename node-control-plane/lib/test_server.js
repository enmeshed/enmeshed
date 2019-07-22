'use strict';

var _ = require('.');

let myEnv;

class MyController extends _.Controller {
  constructor(...args) {
    super(...args);
    this.nodes = {};
  }

  identifyNode(nodeInfo) {
    const hash = `cluster:${nodeInfo.cluster}:id:${nodeInfo.id}`;
    if (this.nodes[hash]) return this.nodes[hash];
    const node = new _.Node(hash);
    node.environment = myEnv;
    this.nodes[hash] = node;
    return node;
  } // Test dynamism; one second after node connects, push a new cluster def


  nodeDidConnect(node) {
    setTimeout(function () {
      return myEnv.update([Cluster.fromObject({
        name: "second_cluster",
        connect_timeout: {
          seconds: 5
        },
        type: "STATIC",
        lb_policy: "ROUND_ROBIN",
        hosts: [{
          socket_address: {
            address: '127.0.0.1',
            port_value: 12345
          }
        }],
        http2_protocol_options: {}
      })]);
    }, 1000);
  }

  nodeDidDisconnect(node) {
    return;
  }

}

const controller = new MyController();
myEnv = controller.createEnvironment("testEnvironment");
const Cluster = controller.types.Cluster;
myEnv.set([Cluster.fromObject({
  name: "my_cluster",
  connect_timeout: {
    seconds: 5
  },
  type: "EDS",
  eds_cluster_config: {
    eds_config: {
      ads: {}
    }
  },
  lb_policy: "ROUND_ROBIN",
  http2_protocol_options: {}
})]);
controller.serve('0.0.0.0:34567');
//# sourceMappingURL=test_server.js.map
