# @enmeshed/mesh-reflection

Allows members of a service mesh to obtain information about the available services in the mesh.

## Architecture

A `DataSource` collects data from the cluster and saves it to a local, non-persistent store, updating as necessary. There are three types of resources:

### Services

Services are named communication endpoints within the cluster.

- A service has a `name` which must be unique amongst all services.
- A service has a `type` (ex. `gRPC`, `http`, `tcp`, `mysql`) that describes how clients communicate with it.
- A service has type- and environment-dependent `metadata` (e.g. `secret`, `protocols`, etc) that provide further details on how to speak with the service.

### Providers

Providers are the physical endpoints that implement services. A provider may represent, say, a Kubernetes service addressed by DNS, or something more complicated like a canary deployment between two other Providers.

- A provider has a `name` which must be unique amongst all providers.
- A provider has a `type` (ex. `DNS`, `canary`, etc) that describes how to locate the physical provider within the cluster.
- A provider has environment-dependent additional `metadata`

### Environments

Environments describe complete collections of services, providers, and the links between them. Given a full description of an environment, any node in the cluster should know how to talk to any service through an appropriate provider, using only the data in the environment.

- An environment has a `name` unique among environments
- An environment has additional `metadata`
- An environment has a list of available Services, along with a hash of environment-specific metadata for each one.
- An environment has a list of available Providers, along with a hash of environment-specific metadata for each one.
- An environment has a many-to-one map from Services to Providers, returning exactly one Provider for each available Service.

## Domains and Change Listening

The `Dataource`, along with the `Services`, `Providers`, and `Environments` are grouped under a single root `ReflectionDomain`.

Changes to resources inside the domain are aggregated at the `Environment` level, and can be listened for by implementing a `ReflectionListener` and handing it to `environment.listen`.
