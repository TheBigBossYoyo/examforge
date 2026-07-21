/**
 * Topic taxonomy seed (section D). Areas:
 *   TMUA: "P1" (Applications), "P2" (Reasoning/logic)
 *   SAT:  "Math", "RW" (Reading & Writing)
 */

export interface SeedTopic {
  area: string;
  subtopic: string;
}

export const TMUA_TOPICS: SeedTopic[] = [
  // Paper 1 — Applications of Mathematical Knowledge
  { area: "P1", subtopic: "Algebra & functions" },
  { area: "P1", subtopic: "Sequences & series (incl. binomial)" },
  { area: "P1", subtopic: "Coordinate geometry" },
  { area: "P1", subtopic: "Exponentials & logarithms" },
  { area: "P1", subtopic: "Trigonometry" },
  { area: "P1", subtopic: "Differentiation" },
  { area: "P1", subtopic: "Integration" },
  { area: "P1", subtopic: "Graphs & transformations" },
  { area: "P1", subtopic: "Number & divisibility" },
  { area: "P1", subtopic: "Combinatorics & probability" },
  // Paper 2 — Mathematical Reasoning (logic & proof)
  { area: "P2", subtopic: "Logic & connectives" },
  { area: "P2", subtopic: "Necessary vs sufficient" },
  { area: "P2", subtopic: "Converse & contrapositive" },
  { area: "P2", subtopic: "Proof by contradiction" },
  { area: "P2", subtopic: "Proof by cases" },
  { area: "P2", subtopic: "Induction (recognition)" },
  { area: "P2", subtopic: "Counterexamples" },
  { area: "P2", subtopic: "Identifying flawed proofs" },
  { area: "P2", subtopic: "Quantifiers & their negation" },
];

export const SAT_TOPICS: SeedTopic[] = [
  // Math
  { area: "Math", subtopic: "Linear equations & functions" },
  { area: "Math", subtopic: "Systems & inequalities" },
  { area: "Math", subtopic: "Nonlinear functions/quadratics" },
  { area: "Math", subtopic: "Exponentials & polynomials" },
  { area: "Math", subtopic: "Radicals & rational exponents" },
  { area: "Math", subtopic: "Ratios/rates/proportions" },
  { area: "Math", subtopic: "Percentages & units" },
  { area: "Math", subtopic: "One-variable statistics" },
  { area: "Math", subtopic: "Two-variable data & scatterplots" },
  { area: "Math", subtopic: "Probability & inference" },
  { area: "Math", subtopic: "Area & volume" },
  { area: "Math", subtopic: "Lines/angles/triangles" },
  { area: "Math", subtopic: "Right-triangle trig" },
  { area: "Math", subtopic: "Circles" },
  // Reading & Writing
  { area: "RW", subtopic: "Central ideas & details" },
  { area: "RW", subtopic: "Command of evidence (textual)" },
  { area: "RW", subtopic: "Command of evidence (quantitative)" },
  { area: "RW", subtopic: "Inferences" },
  { area: "RW", subtopic: "Words in context" },
  { area: "RW", subtopic: "Text structure & purpose" },
  { area: "RW", subtopic: "Cross-text connections" },
  { area: "RW", subtopic: "Rhetorical synthesis" },
  { area: "RW", subtopic: "Transitions" },
  { area: "RW", subtopic: "Boundaries (punctuation)" },
  { area: "RW", subtopic: "Form/structure/sense (grammar)" },
];
