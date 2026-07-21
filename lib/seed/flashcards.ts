/**
 * Vocabulary and formula flashcards.
 *
 * Formulas are chosen on one principle: the digital SAT gives you a reference
 * sheet, so anything ON that sheet is wasted deck space. These are the ones it
 * does NOT give you — the quadratic formula, slope, exponent rules, the circle
 * equation — which is exactly where marks get dropped.
 *
 * Vocabulary targets the SAT's Words in Context questions, which test
 * high-utility academic register rather than obscure words.
 */

export interface SeedFlashcard {
  exam: "SAT" | "TMUA";
  kind: "vocab" | "formula";
  front: string;
  back: string;
  hint?: string;
}

export const SAT_FORMULAS: SeedFlashcard[] = [
  {
    exam: "SAT",
    kind: "formula",
    front: "Quadratic formula",
    back: "$x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$ for $ax^2+bx+c=0$",
    hint: "NOT on the reference sheet.",
  },
  {
    exam: "SAT",
    kind: "formula",
    front: "Discriminant, and what it tells you",
    back: "$\\Delta = b^2 - 4ac$. $\\Delta>0$: two real roots. $\\Delta=0$: one. $\\Delta<0$: none.",
  },
  {
    exam: "SAT",
    kind: "formula",
    front: "Slope between two points",
    back: "$m = \\dfrac{y_2-y_1}{x_2-x_1}$",
    hint: "NOT on the reference sheet.",
  },
  {
    exam: "SAT",
    kind: "formula",
    front: "Vertex of $y=ax^2+bx+c$",
    back: "$x = -\\dfrac{b}{2a}$, then substitute for $y$.",
  },
  {
    exam: "SAT",
    kind: "formula",
    front: "Sum and product of roots",
    back: "Sum $= -\\dfrac{b}{a}$, product $= \\dfrac{c}{a}$.",
    hint: "Turns many 'sum of solutions' questions into one line.",
  },
  {
    exam: "SAT",
    kind: "formula",
    front: "Equation of a circle",
    back: "$(x-h)^2 + (y-k)^2 = r^2$, centre $(h,k)$, radius $r$.",
    hint: "NOT on the reference sheet.",
  },
  {
    exam: "SAT",
    kind: "formula",
    front: "Exponent rules",
    back: "$a^m a^n = a^{m+n}$, $\\dfrac{a^m}{a^n} = a^{m-n}$, $(a^m)^n = a^{mn}$, $a^{-n} = \\dfrac{1}{a^n}$, $a^{1/n} = \\sqrt[n]{a}$",
  },
  {
    exam: "SAT",
    kind: "formula",
    front: "Percent change",
    back: "$\\dfrac{\\text{new} - \\text{old}}{\\text{old}} \\times 100\\%$. An increase of $p\\%$ multiplies by $(1 + p/100)$.",
  },
  {
    exam: "SAT",
    kind: "formula",
    front: "Exponential growth and decay",
    back: "$y = a(1+r)^t$ for growth, $y = a(1-r)^t$ for decay, where $a$ is the initial amount.",
  },
  {
    exam: "SAT",
    kind: "formula",
    front: "Distance and midpoint",
    back: "$d = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}$; midpoint $= \\left(\\dfrac{x_1+x_2}{2}, \\dfrac{y_1+y_2}{2}\\right)$",
  },
  {
    exam: "SAT",
    kind: "formula",
    front: "SOH-CAH-TOA",
    back: "$\\sin = \\dfrac{\\text{opp}}{\\text{hyp}}$, $\\cos = \\dfrac{\\text{adj}}{\\text{hyp}}$, $\\tan = \\dfrac{\\text{opp}}{\\text{adj}}$",
  },
  {
    exam: "SAT",
    kind: "formula",
    front: "Complementary angle identity",
    back: "$\\sin\\theta = \\cos(90^\\circ - \\theta)$",
    hint: "A recurring digital-SAT trig question.",
  },
  {
    exam: "SAT",
    kind: "formula",
    front: "Arc length and sector area",
    back: "Arc $= \\dfrac{\\theta}{360}\\cdot 2\\pi r$; sector $= \\dfrac{\\theta}{360}\\cdot \\pi r^2$ (degrees).",
  },
  {
    exam: "SAT",
    kind: "formula",
    front: "Average (arithmetic mean) rearranged",
    back: "$\\text{sum} = \\text{mean} \\times \\text{count}$",
    hint: "Most SAT mean questions are really about the sum.",
  },
  {
    exam: "SAT",
    kind: "formula",
    front: "Parallel and perpendicular slopes",
    back: "Parallel: $m_1 = m_2$. Perpendicular: $m_1 m_2 = -1$.",
  },
];

