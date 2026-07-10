import { afterEach, describe, expect, it } from "vitest";
import { getChartColor, getChartPalette, CHART_FALLBACKS } from "../design-helpers";

describe("getChartColor (UI-1)", () => {
  afterEach(() => {
    for (let i = 1; i <= 5; i++) {
      document.documentElement.style.removeProperty(`--chart-${i}`);
    }
  });

  it("le a CSS var --chart-* e retorna hsl()", () => {
    document.documentElement.style.setProperty("--chart-1", "10 20% 30%");
    expect(getChartColor(0)).toBe("hsl(10 20% 30%)");
  });

  it("reflete o tema: trocar a var muda a cor (light/dark)", () => {
    document.documentElement.style.setProperty("--chart-2", "200 50% 40%");
    expect(getChartColor(1)).toBe("hsl(200 50% 40%)");
    document.documentElement.style.setProperty("--chart-2", "200 50% 70%");
    expect(getChartColor(1)).toBe("hsl(200 50% 70%)");
  });

  it("faz wrap em 5 slots", () => {
    document.documentElement.style.setProperty("--chart-1", "1 1% 1%");
    expect(getChartColor(5)).toBe(getChartColor(0));
    expect(getChartColor(-1)).toBe(getChartColor(4));
  });

  it("usa fallback concreto quando a var nao esta definida", () => {
    // Sem setProperty, jsdom nao tem as vars do index.css.
    expect(getChartColor(0)).toBe(CHART_FALLBACKS[0]);
  });

  it("getChartPalette retorna N cores", () => {
    expect(getChartPalette(3)).toHaveLength(3);
    expect(getChartPalette()).toHaveLength(CHART_FALLBACKS.length);
  });
});
