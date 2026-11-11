import { describe, expect, it } from "vitest";
import { evidencePath, validateEvidence } from "@/lib/evidence";

const photo = (size = 1000, type = "image/jpeg", name = "a.jpg") => ({ name, size, type });

describe("complaint evidence photos", () => {
  it("allows up to 5 photos", () => {
    expect(validateEvidence(Array.from({ length: 5 }, () => photo()))).toBeNull();
  });
  it("rejects a 6th photo", () => {
    expect(validateEvidence(Array.from({ length: 6 }, () => photo()))).toMatch(/up to 5/);
  });
  it("rejects photos over 10 MB", () => {
    expect(validateEvidence([photo(10 * 1024 * 1024 + 1)])).toMatch(/10 MB/);
  });
  it("rejects files that are not images", () => {
    expect(validateEvidence([photo(100, "application/pdf", "x.pdf")])).toMatch(/not a photo/);
  });
  it("stores photos in the vendor's own folder", () => {
    expect(evidencePath("user-1", "IMG.JPG", "abc")).toBe("user-1/abc.jpg");
  });
});
