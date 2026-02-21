/**
 * TEST PROTOCOL — Phase 1 Deterministic Core
 * 
 * Validates:
 * - Token normalization
 * - Extraction logic
 * - AND intersection
 * - Search operation reports
 * - HARD FAIL states
 */

import { normalizeText, extractTokens, explainNormalization, explainTokenExtraction } from "../core/tokenizer.ts"
import { DeterministicExecutor } from "../core/deterministicExecutor.ts"

// ─────────────────────────────────────────────
// TEST HARNESS
// ─────────────────────────────────────────────

interface TestCase {
  name: string
  input: any
  expectedResult: any
  assertion: (actual: any, expected: any) => boolean
}

function runTest(testCase: TestCase): { passed: boolean; message: string } {
  try {
    const result = testCase.assertion(testCase.input, testCase.expectedResult)
    if (result) {
      return { passed: true, message: `✓ ${testCase.name}` }
    } else {
      return { passed: false, message: `✗ ${testCase.name} — assertion failed` }
    }
  } catch (error) {
    return { passed: false, message: `✗ ${testCase.name} — ${error instanceof Error ? error.message : String(error)}` }
  }
}

// ─────────────────────────────────────────────
// TEST SUITE 1: TOKENIZATION
// ─────────────────────────────────────────────

const tokenizationTests: TestCase[] = [
  {
    name: "normalizeText: basic punctuation removal",
    input: "Hello, World!",
    expectedResult: "hello world",
    assertion: (input, expected) => normalizeText(input) === expected
  },
  {
    name: "normalizeText: collapse whitespace",
    input: "hello    world",
    expectedResult: "hello world",
    assertion: (input, expected) => normalizeText(input) === expected
  },
  {
    name: "normalizeText: trim",
    input: "  hello world  ",
    expectedResult: "hello world",
    assertion: (input, expected) => normalizeText(input) === expected
  },
  {
    name: "extractTokens: filters stopwords",
    input: "the christmas is coming",
    expectedResult: ["christmas", "coming"],
    assertion: (input, expected) => {
      const normalized = normalizeText(input)
      const tokens = extractTokens(normalized)
      return JSON.stringify(tokens.sort()) === JSON.stringify(expected.sort())
    }
  },
  {
    name: "extractTokens: filters short words",
    input: "a big tree",
    expectedResult: ["big", "tree"],
    assertion: (input, expected) => {
      const normalized = normalizeText(input)
      const tokens = extractTokens(normalized)
      return JSON.stringify(tokens.sort()) === JSON.stringify(expected.sort())
    }
  },
  {
    name: "extractTokens: deduplicates",
    input: "christmas christmas christmas",
    expectedResult: ["christmas"],
    assertion: (input, expected) => {
      const normalized = normalizeText(input)
      const tokens = extractTokens(normalized)
      return JSON.stringify(tokens) === JSON.stringify(expected)
    }
  }
]

// ─────────────────────────────────────────────
// TEST SUITE 2: SEARCH EXECUTION
// ─────────────────────────────────────────────

const mockThreads = [
  { id: "t1", title: "Merry Christmas at Brookdale" },
  { id: "t2", title: "Birthday Party Planning" },
  { id: "t3", title: "Brookdale Maintenance Updates" },
  { id: "t4", title: "Holiday Recipes and Ideas" },
  { id: "t5", title: "General Chat" }
]

