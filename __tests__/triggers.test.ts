import { describe, it, expect } from "vitest";
import {
  validateNsid,
  validateJobType,
  relToDotted,
  deriveJobTrigger,
  deriveLabelerTrigger,
  deriveScriptTrigger,
  triggerCategory,
} from "../src/core/triggers";

describe("validateNsid", () => {
  it("accepts a valid nsid", () => {
    expect(() => validateNsid("games.g5.getGame")).not.toThrow();
  });
  it("rejects single-segment and bad chars", () => {
    expect(() => validateNsid("foo")).toThrow();
    expect(() => validateNsid("com.foo!bar")).toThrow();
    expect(() => validateNsid("com.1foo")).toThrow();
  });
  it("accepts digit-leading authority segments", () => {
    expect(() => validateNsid("pics.2bit.feed.getPhotos")).not.toThrow();
  });
  it("still rejects a digit-leading TLD", () => {
    expect(() => validateNsid("2bit.pics.photo")).toThrow();
  });
  it("threads through trigger derivation", () => {
    expect(deriveScriptTrigger("query", "pics.2bit.feed.getPhotos")).toBe(
      "xrpc.query:pics.2bit.feed.getPhotos",
    );
  });
});

describe("validateJobType", () => {
  it("accepts dotted lowercase types", () => {
    expect(() => validateJobType("migration.claim")).not.toThrow();
  });
  it("rejects uppercase, spaces, empty", () => {
    expect(() => validateJobType("UPPER")).toThrow();
    expect(() => validateJobType("has space")).toThrow();
    expect(() => validateJobType("")).toThrow();
  });
  it("rejects the reserved happyview. prefix", () => {
    expect(() => validateJobType("happyview.delete-collection")).toThrow(
      /reserved/,
    );
    expect(() => validateJobType("happyview.not-a-real-job")).toThrow(
      /reserved/,
    );
  });
  it("still accepts ordinary job types", () => {
    expect(() => validateJobType("export")).not.toThrow();
    expect(() => validateJobType("my-org.export")).not.toThrow();
  });
});

describe("relToDotted", () => {
  it("drops .lua and joins path segments with dots", () => {
    expect(relToDotted("export/users.lua")).toBe("export.users");
    expect(relToDotted("migration.claim.lua")).toBe("migration.claim");
  });
});

describe("deriveJobTrigger", () => {
  it("maps a job path to job.run:<type>", () => {
    expect(deriveJobTrigger("export/users.lua")).toBe("job.run:export.users");
  });
});

describe("deriveLabelerTrigger", () => {
  it("maps an nsid path", () => {
    expect(deriveLabelerTrigger("app.bsky.feed.post.lua")).toBe(
      "labeler.apply:app.bsky.feed.post",
    );
  });
  it("maps the reserved _actor file", () => {
    expect(deriveLabelerTrigger("_actor.lua")).toBe("labeler.apply:_actor");
  });
});

describe("deriveScriptTrigger", () => {
  it("maps by lexicon main type", () => {
    expect(deriveScriptTrigger("query", "games.g5.getGame")).toBe(
      "xrpc.query:games.g5.getGame",
    );
    expect(deriveScriptTrigger("procedure", "games.g5.putGame")).toBe(
      "xrpc.procedure:games.g5.putGame",
    );
    expect(deriveScriptTrigger("record", "games.g5.game")).toBe(
      "record.index:games.g5.game",
    );
  });
  it("throws for an unmappable type", () => {
    expect(() => deriveScriptTrigger("token", "games.g5.thing")).toThrow();
  });
});

describe("triggerCategory", () => {
  it("classifies triggers", () => {
    expect(triggerCategory("xrpc.query:x.y.z")).toBe("script");
    expect(triggerCategory("record.index:x.y.z")).toBe("script");
    expect(triggerCategory("job.run:foo")).toBe("job");
    expect(triggerCategory("labeler.apply:_actor")).toBe("labeler");
  });
});
