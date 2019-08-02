# @enmeshed/bowser

The boss of your cluster.

- Serves an Envoy ADS control plane over gRPC.
- Examines roles of incoming Envoy requests as assigned through metadata.
- Automatically builds configs for Envoy sidecars so they can reach all known mesh-reflection services.