const searchExecutionTests: TestCase[] = [
  {
    name: "SEARCH_THREADS: single topic 'christmas'",
    input: { executor: new DeterministicExecutor(mockThreads), query: "threads about christmas" },
    expectedResult: { matchCount: 2, matchType: "partial" },
    assertion: (input, expected) => {
      const result = input.executor.executeSearchThreads(input.query)
      return (
        result.matchCount === expected.matchCount &&
        result.report?.matchSummary.matchType === expected.matchType
      )
    }
  },
  {
    name: "SEARCH_THREADS: single topic 'brookdale'",
    input: { executor: new DeterministicExecutor(mockThreads), query: "threads containing brookdale" },
    expectedResult: { matchCount: 2, matchType: "partial" },
    assertion: (input, expected) => {
      const result = input.executor.executeSearchThreads(input.query)
      return (
        result.matchCount === expected.matchCount &&
        result.report?.matchSummary.matchType === expected.matchType
      )
    }
  },
  {
    name: "SEARCH_THREADS: multi-topic AND intersection 'christmas brookdale'",
    input: { executor: new DeterministicExecutor(mockThreads), query: "threads about christmas and brookdale" },
    expectedResult: { matchCount: 1, matchType: "exact" }, // Only t1 has both
    assertion: (input, expected) => {
      const result = input.executor.executeSearchThreads(input.query)
      return (
        result.matchCount === expected.matchCount &&
        result.report?.matchSummary.matchType === expected.matchType
      )
    }
  },
  {
    name: "SEARCH_THREADS: zero matches",
    input: { executor: new DeterministicExecutor(mockThreads), query: "threads about nonexistent" },
    expectedResult: { matchCount: 0, matchType: "none" },
    assertion: (input, expected) => {
      const result = input.executor.executeSearchThreads(input.query)
      return (
        result.matchCount === expected.matchCount &&
        result.report?.matchSummary.matchType === expected.matchType
      )
    }
  },
  {
    name: "LIST_THREADS: returns all threads unfiltered",
    input: { executor: new DeterministicExecutor(mockThreads) },
    expectedResult: { matchCount: 5 },
    assertion: (input, expected) => {
      const result = input.executor.executeListThreads()
      return result.matchCount === expected.matchCount
    }
  }
]

// ─────────────────────────────────────────────
// TEST SUITE 3: HARD FAIL STATES
// ─────────────────────────────────────────────

const hardFailTests: TestCase[] = [
  {
    name: "SEARCH_THREADS: empty query returns HARD FAIL",
    input: { executor: new DeterministicExecutor(mockThreads), query: "" },
    expectedResult: { valid: false, errorReason: "EMPTY_QUERY" },
    assertion: (input, expected) => {
      const result = input.executor.executeSearchThreads(input.query)
      return result.valid === expected.valid && result.errorReason === expected.errorReason
    }
  },
  {
    name: "SEARCH_THREADS: stopword-only query returns HARD FAIL",
    input: { executor: new DeterministicExecutor(mockThreads), query: "the and for" },
    expectedResult: { valid: false, errorReason: "SEARCH_REQUIRES_TOPICS" },
    assertion: (input, expected) => {
      const result = input.executor.executeSearchThreads(input.query)
      return result.valid === expected.valid && result.errorReason === expected.errorReason
    }
  }
]

// ─────────────────────────────────────────────
// TEST SUITE 4: REPORT FORMAT
// ─────────────────────────────────────────────

const reportFormatTests: TestCase[] = [
  {
    name: "SEARCH_THREADS report has correct shape",
    input: { executor: new DeterministicExecutor(mockThreads), query: "threads about christmas" },
    expectedResult: {
      hasScope: true,
      hasQueryTerms: true,
      hasTokenHits: true,
      hasMatchSummary: true,
      hasResults: true,
      hasNextStep: true
    },
    assertion: (input, expected) => {
      const result = input.executor.executeSearchThreads(input.query)
      const report = result.report
      return (
        report &&
        report.searchScope === "title_index" &&
        Array.isArray(report.queryTerms) &&
        report.tokenHits !== undefined &&
        report.matchSummary !== undefined &&
        Array.isArray(report.results) &&
        report.nextStep !== undefined
      )
    }
  }
]

// ─────────────────────────────────────────────
// RUN ALL TESTS
// ─────────────────────────────────────────────

export function runAllTests(): void {
  console.log("🧪 CAOS:INDEX — Phase 1 Test Suite\n")

  const allTests = [
    { suite: "TOKENIZATION", tests: tokenizationTests },
    { suite: "SEARCH EXECUTION", tests: searchExecutionTests },
    { suite: "HARD FAIL STATES", tests: hardFailTests },
    { suite: "REPORT FORMAT", tests: reportFormatTests }
  ]

  let totalPassed = 0
  let totalFailed = 0

  for (const { suite, tests } of allTests) {
    console.log(`\n📋 ${suite}`)
    for (const test of tests) {
      const result = runTest(test)
      console.log(`  ${result.message}`)
      if (result.passed) totalPassed++
      else totalFailed++
    }
  }

  console.log(`\n${"═".repeat(50)}`)
  console.log(`✓ Passed: ${totalPassed}`)
  console.log(`✗ Failed: ${totalFailed}`)
  console.log(`${"═".repeat(50)}\n`)
}

// ─────────────────────────────────────────────
// MAIN ENTRY (for debugging)
// ─────────────────────────────────────────────

if (import.meta.main) {
  runAllTests()
}