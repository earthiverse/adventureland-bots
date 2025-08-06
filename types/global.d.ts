// TODO: Can be removed once we can set ES2026 in tsconfig
interface Set<T> {
  difference(other: Set<T>): Set<T>; // Available in ES2026 & Node 22
  intersection(other: Set<T>): Set<T>; // Available in ES2026 & Node 22
}
