export interface SimpleLRUCacheNode {
  prev: SimpleLRUCacheNode | undefined;
  next: SimpleLRUCacheNode | undefined;
  key: string;
  value: any;
}

export class SimpleLRUCache {
  protected map: Map<string, SimpleLRUCacheNode> = new Map();

  protected head: SimpleLRUCacheNode | undefined;
  protected tail: SimpleLRUCacheNode | undefined;

  protected _size: number = 0;

  constructor(public readonly maxSize: number) {
    if (maxSize <= 0) {
      throw new Error("Max size should be greater than 0");
    }
  }

  get size(): number {
    return this._size;
  }

  clear(): void {
    this.map = new Map();
    this.head = undefined;
    this.tail = undefined;
    this._size = 0;
  }

  set(key: string, value: any): void {
    let node = this.map.get(key);
    if (!node) {
      // If we need to add node, but it exceeds max size,
      // remove the least recently used one.
      if (this._size === this.maxSize) {
        if (this.tail) {
          this.map.delete(this.tail.key);
          if (this.tail === this.head) {
            this.head = undefined;
          }
          if (this.tail.next) {
            this.tail.next.prev = undefined;
          }
          this.tail = this.tail.next;
        }
        this._size--;
      }

      node = {
        prev: undefined,
        next: undefined,
        key,
        value,
      };

      if (!this.tail) {
        // It means that value is added initially.
        this.tail = node;
      }

      if (this.head) {
        this.head.next = node;
        node.prev = this.head;
      }

      this.head = node;

      this.map.set(key, node);

      this._size++;
    } else {
      this.moveNodeToHead(node);

      node.value = value;

      this.map.set(key, node);
    }
  }

  get(key: string): any {
    const node = this.map.get(key);
    if (node) {
      this.moveNodeToHead(node);

      return node.value;
    }
    return undefined;
  }

  protected moveNodeToHead(node: SimpleLRUCacheNode): void {
    if (this.head === node) {
      // Node is already head. Do nothing.
      return;
    }
    if (this.tail === this.head) {
      // If tail and head is same, it is the case that only one node exists,
      // there is nothing to do.
      return;
    }

    if (this.tail === node) {
      this.tail = node.next;
    }

    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }

    if (this.head) {
      this.head.next = node;
    }
    node.prev = this.head;
    node.next = undefined;
    this.head = node;
  }

  /**
   * Returns native `SimpleLRUCacheNode` without counting usage.
   * Mainly used for testing/debugging.
   * Not recommended to use for other purpose.
   * @param key
   */
  peek(key: string): Readonly<SimpleLRUCacheNode> | undefined {
    return this.map.get(key);
  }

  /**
   * Returns all native `SimpleLRUCacheNode` without counting usage in order from tail.
   * Mainly used for testing/debugging.
   * Not recommended to use for other purpose.
   *
   * NOTE: This is not intended for production use, thus contains some code for testing purposes.
   */
  peekAll(): ReadonlyArray<Readonly<SimpleLRUCacheNode>> {
    let current = this.tail;
    const nodes: Readonly<SimpleLRUCacheNode>[] = [];

    while (current) {
      if (current.prev && current.prev.next !== current) {
        throw new Error("Node not connected each other");
      }

      nodes.push(current);
      current = current.next;
    }

    if (nodes.length > 0 && nodes[nodes.length - 1] !== this.head) {
      throw new Error("Most recent node is different from head");
    }

    return nodes;
  }
}
