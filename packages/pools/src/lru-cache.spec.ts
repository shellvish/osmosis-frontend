import { SimpleLRUCache, SimpleLRUCacheNode } from "./lru-cache";

const assertLinkedNodes = (
  nodes: ReadonlyArray<Readonly<SimpleLRUCacheNode>>
) => {
  if (nodes.length === 0) {
    throw new Error("Empty nodes");
  }

  if (nodes.length === 1) {
    expect(nodes[0].prev).toBe(undefined);
    expect(nodes[0].next).toBe(undefined);
  }

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const prevNode = i >= 1 ? nodes[i - 1] : undefined;
    const nextNode = i < nodes.length - 1 ? nodes[i + 1] : undefined;

    expect(node.prev).toStrictEqual(prevNode);
    expect(node.next).toStrictEqual(nextNode);
  }
};

describe("Test simple lru cache", () => {
  it("test creation of lru cache", () => {
    // Can't create with negative or equal to 0 max size.
    expect(() => {
      new SimpleLRUCache(0);
    }).toThrow();
    expect(() => {
      new SimpleLRUCache(-1);
    }).toThrow();

    for (let i = 1; i < 4; i++) {
      expect(() => {
        new SimpleLRUCache(i);
      }).not.toThrow();
    }
  });

  it("test simple lru cache with 1 max size", () => {
    const cache = new SimpleLRUCache(1);

    // Any values not added yet
    expect(cache.size).toBe(0);
    expect(cache.get("test")).toBe(undefined);
    expect(cache.peek("test")).toBe(undefined);
    expect(cache.peekAll().length).toBe(0);

    // Add value
    cache.set("test", "test");
    // Only "test" exists
    expect(cache.size).toBe(1);
    expect(cache.get("test")).toBe("test");
    expect(cache.get("test1")).toBe(undefined);
    expect(cache.peek("test")?.value).toBe("test");
    expect(cache.peek("test1")).toBe(undefined);

    // Currently, only 1 node exists
    let nodes = cache.peekAll();
    expect(nodes.length).toBe(1);
    expect(nodes[0]).toStrictEqual({
      prev: undefined,
      next: undefined,
      key: "test",
      value: "test",
    });

    // And replace existing value
    cache.set("test", "test-test");
    expect(cache.get("test")).toBe("test-test");
    expect(cache.peek("test")?.value).toBe("test-test");
    nodes = cache.peekAll();
    expect(nodes.length).toBe(1);
    expect(nodes[0]).toStrictEqual({
      prev: undefined,
      next: undefined,
      key: "test",
      value: "test-test",
    });

    // Add new value
    cache.set("test1", "test1");
    // It makes old value ("test") removed
    expect(cache.size).toBe(1);
    expect(cache.get("test")).toBe(undefined);
    expect(cache.get("test1")).toBe("test1");
    expect(cache.peek("test")?.value).toBe(undefined);
    expect(cache.peek("test1")?.value).toBe("test1");

    // Currently, only 1 node exists
    nodes = cache.peekAll();
    expect(nodes.length).toBe(1);
    expect(nodes[0]).toStrictEqual({
      prev: undefined,
      next: undefined,
      key: "test1",
      value: "test1",
    });
  });

  it("test simple lru cache with 2 max size", () => {
    const cache = new SimpleLRUCache(2);

    // Any values not added yet
    expect(cache.size).toBe(0);
    expect(cache.get("test")).toBe(undefined);
    expect(cache.peek("test")).toBe(undefined);
    expect(cache.peekAll().length).toBe(0);

    // Add value
    cache.set("test", "test");
    // Only "test" exists
    expect(cache.size).toBe(1);
    expect(cache.get("test")).toBe("test");
    expect(cache.get("test1")).toBe(undefined);
    expect(cache.peek("test")?.value).toBe("test");
    expect(cache.peek("test1")).toBe(undefined);

    // Currently, only 1 node exists
    let nodes = cache.peekAll();
    expect(nodes.length).toBe(1);
    expect(nodes[0]).toStrictEqual({
      prev: undefined,
      next: undefined,
      key: "test",
      value: "test",
    });

    // And replace existing value
    cache.set("test", "test-test");
    expect(cache.get("test")).toBe("test-test");
    expect(cache.peek("test")?.value).toBe("test-test");
    nodes = cache.peekAll();
    expect(nodes.length).toBe(1);
    expect(nodes[0]).toStrictEqual({
      prev: undefined,
      next: undefined,
      key: "test",
      value: "test-test",
    });

    // Recover existing value
    cache.set("test", "test");

    // Add value
    cache.set("test1", "test1");
    // Only "test", "test1" exist
    expect(cache.size).toBe(2);
    expect(cache.get("test")).toBe("test");
    expect(cache.get("test1")).toBe("test1");
    expect(cache.peek("test")?.value).toBe("test");
    expect(cache.peek("test1")?.value).toBe("test1");

    // Currently, only 2 nodes exist
    nodes = cache.peekAll();
    expect(nodes.length).toBe(2);
    assertLinkedNodes(nodes);
    // "test1" is used lastly, so "test1" should be head
    expect(nodes[0].key).toBe("test");
    expect(nodes[0].value).toBe("test");
    expect(nodes[1].key).toBe("test1");
    expect(nodes[1].value).toBe("test1");

    // Try to set "test" to head by getting "test" again
    expect(cache.get("test")).toBe("test");

    // Test that "test" node moved to head
    nodes = cache.peekAll();
    expect(nodes.length).toBe(2);
    assertLinkedNodes(nodes);
    // "test" is used lastly, so "test" should be head
    expect(nodes[0].key).toBe("test1");
    expect(nodes[0].value).toBe("test1");
    expect(nodes[1].key).toBe("test");
    expect(nodes[1].value).toBe("test");

    // Now, add "test2" and it makes "test1" removed.
    cache.set("test2", "test2");

    // "test1" should be removed and "test2" should be added.
    expect(cache.size).toBe(2);
    expect(cache.get("test")).toBe("test");
    expect(cache.get("test1")).toBe(undefined);
    expect(cache.get("test2")).toBe("test2");
    expect(cache.peek("test")?.value).toBe("test");
    expect(cache.peek("test1")?.value).toBe(undefined);
    expect(cache.peek("test2")?.value).toBe("test2");

    nodes = cache.peekAll();
    expect(nodes.length).toBe(2);
    assertLinkedNodes(nodes);
    // "test2" is used lastly, so "test2" should be head
    expect(nodes[0].key).toBe("test");
    expect(nodes[0].value).toBe("test");
    expect(nodes[1].key).toBe("test2");
    expect(nodes[1].value).toBe("test2");

    // Try to change "test" and it make "test" head
    cache.set("test", "test-test");

    expect(cache.size).toBe(2);
    expect(cache.get("test")).toBe("test-test");
    expect(cache.get("test2")).toBe("test2");
    expect(cache.peek("test")?.value).toBe("test-test");
    expect(cache.peek("test2")?.value).toBe("test2");

    nodes = cache.peekAll();
    expect(nodes.length).toBe(2);
    assertLinkedNodes(nodes);
    // "test2" is used lastly, so "test2" should be head
    expect(nodes[0].key).toBe("test");
    expect(nodes[0].value).toBe("test-test");
    expect(nodes[1].key).toBe("test2");
    expect(nodes[1].value).toBe("test2");
  });

  it("test simple lru cache with 3 max size", () => {
    const cache = new SimpleLRUCache(3);
    expect(cache.size).toBe(0);

    // Add 3 values
    cache.set("test", "test");
    cache.set("test1", "test1");
    cache.set("test2", "test2");

    expect(cache.size).toBe(3);
    expect(cache.get("test")).toBe("test");
    expect(cache.peek("test")?.value).toBe("test");
    expect(cache.get("test1")).toBe("test1");
    expect(cache.peek("test1")?.value).toBe("test1");
    expect(cache.get("test2")).toBe("test2");
    expect(cache.peek("test2")?.value).toBe("test2");

    let nodes = cache.peekAll();
    expect(nodes.length).toBe(3);
    assertLinkedNodes(nodes);
    expect(nodes[0].key).toBe("test");
    expect(nodes[0].value).toBe("test");
    expect(nodes[1].key).toBe("test1");
    expect(nodes[1].value).toBe("test1");
    expect(nodes[2].key).toBe("test2");
    expect(nodes[2].value).toBe("test2");

    // Make the middle value be head
    cache.get("test1");

    expect(cache.size).toBe(3);
    expect(cache.peek("test")?.value).toBe("test");
    expect(cache.peek("test1")?.value).toBe("test1");
    expect(cache.peek("test2")?.value).toBe("test2");

    nodes = cache.peekAll();
    expect(nodes.length).toBe(3);
    assertLinkedNodes(nodes);
    expect(nodes[0].key).toBe("test");
    expect(nodes[0].value).toBe("test");
    expect(nodes[1].key).toBe("test2");
    expect(nodes[1].value).toBe("test2");
    expect(nodes[2].key).toBe("test1");
    expect(nodes[2].value).toBe("test1");

    // Reset order
    cache.get("test");
    cache.get("test1");
    cache.get("test2");

    // Add new value
    cache.set("test3", "test3");

    // Now, "test" should be removed
    expect(cache.size).toBe(3);
    expect(cache.peek("test")?.value).toBe(undefined);
    expect(cache.peek("test1")?.value).toBe("test1");
    expect(cache.peek("test2")?.value).toBe("test2");
    expect(cache.peek("test3")?.value).toBe("test3");

    nodes = cache.peekAll();
    expect(nodes.length).toBe(3);
    assertLinkedNodes(nodes);
    expect(nodes[0].key).toBe("test1");
    expect(nodes[0].value).toBe("test1");
    expect(nodes[1].key).toBe("test2");
    expect(nodes[1].value).toBe("test2");
    expect(nodes[2].key).toBe("test3");
    expect(nodes[2].value).toBe("test3");

    // Try to replace existing value
    cache.set("test1", "test1-test");

    expect(cache.size).toBe(3);
    expect(cache.peek("test")?.value).toBe(undefined);
    expect(cache.peek("test1")?.value).toBe("test1-test");
    expect(cache.peek("test2")?.value).toBe("test2");
    expect(cache.peek("test3")?.value).toBe("test3");

    nodes = cache.peekAll();
    expect(nodes.length).toBe(3);
    assertLinkedNodes(nodes);
    expect(nodes[0].key).toBe("test2");
    expect(nodes[0].value).toBe("test2");
    expect(nodes[1].key).toBe("test3");
    expect(nodes[1].value).toBe("test3");
    expect(nodes[2].key).toBe("test1");
    expect(nodes[2].value).toBe("test1-test");
  });

  it("test cache clear", () => {
    const cache = new SimpleLRUCache(5);

    for (let i = 0; i < 10; i++) {
      cache.set(i.toString(), i);
    }

    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.get("9")).toBe(undefined);
    expect(cache.peek("9")).toBe(undefined);
    expect(cache.peekAll().length).toBe(0);
  });
});
