import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parse, type DefaultTreeAdapterMap } from "parse5";
import { describe, expect, it } from "vitest";
import { gitOrigin, resolveDeployment } from "../scripts/pages-base";

type HtmlNode = DefaultTreeAdapterMap["node"];
type HtmlElement = DefaultTreeAdapterMap["element"];
interface ApiNode {
  id: string;
  type: string;
  related?: string[];
  meta?: Record<string, unknown>;
}
interface PreparationStep { minutes: number; href?: string; }
interface TeachingRhythm {
  seminarDay: string;
  startTime: string;
  endTime: string;
  location: string;
  timeZone: string;
  timeZoneLabel: string;
  followUpMinutes: number;
}

const api = JSON.parse(readFileSync(resolve("dist/api/index.json"), "utf8")) as { nodes: ApiNode[] };
const sessions = api.nodes.filter((node) => node.type === "sessions")
  .sort((left, right) => Number(left.meta?.week) - Number(right.meta?.week));
const planner = parse(readFileSync(resolve("dist/sessions/index.html"), "utf8"));
const deployment = resolveDeployment(process.env, gitOrigin);
const siteUrl = new URL(`${deployment.base.replace(/\/$/, "")}/`, deployment.site ?? "http://localhost");
const plannerUrl = new URL("sessions/", siteUrl);
const attribute = (node: HtmlElement, name: string) => node.attrs.find((item) => item.name === name)?.value;
const inert = (node: HtmlNode) => "tagName" in node && (
  ["script", "style", "template"].includes(node.tagName)
  || attribute(node, "hidden") !== undefined || attribute(node, "aria-hidden") === "true"
);

function* elements(node: HtmlNode): Generator<HtmlElement> {
  if (inert(node)) return;
  if ("tagName" in node) yield node;
  if ("childNodes" in node) for (const child of node.childNodes) yield* elements(child);
}

function textContent(node: HtmlNode): string {
  if (inert(node)) return "";
  if (node.nodeName === "#text" && "value" in node) return node.value;
  return "childNodes" in node ? node.childNodes.map(textContent).join(" ") : "";
}

const plans = [...elements(planner)].filter((node) => attribute(node, "data-week-plan") !== undefined);
const planFor = (week: number) => {
  const matches = plans.filter((node) => Number(attribute(node, "data-week")) === week);
  expect(matches, `Week ${week} needs one built weekly-plan group`).toHaveLength(1);
  return matches[0];
};
const preparationFor = (session: ApiNode): PreparationStep[] => {
  const steps = session.meta?.preparationSteps;
  expect(Array.isArray(steps), `${session.id}: built API is missing ordered preparationSteps`).toBe(true);
  expect((steps as unknown[]).length, `${session.id}: preparationSteps is empty`).toBeGreaterThan(0);
  return steps as PreparationStep[];
};
const renderedPreparationLinks = (plan: HtmlElement): string[] => {
  const regions = [...elements(plan)].filter((node) => attribute(node, "data-preparation-steps") !== undefined);
  expect(regions, `Week ${attribute(plan, "data-week")}: expose the ordered preparation region`).toHaveLength(1);
  return [...elements(regions[0])].filter((node) => node.tagName === "a" && attribute(node, "href") !== undefined)
    .map((node) => new URL(attribute(node, "href")!, plannerUrl).href);
};
const assignedUrl = (href: string): URL => {
  const base = siteUrl.pathname.replace(/\/$/, "");
  const path = href.startsWith("/") && !href.startsWith("//") && href !== base && !href.startsWith(`${base}/`)
    ? `${base}${href}` : href;
  return new URL(path, plannerUrl);
};
const factsText = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}:]+/gu, " ").trim();
const clockMinutes = (value: string) => {
  const match = value.match(/^(\d{2}):([0-5]\d)$/);
  expect(match, `Invalid meeting clock time: ${value}`).not.toBeNull();
  expect(Number(match![1])).toBeLessThan(24);
  return Number(match![1]) * 60 + Number(match![2]);
};

