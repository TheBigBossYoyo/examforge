/**
 * Desmos speed drills.
 *
 * The lessons in lib/desmos-lessons.ts teach the techniques. This is the layer
 * almost no commercial SAT app has: drilling those techniques against a clock,
 * because on test day the value of Desmos is entirely in how fast you reach
 * for it. Knowing you *could* graph an equation is worth nothing if you spend
 * ninety seconds deciding.
 *
 * Every drill carries a `par_seconds` — the time a fluent user should need,
 * not a generous allowance. Beating par is the goal; correctness alone is not.
 */

export interface DesmosDrill {
  /** Stable identifier stored in desmos_drill_attempts.drill_code. */
  code: string;
  title: string;
  /** The Desmos skill this drills. */
  skill: string;
  prompt_md: string;
  /** Answer checked with the same marker as exam questions (lib/answer.ts). */
  correct_answer: string;
  /** Seconds a fluent user should need. Beating this is the target. */
  par_seconds: number;
  /** Pre-loaded calculator state, if the drill starts from a setup. */
  desmos_state_json?: string;
  /** The keystroke-level method, revealed after answering. */
  method_md: string;
  /** Why the algebraic route is slower here — or when it is actually faster. */
  tradeoff_md: string;
}

export const DESMOS_DRILLS: DesmosDrill[] = [
  {
    code: "solve-linear",
    title: "Solve by typing the equation",
    skill: "Equation → vertical line",
    prompt_md: "Solve for $x$: $\\;7(x-3) + 2x = 4x + 11$",
    correct_answer: "6.4",
    par_seconds: 15,
    method_md:
      "Type the equation **exactly as printed** on one line. Desmos draws a vertical line at the solution. Click it to read $x$.\n\nNo rearranging, no distributing, no collecting terms.",
    tradeoff_md:
      "Algebra takes ~40s here and gives three chances to slip a sign. Typing takes ~10s. Always type first when the equation is linear in one variable.",
  },
  {
    code: "system-intersection",
    title: "System by intersection",
    skill: "Two equations → click the crossing",
    prompt_md:
      "The system $\\;y = 2x - 5\\;$ and $\\;3x + 2y = 18\\;$ has solution $(x, y)$. What is $y$?",
    correct_answer: "3",
    par_seconds: 20,
    method_md:
      "Type both equations on separate lines. Click the intersection dot — Desmos labels it $(4, 3)$.\n\nYou do **not** need to solve for $y$ first; Desmos graphs implicit linear equations directly.",
    tradeoff_md:
      "Substitution is ~45s. Graphing is ~15s and the intersection is read, not computed, so there is nothing to get wrong.",
  },
  {
    code: "quadratic-roots",
    title: "Both roots at a glance",
    skill: "Parabola → x-intercepts",
    prompt_md:
      "What is the **sum** of the solutions to $\\;2x^2 - 11x + 5 = 0$?",
    correct_answer: "5.5",
    par_seconds: 25,
    method_md:
      "Type `2x^2-11x+5=0`. Desmos marks both roots on the $x$-axis: $0.5$ and $5$. Click each to read them, then add.\n\nFaster still: the sum of roots is $-b/a = 11/2$, but only if you trust the formula under pressure.",
    tradeoff_md:
      "The quadratic formula works but costs ~50s and a $\\sqrt{81}$ step. Graphing is ~20s. Note the reference sheet does **not** give you the quadratic formula.",
  },
  {
    code: "vertex-minimum",
    title: "Vertex without completing the square",
    skill: "Parabola → minimum/maximum",
    prompt_md:
      "The function $f(x) = x^2 - 8x + 3$ has its minimum at $x = a$. What is $a$?",
    correct_answer: "4",
    par_seconds: 15,
    method_md:
      "Type `y=x^2-8x+3`. Desmos shows the vertex as a labelled point — click it to read $(4, -13)$.",
    tradeoff_md:
      "Completing the square is ~40s. Even $-b/2a$ is ~15s and invites an arithmetic slip. Clicking is instant and unambiguous.",
  },
  {
    code: "table-regression",
    title: "Line of best fit from a table",
    skill: "Table → regression",
    prompt_md:
      "For the points $(1,4), (2,7), (3,10), (4,13)$, a line of best fit is $y = mx + b$. What is $m$?",
    correct_answer: "3",
    par_seconds: 40,
    method_md:
      "Add a **table** (the `+` button), enter the $x$ and $y$ columns, then on a new line type `y_1 ~ mx_1 + b`. Desmos reports $m = 3$, $b = 1$.\n\nThe tilde `~` is regression, not equals — this is the single most under-used Desmos feature on the SAT.",
    tradeoff_md:
      "By hand you would compute a slope from two points and hope the data is exactly linear. Regression handles scattered data too, which hand methods cannot.",
  },
  {
    code: "inequality-region",
    title: "Inequality regions",
    skill: "Shaded region → test a point",
    prompt_md:
      "Is the point $(3, 1)$ a solution to the system $\\;y < 2x - 3\\;$ and $\\;y > -x + 2$?  Answer 1 for yes, 0 for no.",
    correct_answer: "1",
    par_seconds: 25,
    method_md:
      "Type both inequalities. Desmos shades each region; the overlap is the solution set. Then type the point `(3,1)` — if it lands in the doubly-shaded area, it is a solution.",
    tradeoff_md:
      "Substituting into both inequalities is comparably fast here, but graphing scales: when the question asks which of four points works, the graph answers all four at once.",
  },
  {
    code: "circle-centre",
    title: "Circle centre without completing the square",
    skill: "Implicit equation → graph",
    prompt_md:
      "The circle $\\;x^2 + y^2 - 6x + 4y - 12 = 0\\;$ has centre $(a, b)$. What is $a$?",
    correct_answer: "3",
    par_seconds: 25,
    method_md:
      "Type the equation exactly. Desmos draws the circle. Read the centre off the graph, or type `(3,-2)` to confirm it sits at the middle.",
    tradeoff_md:
      "Completing the square twice is ~60s and error-prone. Graphing is ~15s. This is one of the biggest Desmos wins in Geometry.",
  },
  {
    code: "function-value",
    title: "Function composition by evaluation",
    skill: "Define f and g, evaluate directly",
    prompt_md:
      "If $f(x) = 3x - 1$ and $g(x) = x^2 + 2$, what is $f(g(2))$?",
    correct_answer: "17",
    par_seconds: 20,
    method_md:
      "Define `f(x)=3x-1` and `g(x)=x^2+2` on separate lines, then type `f(g(2))`. Desmos prints $17$.\n\nDefining functions once and evaluating repeatedly is much faster than re-substituting when a question asks for several values.",
    tradeoff_md:
      "By hand this is ~25s and fine for one evaluation. Desmos wins the moment the question asks for two or more.",
  },
  {
    code: "when-not-to-use",
    title: "When NOT to reach for Desmos",
    skill: "Judgement",
    prompt_md:
      "$\\;3^{x+2} = 81\\;$. Solve for $x$. (Do it in your head first — then check.)",
    correct_answer: "2",
    par_seconds: 12,
    method_md:
      "$81 = 3^4$, so $x + 2 = 4$ and $x = 2$. Recognising the power beats typing.\n\nGraphing works, but opening the calculator, typing, and clicking costs more than the five seconds the insight takes.",
    tradeoff_md:
      "This is the drill that matters most. Desmos fluency includes knowing the ~15% of questions where reaching for it is *slower*. Clean exponent, factoring and ratio questions are usually faster mentally.",
  },
];

export function getDrill(code: string): DesmosDrill | undefined {
  return DESMOS_DRILLS.find((d) => d.code === code);
}
