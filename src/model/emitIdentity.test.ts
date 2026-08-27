import { describe, expect, it } from "vitest";
import {
  EMIT_TRACE_KEY,
  attachEmitTrace,
  buildEmitTrace,
} from "./emitIdentity";

describe("emitIdentity", () => {
  it("buildEmitTrace stamps version and instance", () => {
    const t = buildEmitTrace({
      installId: "11111111-2222-4333-8444-555555555555",
      projectId: "p1",
    });
    expect(t.instanceId).toBe("11111111-2222-4333-8444-555555555555");
    expect(t.projectId).toBe("p1");
    expect(t.version.length).toBeGreaterThan(0);
  });

  it("attachEmitTrace clones under reserved key", () => {
    const stamped = attachEmitTrace(
      { name: "Doc", pages: [] },
      { installId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", projectId: "cat-1" },
    );
    expect(stamped.name).toBe("Doc");
    expect(stamped[EMIT_TRACE_KEY].instanceId).toBe(
      "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    );
    expect(stamped[EMIT_TRACE_KEY].projectId).toBe("cat-1");
  });
});