// Compare times, not a particular dash, spacing, or 12-/24-hour presentation.
function clocksIn(text: string): number[] {
  return [...text.matchAll(/\b(\d{1,2})(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)?\b/gi)]
    .filter((match) => match[2] !== undefined || match[3] !== undefined)
    .map((match) => {
      const hour = Number(match[1]);
      const period = match[3]?.replace(/\./g, "").toLowerCase();
      return (period ? hour % 12 + (period === "pm" ? 12 : 0) : hour) * 60 + Number(match[2] ?? 0);
    });
}
function durationsIn(text: string): number[] {
  return [...text.matchAll(/\b(\d+(?:\.\d+)?)\s*[-–—]?\s*(minutes?|mins?|hours?|hrs?)\b/gi)]
    .map((match) => Number(match[1]) * (/^h/i.test(match[2]) ? 60 : 1));
}
const rhythmPath = resolve("src/data/teaching-rhythm.ts");
async function readRhythm(): Promise<TeachingRhythm> {
  expect(existsSync(rhythmPath), "The shared teaching-rhythm module is missing").toBe(true);
  // Resolve at test time so missing new source produces the assertion above,
  // rather than preventing this built-output regression suite from collecting.
  const module = await import(/* @vite-ignore */ pathToFileURL(rhythmPath).href);
  expect(module.teachingRhythm, "Export teachingRhythm from the shared timetable").toBeDefined();
  return module.teachingRhythm as TeachingRhythm;
}
function expectMeeting(text: string, rhythm: TeachingRhythm, context: string): void {
  const facts = factsText(text);
  expect(facts, `${context}: meeting day`).toContain(factsText(rhythm.seminarDay));
  expect(facts, `${context}: meeting location`).toContain(factsText(rhythm.location));
  expect(facts, `${context}: local time zone`).toContain(factsText(rhythm.timeZoneLabel));
  expect(clocksIn(text), `${context}: meeting starts`).toContain(clockMinutes(rhythm.startTime));
  expect(clocksIn(text), `${context}: meeting ends`).toContain(clockMinutes(rhythm.endTime));
}

