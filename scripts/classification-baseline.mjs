import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { classifyActivity } from "../src/main/classification/activityClassifier.ts";

const PUBLIC_STATUSES = ["focus", "neutral", "distraction"];
const POLICY_ACTIONS = [
  "stay-quiet",
  "soft-check",
  "nudge",
  "block-intervention",
  "pause",
];

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const fixturePath = path.join(
  projectRoot,
  "tests",
  "classification",
  "fixtures.v1.json",
);
const policyFixturePath = path.join(
  projectRoot,
  "tests",
  "classification",
  "policy-fixtures.v1.json",
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assertString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function validateClassificationFixtures(dataset) {
  if (dataset.schemaVersion !== 1) {
    throw new Error("classification fixture schemaVersion must be 1");
  }
  if (!Array.isArray(dataset.cases) || dataset.cases.length === 0) {
    throw new Error("classification fixtures must contain at least one case");
  }

  const ids = new Set();
  for (const fixture of dataset.cases) {
    assertString(fixture.id, "fixture id");
    if (ids.has(fixture.id)) {
      throw new Error(`duplicate classification fixture id: ${fixture.id}`);
    }
    ids.add(fixture.id);
    assertString(fixture.sessionGoal, `${fixture.id}.sessionGoal`);
    assertString(fixture.activity?.appName, `${fixture.id}.activity.appName`);
    if (typeof fixture.activity?.bundleId !== "string") {
      throw new Error(`${fixture.id}.activity.bundleId must be a string`);
    }
    if (typeof fixture.activity?.windowTitle !== "string") {
      throw new Error(`${fixture.id}.activity.windowTitle must be a string`);
    }
    if (typeof fixture.activity?.tabTitle !== "string") {
      throw new Error(`${fixture.id}.activity.tabTitle must be a string`);
    }
    if (!PUBLIC_STATUSES.includes(fixture.expected?.status)) {
      throw new Error(`${fixture.id}.expected.status is invalid`);
    }
    assertString(
      fixture.expected?.reasonCode,
      `${fixture.id}.expected.reasonCode`,
    );
  }
}

function validatePolicyFixtures(dataset) {
  if (dataset.schemaVersion !== 1) {
    throw new Error("policy fixture schemaVersion must be 1");
  }
  if (!Array.isArray(dataset.cases) || dataset.cases.length === 0) {
    throw new Error("policy fixtures must contain at least one case");
  }

  const ids = new Set();
  for (const fixture of dataset.cases) {
    assertString(fixture.id, "policy fixture id");
    if (ids.has(fixture.id)) {
      throw new Error(`duplicate policy fixture id: ${fixture.id}`);
    }
    ids.add(fixture.id);
    if (!["focus", "neutral", "distraction", "inactive"].includes(fixture.status)) {
      throw new Error(`${fixture.id}.status is invalid`);
    }
    if (!["low", "medium", "high"].includes(fixture.confidence)) {
      throw new Error(`${fixture.id}.confidence is invalid`);
    }
    if (!Number.isFinite(fixture.presenceSec) || fixture.presenceSec < 0) {
      throw new Error(`${fixture.id}.presenceSec must be a positive number`);
    }
    if (!Number.isInteger(fixture.repeatVisits) || fixture.repeatVisits < 0) {
      throw new Error(`${fixture.id}.repeatVisits must be a positive integer`);
    }
    if (!["gentle", "balanced", "strict"].includes(fixture.sensitivity)) {
      throw new Error(`${fixture.id}.sensitivity is invalid`);
    }
    if (!POLICY_ACTIONS.includes(fixture.expectedAction)) {
      throw new Error(`${fixture.id}.expectedAction is invalid`);
    }
  }
}

function toPublicStatus(category) {
  if (category === "focus" || category === "supportive") return "focus";
  if (category === "distraction" || category === "hard-distraction") {
    return "distraction";
  }
  return "neutral";
}

function percent(numerator, denominator) {
  if (denominator === 0) return 0;
  return (numerator / denominator) * 100;
}

function formatPercent(value) {
  return `${value.toFixed(1)}%`;
}

function pad(value, width) {
  return String(value).padStart(width, " ");
}

function evaluate(dataset) {
  const matrix = Object.fromEntries(
    PUBLIC_STATUSES.map((expected) => [
      expected,
      Object.fromEntries(PUBLIC_STATUSES.map((actual) => [actual, 0])),
    ]),
  );

  const results = dataset.cases.map((fixture) => {
    const raw = classifyActivity({
      sessionGoal: fixture.sessionGoal,
      appName: fixture.activity.appName,
      bundleId: fixture.activity.bundleId,
      windowTitle: fixture.activity.windowTitle,
      tabTitle: fixture.activity.tabTitle,
      sessionCorrections: [],
    });
    const actualStatus = toPublicStatus(raw.category);
    const expectedStatus = fixture.expected.status;
    matrix[expectedStatus][actualStatus] += 1;
    return {
      id: fixture.id,
      contrastGroup: fixture.contrastGroup,
      expectedStatus,
      actualStatus,
      internalCategory: raw.category,
      confidence: raw.confidence,
      reason: raw.reason,
      passed: actualStatus === expectedStatus,
    };
  });

  return { matrix, results };
}

function printMatrix(matrix) {
  console.log("\nConfusion matrix (rows = expected, columns = predicted)");
  console.log("                 focus  neutral  distraction");
  for (const expected of PUBLIC_STATUSES) {
    console.log(
      `${expected.padEnd(14)} ${pad(matrix[expected].focus, 7)} ${pad(
        matrix[expected].neutral,
        8,
      )} ${pad(matrix[expected].distraction, 12)}`,
    );
  }
}

function printMetrics(matrix, results) {
  const passed = results.filter((result) => result.passed).length;
  const nonDistractionCases = results.filter(
    (result) => result.expectedStatus !== "distraction",
  );
  const falseDistractions = nonDistractionCases.filter(
    (result) => result.actualStatus === "distraction",
  );

  console.log("\nMetrics");
  console.log(
    `  Overall accuracy:       ${passed}/${results.length} (${formatPercent(
      percent(passed, results.length),
    )})`,
  );
  console.log(
    `  False-distraction rate: ${falseDistractions.length}/${nonDistractionCases.length} (${formatPercent(
      percent(falseDistractions.length, nonDistractionCases.length),
    )})`,
  );

  for (const status of PUBLIC_STATUSES) {
    const truePositive = matrix[status][status];
    const predicted = PUBLIC_STATUSES.reduce(
      (total, expected) => total + matrix[expected][status],
      0,
    );
    const expected = PUBLIC_STATUSES.reduce(
      (total, actual) => total + matrix[status][actual],
      0,
    );
    console.log(
      `  ${status.padEnd(11)} precision ${formatPercent(
        percent(truePositive, predicted),
      ).padStart(6)} | recall ${formatPercent(
        percent(truePositive, expected),
      ).padStart(6)}`,
    );
  }

  const grouped = new Map();
  for (const result of results) {
    if (!result.contrastGroup) continue;
    const group = grouped.get(result.contrastGroup) ?? [];
    group.push(result);
    grouped.set(result.contrastGroup, group);
  }
  const contrastGroups = [...grouped.values()];
  const passingContrastGroups = contrastGroups.filter((group) =>
    group.every((result) => result.passed),
  );
  console.log(
    `  Contrast groups:        ${passingContrastGroups.length}/${contrastGroups.length} fully correct`,
  );
}

function printMismatches(results) {
  const mismatches = results.filter((result) => !result.passed);
  console.log(`\nMismatches (${mismatches.length})`);
  if (mismatches.length === 0) {
    console.log("  None");
    return;
  }
  for (const result of mismatches) {
    console.log(
      `  - ${result.id}: expected ${result.expectedStatus}, got ${result.actualStatus} (${result.internalCategory}; ${result.reason})`,
    );
  }
}

const classificationDataset = readJson(fixturePath);
const policyDataset = readJson(policyFixturePath);
validateClassificationFixtures(classificationDataset);
validatePolicyFixtures(policyDataset);

const { matrix, results } = evaluate(classificationDataset);
const passed = results.filter((result) => result.passed).length;
const strict = process.argv.includes("--strict");

console.log("FocusGhost classification baseline");
console.log(`  Fixture schema:         v${classificationDataset.schemaVersion}`);
console.log(`  Classification cases:  ${classificationDataset.cases.length}`);
console.log(`  Time-policy scenarios: ${policyDataset.cases.length} (definition only)`);
printMatrix(matrix);
printMetrics(matrix, results);
printMismatches(results);

if (strict && passed !== results.length) {
  console.error(
    "\nStrict check failed because the current classifier does not yet match every expected case.",
  );
  process.exitCode = 1;
}
