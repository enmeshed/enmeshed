# @enmeshed/mesh-reflection

Allows members of a service mesh to obtain information about the available services in the mesh.

## Architecture

### Domain

All activity takes place in a `ReflectionDomain`, which is a root-level container for all of the below-mentioned resources.

#### API
```js
import { ReflectionDomain } from '@enmeshed/mesh-reflection'
```

```js
new ReflectionDomain(dataSource: DataSource)
```
Construct a new `ReflectionDomain` whose contents are provided by the given source.

```js
environment: Environment = domain.getEnvironment(name: string)
```
Retrieves a named `Environment` contained within the domain.

### DataSource

The domain has exactly one `DataSource`. A `DataSource` collects data from the cluster and prepares a collection of `Resource`s that are available for consumers to inspect. The `DataSource` writes these resources into a local, non-persistent store contained within the domain. **Only the `DataSource` is allowed to mutate the store**, so a correctly implemented `DataSource` can guarantee consumers have a consistent view of the resources in the mesh.

### Environment

Each domain has zero or more `Environment`s identified by string names unique within the domain. An `Environment` is in turn a container for `Resource`s which can be configured differently for each `Environment`. (Examples of `Environment`s might be `staging` and `live`, where services would be configured differently for each.)

The `Environment` also contains a map associating each `Service` with zero or one `Provider`s. This allows consumers to locate and connect to services on the mesh.

Consumers may enumerate and query resources, as well as listen for changes with node `EventEmitter` api. Further details below.

### Resource

`Resource`s come in two kinds, `Service`s and `Provider`s. Resources are identified by a string name which must be unique across the domain among resources of the same kind. Each `Resource` carries with it an arbitrary JSON metadata payload.

This library is unopinionated about the contents of the payload, but typically a `Service` would contain information about how it is expected to communicate with that service (for example, a service might idenitfy itself as gRPC and provide a list of acceptable protocol buffers) and a `Provider` would contain information about where to find that service (e.g. a cluster DNS address of the gRPC server)