export const TMUA_FORMULAS: SeedFlashcard[] = [
  {
    exam: "TMUA",
    kind: "formula",
    front: "Binomial expansion",
    back: "$(a+b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k$",
  },
  {
    exam: "TMUA",
    kind: "formula",
    front: "Logarithm laws",
    back: "$\\log(xy) = \\log x + \\log y$; $\\log\\frac{x}{y} = \\log x - \\log y$; $\\log x^n = n\\log x$; change of base $\\log_a b = \\frac{\\log b}{\\log a}$",
  },
  {
    exam: "TMUA",
    kind: "formula",
    front: "Arithmetic series sum",
    back: "$S_n = \\dfrac{n}{2}\\left(2a + (n-1)d\\right) = \\dfrac{n}{2}(a + l)$",
  },
  {
    exam: "TMUA",
    kind: "formula",
    front: "Geometric series sum",
    back: "$S_n = \\dfrac{a(1-r^n)}{1-r}$; for $|r|<1$, $S_\\infty = \\dfrac{a}{1-r}$",
  },
  {
    exam: "TMUA",
    kind: "formula",
    front: "Derivatives to know cold",
    back: "$\\frac{d}{dx}x^n = nx^{n-1}$, $\\frac{d}{dx}e^x = e^x$, $\\frac{d}{dx}\\ln x = \\frac1x$, $\\frac{d}{dx}\\sin x=\\cos x$, $\\frac{d}{dx}\\cos x=-\\sin x$",
  },
  {
    exam: "TMUA",
    kind: "formula",
    front: "Product, quotient and chain rules",
    back: "$(uv)' = u'v + uv'$; $\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}$; $\\frac{d}{dx}f(g(x)) = f'(g(x))g'(x)$",
  },
  {
    exam: "TMUA",
    kind: "formula",
    front: "Trig identities",
    back: "$\\sin^2\\theta + \\cos^2\\theta = 1$; $\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}$; $\\sin 2\\theta = 2\\sin\\theta\\cos\\theta$; $\\cos 2\\theta = \\cos^2\\theta - \\sin^2\\theta$",
  },
  {
    exam: "TMUA",
    kind: "formula",
    front: "Contrapositive",
    back: "$P \\Rightarrow Q$ is logically equivalent to $\\lnot Q \\Rightarrow \\lnot P$. The CONVERSE $Q \\Rightarrow P$ is not.",
    hint: "Paper 2 tests this relentlessly.",
  },
  {
    exam: "TMUA",
    kind: "formula",
    front: "Negating a quantifier",
    back: "$\\lnot(\\forall x\\, P(x)) \\equiv \\exists x\\, \\lnot P(x)$ and $\\lnot(\\exists x\\, P(x)) \\equiv \\forall x\\, \\lnot P(x)$",
  },
  {
    exam: "TMUA",
    kind: "formula",
    front: "Necessary vs sufficient",
    back: "$P \\Rightarrow Q$: $P$ is SUFFICIENT for $Q$; $Q$ is NECESSARY for $P$.",
    hint: "If you can only remember one thing for Paper 2, this is it.",
  },
  {
    exam: "TMUA",
    kind: "formula",
    front: "Discriminant conditions",
    back: "For $ax^2+bx+c=0$: $b^2-4ac>0$ two distinct real roots; $=0$ repeated; $<0$ none.",
  },
  {
    exam: "TMUA",
    kind: "formula",
    front: "Disproving a universal claim",
    back: "One counterexample. Proving it requires a general argument — no number of examples suffices.",
  },
];

export const SAT_VOCAB: SeedFlashcard[] = [
  { exam: "SAT", kind: "vocab", front: "undermine", back: "To weaken or damage, especially gradually." },
  { exam: "SAT", kind: "vocab", front: "substantiate", back: "To support with evidence; to prove." },
  { exam: "SAT", kind: "vocab", front: "nuanced", back: "Marked by subtle distinctions or shades of meaning." },
  { exam: "SAT", kind: "vocab", front: "ambivalent", back: "Having mixed or contradictory feelings about something." },
  { exam: "SAT", kind: "vocab", front: "empirical", back: "Based on observation or experiment rather than theory alone." },
  { exam: "SAT", kind: "vocab", front: "arbitrary", back: "Based on chance or personal whim rather than reason." },
  { exam: "SAT", kind: "vocab", front: "compelling", back: "Persuasive; commanding attention." },
  { exam: "SAT", kind: "vocab", front: "tenuous", back: "Weak, slight, insubstantial." },
  { exam: "SAT", kind: "vocab", front: "pragmatic", back: "Concerned with practical results rather than theory." },
  { exam: "SAT", kind: "vocab", front: "anomaly", back: "Something that deviates from what is standard or expected." },
  { exam: "SAT", kind: "vocab", front: "corroborate", back: "To confirm or give support to a statement or finding." },
  { exam: "SAT", kind: "vocab", front: "novel (adj.)", back: "New and unlike anything before — NOT 'a book'." },
  { exam: "SAT", kind: "vocab", front: "qualify (a claim)", back: "To limit or moderate it, not to make it eligible." },
  { exam: "SAT", kind: "vocab", front: "prevailing", back: "Most common or widespread at a given time." },
  { exam: "SAT", kind: "vocab", front: "speculative", back: "Based on conjecture rather than firm evidence." },
  { exam: "SAT", kind: "vocab", front: "reconcile", back: "To make two apparently conflicting things compatible." },
  { exam: "SAT", kind: "vocab", front: "inherent", back: "Existing as a natural, inseparable part of something." },
  { exam: "SAT", kind: "vocab", front: "obscure (verb)", back: "To make unclear or hide from view." },
  { exam: "SAT", kind: "vocab", front: "advocate (verb)", back: "To publicly recommend or support." },
  { exam: "SAT", kind: "vocab", front: "plausible", back: "Seeming reasonable or probable, though not proven." },
  { exam: "SAT", kind: "vocab", front: "converge", back: "To come together from different directions toward one point." },
  { exam: "SAT", kind: "vocab", front: "attribute (verb)", back: "To regard something as caused by a particular thing." },
  { exam: "SAT", kind: "vocab", front: "mitigate", back: "To make less severe or painful." },
  { exam: "SAT", kind: "vocab", front: "paradox", back: "A statement that seems self-contradictory yet may be true." },
  { exam: "SAT", kind: "vocab", front: "scrutiny", back: "Close, critical examination." },
];

export const ALL_FLASHCARDS: SeedFlashcard[] = [
  ...SAT_FORMULAS,
  ...TMUA_FORMULAS,
  ...SAT_VOCAB,
];