describe("weekly study navigation", () => {
  it("groups all twelve weeks and presents their assigned preparation links in order", () => {
    expect(plans.map((plan) => Number(attribute(plan, "data-week"))).sort((a, b) => a - b),
      "The built weekly planner must expose all twelve dated week groups")
      .toEqual(Array.from({ length: 12 }, (_, index) => index + 1));
    for (const session of sessions) {
      const expected = preparationFor(session).filter((step) => step.href !== undefined).map((step) => {
        expect(typeof step.href, `${session.id}: an assigned route must be a string`).toBe("string");
        return assignedUrl(step.href!).href;
      });
      // Restrict to preparation: duplicate links in later resource/assessment
      // sections must not accidentally repair a missing or reversed reading.
      expect(renderedPreparationLinks(planFor(Number(session.meta?.week))), `${session.id}: preparation route order`)
        .toEqual(expected);
    }
  });

  it("keeps each preparation allowance equal to its authored steps", () => {
    for (const session of sessions) {
      const steps = preparationFor(session);
      for (const [index, step] of steps.entries()) {
        expect(typeof step.minutes, `${session.id}: step ${index + 1} needs minutes`).toBe("number");
        expect(Number.isFinite(step.minutes), `${session.id}: step ${index + 1} minutes`).toBe(true);
        expect(step.minutes, `${session.id}: step ${index + 1} minutes`).toBeGreaterThan(0);
      }
      const total = steps.reduce((sum, step) => sum + step.minutes, 0);
      expect(total, `${session.id}: step minutes must match the advertised preparation budget`)
        .toBe(session.meta?.preparationMinutes);
    }
  });

  it("keeps the Week 9 preparation route to the Week 2 lecture", () => {
    const week9 = sessions.find((node) => Number(node.meta?.week) === 9);
    const lecture2 = api.nodes.find((node) => node.type === "lectures" && Number(node.meta?.week) === 2);
    expect(week9, "Publish the Week 9 seminar").toBeDefined();
    expect(lecture2, "Publish the Week 2 notes that Week 9 reuses").toBeDefined();
    const target = assignedUrl(`/${lecture2!.id}/`);
    const assigned = preparationFor(week9!).flatMap((step) => step.href ? [assignedUrl(step.href).pathname] : []);
    expect(assigned, "Week 9 must retain its cross-week lecture assignment").toContain(target.pathname);
    expect(renderedPreparationLinks(planFor(9)).map((href) => new URL(href).pathname)).toContain(target.pathname);
  });

  it("keeps Week 2's declared seminar notes and slides separate from timed preparation", () => {
    const week2 = sessions.find((node) => Number(node.meta?.week) === 2);
    expect(week2, "Publish the Week 2 seminar").toBeDefined();
    const lecture = api.nodes.find((node) => node.type === "lectures"
      && Number(node.meta?.week) === 2 && week2!.related?.includes(node.id));
    expect(lecture, "Week 2 must declare its seminar lecture relation").toBeDefined();
    expect(typeof lecture!.meta?.slides, "The declared Week 2 lecture must identify its presentation").toBe("string");
    const route = (url: URL) => `${url.origin}${url.pathname.replace(/\/$/, "")}`;
    const seminarRoutes = [assignedUrl(`/${lecture!.id}/`), assignedUrl(String(lecture!.meta?.slides))].map(route);
    const group = planFor(2);
    const groupRoutes = [...elements(group)]
      .filter((node) => node.tagName === "a" && attribute(node, "href") !== undefined)
      .map((node) => route(new URL(attribute(node, "href")!, plannerUrl)));
    const timedRoutes = preparationFor(week2!).flatMap((step) => step.href ? [route(assignedUrl(step.href))] : []);
    const preparationRoutes = renderedPreparationLinks(group).map((href) => route(new URL(href)));
    for (const material of seminarRoutes) {
      expect(groupRoutes, `Week 2: expose seminar material ${material}`).toContain(material);
      expect(timedRoutes, `Week 2: seminar material is not an additional timed reading`).not.toContain(material);
      expect(preparationRoutes, `Week 2: show seminar material outside the ordered preparation`).not.toContain(material);
    }
  });

  it("keeps the Monday dates, seminar duration and published policy consistent with the timetable", async () => {
    const rhythm = await readRhythm();
    expect(rhythm.seminarDay).toBe("Monday");
    const duration = clockMinutes(rhythm.endTime) - clockMinutes(rhythm.startTime);
    expect(duration).toBeGreaterThan(0);
    const weekday = new Intl.DateTimeFormat("en-AU", { weekday: "long", timeZone: rhythm.timeZone });
    for (const session of sessions) {
      expect(weekday.format(new Date(String(session.meta?.date))), `${session.id}: meeting day`).toBe(rhythm.seminarDay);
      expect(session.meta?.durationMinutes, `${session.id}: seminar duration`).toBe(duration);
    }
    const policyPage = parse(readFileSync(resolve("dist/policies/index.html"), "utf8"));
    const policyMain = [...elements(policyPage)].find((node) => node.tagName === "main");
    expect(policyMain, "The built policy must have readable main content").toBeDefined();
    const policyApi = JSON.parse(readFileSync(resolve("dist/api/policies/index.json"), "utf8")) as { body?: unknown };
    expect(typeof policyApi.body, "Keep the policy's readable body in the generated API").toBe("string");
    for (const [label, text] of [["policy HTML", textContent(policyMain!)], ["policy API", String(policyApi.body)]]) {
      expectMeeting(text, rhythm, label);
      expect(durationsIn(text), `${label}: seminar duration`).toContain(duration);
      expect(durationsIn(text), `${label}: follow-up allowance`).toContain(rhythm.followUpMinutes);
    }
  });

  it("publishes the same meeting time and place beside every week", async () => {
    const rhythm = await readRhythm();
    for (const session of sessions) {
      expectMeeting(textContent(planFor(Number(session.meta?.week))), rhythm, session.id);
    }
  });
});
