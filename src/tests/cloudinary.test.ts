import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, imageFileProblem, optimizedUrl } from "../utils/cloudinary";

describe("optimizedUrl", () => {
  const url = "https://res.cloudinary.com/demo/image/upload/v1731600000/drdread/site/abc.jpg";
  it("asks Cloudinary for an auto-format, auto-quality copy capped at the given width", () => {
    expect(optimizedUrl(url, 1920)).toBe("https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_1920/v1731600000/drdread/site/abc.jpg");
  });
  it("leaves bundled images, other hosts and already-transformed URLs alone", () => {
    expect(optimizedUrl("/images/hero.svg", 1920)).toBe("/images/hero.svg");
    expect(optimizedUrl("https://example.com/a.jpg", 800)).toBe("https://example.com/a.jpg");
    const done = "https://res.cloudinary.com/demo/image/upload/w_300/v1/x.jpg";
    expect(optimizedUrl(done, 800)).toBe(done);
  });
});

describe("imageFileProblem", () => {
  it("accepts JPG, PNG and WebP within 10 MB", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) expect(imageFileProblem({ type, size: 1000 })).toBeNull();
    expect(imageFileProblem({ type: "image/jpeg", size: MAX_IMAGE_BYTES })).toBeNull();
  });
  it("rejects other types, empty files and oversized files", () => {
    expect(imageFileProblem({ type: "image/gif", size: 1000 })).toMatch(/JPG, PNG or WebP/);
    expect(imageFileProblem({ type: "application/pdf", size: 1000 })).not.toBeNull();
    expect(imageFileProblem({ type: "image/png", size: 0 })).toMatch(/empty/);
    expect(imageFileProblem({ type: "image/png", size: MAX_IMAGE_BYTES + 1 })).toMatch(/10 MB/);
  });
});
