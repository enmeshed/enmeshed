
# Design Notes

- A Resource is any JavaScript object with a `DependencyNode`
- `isResource()` API checks this condition.

## Dependency Nodes
`DependencyNode`s are tags applied to Resources, stored symbolically at `resource[dependencyNode$]`. The DependencyNode is the primary interface handle between Alpha and resource objects, which are otherwise kept at arms length.

- `DependencyNode.of(resource)` returns the DependencyNode of a Resource.

#### Reference Counting
Dependency nodes track the usage of their associated Resource using a reference count. When the reference count reaches 1, the resource is initialized. When the reference count reaches 0, the resource is automatically destroyed.

- `node.isReferenced()` is `true` iff the node's reference count is positive.
- `node.ref()` increases the reference count of the node
- `node.deref()` decreases the reference count, destroying the resource if the reference count is zero. Any exceptions involved in destroying the resource will be rethrown.
- `node.safeDeref()` is as `deref()` but swallows any exceptions.

#### Teardown Hooks
`DependencyNode`s can invoke callbacks when their associated resource is destroyed.

#### Invalidation and Eviction
A resource may become invalid over the course of its lifecycle. In this case the resource cannot simply be destroyed in situ, as various caches may be referencing the resource.

The `node.invalidate()` API exists for this reason.

- `node.invalidate()` evicts the node from all caches that support eviction. The node will still not be destroyed until its reference count reaches 0.
- `node.addEvictionSite(site)` adds an object implementing the `EvictionSite` interface to the list of eviction sites
- `node.removeEvictionSite(site)` removes an object added with `addEvictionSite`
