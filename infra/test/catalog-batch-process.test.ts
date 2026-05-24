import { validateCreateProductPayload } from "../lib/lambda/handler";

describe("validateCreateProductPayload (catalog + HTTP payloads)", () => {
  it("accepts numeric strings from CSV-derived JSON bodies", () => {
    const res = validateCreateProductPayload({
      title: "Cake",
      description: "Nice",
      price: "12.50",
      count: "3",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toEqual({
        title: "Cake",
        description: "Nice",
        price: 12.5,
        count: 3,
      });
    }
  });

  it("defaults missing description to empty string", () => {
    const res = validateCreateProductPayload({
      title: "Cake",
      price: "1",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.description).toBe("");
      expect(res.data.count).toBe(0);
    }
  });

  it("rejects invalid price strings", () => {
    const res = validateCreateProductPayload({
      title: "Cake",
      description: "",
      price: "not-a-number",
      count: "0",
    });
    expect(res.ok).toBe(false);
  });

  it("rejects negative count strings", () => {
    const res = validateCreateProductPayload({
      title: "Cake",
      description: "",
      price: "10",
      count: "-1",
    });
    expect(res.ok).toBe(false);
  });
});
