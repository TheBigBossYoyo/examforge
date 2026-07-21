export interface TheoryContent {
  slug: string;
  area: string;
  examName: "TMUA" | "SAT";
  title: string;
  explanation_md: string;
  worked_examples: { prompt_md: string; solution_md: string }[];
  mini_exercises: { prompt_md: string; answer_md: string }[];
  common_traps_md: string;
  exam_strategy_md: string;
  theory_to_exam_md: string;
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const THEORY_DB: TheoryContent[] = [
  // --- TMUA P2 ---
  {
    slug: "logic-connectives",
    area: "P2",
    examName: "TMUA",
    title: "Logic & connectives",
    explanation_md: "Logic connectives such as AND ($\\land$), OR ($\\lor$), and NOT ($\\sim$ or $\\neg$) are the building blocks of mathematical logic. In TMUA, you must understand their precise mathematical meanings. Note that OR is inclusive: $P \\lor Q$ means P is true, Q is true, or both are true.",
    worked_examples: [
      {
        prompt_md: "Is the statement '$x < 5$ or $x > 0$' true for $x = 3$?",
        solution_md: "Yes. For $x=3$, $x > 0$ is true. Since OR is inclusive and at least one condition holds, the statement is true."
      }
    ],
    mini_exercises: [
      { prompt_md: "Write the negation of '$x > 0$ and $y < 0$'.", answer_md: "'$x \\leq 0$ or $y \\geq 0$'." },
      { prompt_md: "Evaluate $P \\lor (Q \\land \\neg P)$ if $P$ is false and $Q$ is true.", answer_md: "True." }
    ],
    common_traps_md: "Assuming 'or' is exclusive. In math, 'or' always includes the 'both' case unless 'exclusive or' is stated.",
    exam_strategy_md: "Use truth tables if you are confused by a complex logical statement.",
    theory_to_exam_md: "Expect questions where a statement must be evaluated for specific integer values."
  },
  {
    slug: "necessary-vs-sufficient",
    area: "P2",
    examName: "TMUA",
    title: "Necessary vs sufficient",
    explanation_md: "A condition $P$ is **sufficient** for $Q$ if $P \\implies Q$ (if $P$ happens, $Q$ is guaranteed). A condition $P$ is **necessary** for $Q$ if $Q \\implies P$ (you can't have $Q$ without $P$). If $P \\iff Q$, they are necessary and sufficient for each other.",
    worked_examples: [
      {
        prompt_md: "Let $P$ be '$x$ is a multiple of 4' and $Q$ be '$x$ is even'. Is $P$ necessary or sufficient for $Q$?",
        solution_md: "If $x$ is a multiple of 4, it is definitely even. So $P \\implies Q$. Thus $P$ is sufficient for $Q$. Is it necessary? No, $x$ could be 2 (even, but not a multiple of 4). So $P$ is sufficient but not necessary."
      }
    ],
    mini_exercises: [
      { prompt_md: "Is $x > 0$ necessary or sufficient for $x^2 > 0$?", answer_md: "Sufficient, but not necessary (since $x < 0$ also gives $x^2 > 0$)." },
      { prompt_md: "Translate: 'A is necessary for B' into an implication.", answer_md: "$B \\implies A$." }
    ],
    common_traps_md: "Confusing the direction of implication. Remember: 'P is necessary for Q' means $Q \\implies P$.",
    exam_strategy_md: "Test values to break the implication. If you can find a case where $P$ is true but $Q$ is false, then $P$ is NOT sufficient for $Q$.",
    theory_to_exam_md: "TMUA P2 often has questions asking 'Which of the following is necessary and sufficient for...'"
  },
  {
    slug: "converse-contrapositive",
    area: "P2",
    examName: "TMUA",
    title: "Converse & contrapositive",
    explanation_md: "For an implication $P \\implies Q$:\n- The **converse** is $Q \\implies P$. It is NOT logically equivalent to the original statement.\n- The **contrapositive** is $\\neg Q \\implies \\neg P$. It IS logically equivalent to the original statement.",
    worked_examples: [
      {
        prompt_md: "What is the contrapositive of 'If it rains, the ground is wet'?",
        solution_md: "'If the ground is not wet, then it is not raining.'"
      }
    ],
    mini_exercises: [
      { prompt_md: "True or False: A statement and its converse can both be true.", answer_md: "True (e.g. if they are logically equivalent)." },
      { prompt_md: "What is the converse of $x > 2 \\implies x^2 > 4$?", answer_md: "$x^2 > 4 \\implies x > 2$." }
    ],
    common_traps_md: "Assuming the converse is true just because the original statement is true.",
    exam_strategy_md: "When trying to prove $P \\implies Q$, sometimes it's easier to prove its contrapositive $\\neg Q \\implies \\neg P$.",
    theory_to_exam_md: "Expect questions where a student 'deduces' the converse, which is a logical error."
  },
  {
    slug: "proof-by-contradiction",
    area: "P2",
    examName: "TMUA",
    title: "Proof by contradiction",
    explanation_md: "To prove $P$, assume $\\neg P$ is true. Deduce a logical contradiction (e.g., $1=0$, or a number is both even and odd). Conclude that the assumption $\\neg P$ must be false, so $P$ must be true.",
    worked_examples: [
      {
        prompt_md: "Outline a proof by contradiction that $\\sqrt{2}$ is irrational.",
        solution_md: "Assume $\\sqrt{2}$ is rational, so $\\sqrt{2} = a/b$ for coprime integers $a, b$. Then $2b^2 = a^2$, so $a^2$ is even, so $a$ is even. Let $a = 2k$. Then $2b^2 = 4k^2 \\implies b^2 = 2k^2$, so $b$ is even. This contradicts $a,b$ being coprime. Thus $\\sqrt{2}$ is irrational."
      }
    ],
    mini_exercises: [
      { prompt_md: "What is the first step to prove there are infinitely many primes by contradiction?", answer_md: "Assume there is a finite number of primes." },
      { prompt_md: "If your contradiction shows $p \\land \\neg p$, is the proof complete?", answer_md: "Yes." }
    ],
    common_traps_md: "Incorrectly negating the original statement. For example, the negation of 'For all $x$, $P(x)$' is 'There exists an $x$ such that $\\neg P(x)$', NOT 'For all $x$, $\\neg P(x)$'.",
    exam_strategy_md: "TMUA often asks you to identify the missing step or the flaw in a given proof by contradiction.",
    theory_to_exam_md: "Focus on the structure. A valid proof must reach a genuine impossibility."
  },
  {
    slug: "proof-by-cases",
    area: "P2",
    examName: "TMUA",
    title: "Proof by cases",
    explanation_md: "Divide the problem into an exhaustive set of cases (e.g., $n$ is even, $n$ is odd). Prove the statement holds in every single case. Since all possibilities are covered, the statement holds universally.",
    worked_examples: [
      {
        prompt_md: "Prove that $n^2+n$ is even for all integers $n$.",
        solution_md: "Case 1: $n$ is even. Let $n=2k$. $n^2+n = 4k^2+2k = 2(2k^2+k)$, which is even. Case 2: $n$ is odd. Let $n=2k+1$. $n^2+n = (2k+1)^2+(2k+1) = 4k^2+4k+1+2k+1 = 4k^2+6k+2 = 2(2k^2+3k+1)$, which is even. Thus true for all $n$."
      }
    ],
    mini_exercises: [
      { prompt_md: "If testing parity, what are the cases?", answer_md: "Even and odd." },
      { prompt_md: "Are cases $x>0$ and $x<0$ exhaustive?", answer_md: "No, missed $x=0$." }
    ],
    common_traps_md: "Missing a case, such as $0$, negative numbers, or non-integers.",
    exam_strategy_md: "Whenever you see absolute values $|x|$, expect to use cases $x \\ge 0$ and $x < 0$.",
    theory_to_exam_md: "Identifying a missing case in a flawed proof."
  },
  {
    slug: "induction-recognition",
    area: "P2",
    examName: "TMUA",
    title: "Induction (recognition)",
    explanation_md: "Mathematical induction involves a Base Case (prove true for $n=1$) and an Inductive Step (assume true for $n=k$, prove true for $n=k+1$). TMUA tests your ability to spot structural errors in inductive proofs.",
    worked_examples: [
      {
        prompt_md: "What is the inductive hypothesis when proving $\\sum_{i=1}^n i = \\frac{n(n+1)}{2}$?",
        solution_md: "Assume the statement holds for some positive integer $k$, i.e., $\\sum_{i=1}^k i = \\frac{k(k+1)}{2}$."
      }
    ],
    mini_exercises: [
      { prompt_md: "If the base case is omitted, is the proof valid?", answer_md: "No." },
      { prompt_md: "What is strong induction?", answer_md: "Assuming true for all $m \\le k$ to prove for $k+1$." }
    ],
    common_traps_md: "Assuming what you are trying to prove (circular logic) in the inductive step.",
    exam_strategy_md: "Check if the transition from $k$ to $k+1$ relies on $k$ being strictly greater than the base case.",
    theory_to_exam_md: "Spotting the exact line where an induction proof breaks down."
  },
  {
    slug: "counterexamples",
    area: "P2",
    examName: "TMUA",
    title: "Counterexamples",
    explanation_md: "A single counterexample is sufficient to disprove a universal statement 'For all $x$, $P(x)$'. It must satisfy the conditions but fail the conclusion.",
    worked_examples: [
      {
        prompt_md: "Disprove: 'All prime numbers are odd'.",
        solution_md: "2 is a prime number, but 2 is even. This is a counterexample."
      }
    ],
    mini_exercises: [
      { prompt_md: "Disprove $x^2 > x$ for all real $x$.", answer_md: "Let $x=0.5$. Then $0.25 > 0.5$ is false." },
      { prompt_md: "Can a counterexample disprove an existential statement?", answer_md: "No, one example cannot disprove 'There exists...'" }
    ],
    common_traps_md: "Using a case that doesn't meet the initial conditions.",
    exam_strategy_md: "Test 0, 1, -1, fractions between 0 and 1, and negative numbers.",
    theory_to_exam_md: "Multiple choice often gives four candidates; only one actually satisfies the premise and violates the conclusion."
  },
  {
    slug: "identifying-flawed-proofs",
    area: "P2",
    examName: "TMUA",
    title: "Identifying flawed proofs",
    explanation_md: "Finding logical holes in arguments. Common flaws: dividing by zero, assuming the converse, asserting a general rule from a specific example, and missing cases.",
    worked_examples: [
      {
        prompt_md: "Find the flaw: $x^2 = x \\implies x = 1$.",
        solution_md: "The deduction divides both sides by $x$. This is invalid if $x=0$. So $x=0$ was a missed case."
      }
    ],
    mini_exercises: [
      { prompt_md: "Flaw in $\\sqrt{x^2} = x$?", answer_md: "Fails for $x<0$. It should be $|x|$." },
      { prompt_md: "Flaw in 'If it rains, it pours. It pours, so it rained.'?", answer_md: "Assuming the converse." }
    ],
    common_traps_md: "Skimming over algebraic manipulations like squaring (which can introduce extraneous solutions).",
    exam_strategy_md: "Always check division steps and square root steps carefully.",
    theory_to_exam_md: "Crucial for TMUA Paper 2, specifically questions asking 'Which line contains the first error?'"
  },
  {
    slug: "quantifiers-their-negation",
    area: "P2",
    examName: "TMUA",
    title: "Quantifiers & their negation",
    explanation_md: "Universal quantifier ($\\forall$, 'for all') and Existential quantifier ($\\exists$, 'there exists'). Negating $\\forall x, P(x)$ gives $\\exists x, \\neg P(x)$. Negating $\\exists x, P(x)$ gives $\\forall x, \\neg P(x)$.",
    worked_examples: [
      {
        prompt_md: "Negate: 'Every continuous function is differentiable.'",
        solution_md: "'There exists a continuous function that is not differentiable.'"
      }
    ],
    mini_exercises: [
      { prompt_md: "Negate: $\\exists x (x > 0 \\land x^2 < 0)$", answer_md: "$\\forall x (x \\leq 0 \\lor x^2 \\geq 0)$" },
      { prompt_md: "Negate: All cats are grey.", answer_md: "There exists a cat that is not grey." }
    ],
    common_traps_md: "Negating 'All' to 'None'. The negation of 'All are' is 'At least one is not'.",
    exam_strategy_md: "Apply De Morgan's laws precisely when negating complex expressions.",
    theory_to_exam_md: "Direct testing of standard logic transformations."
  },
  
  // --- TMUA P1 (Subset for brevity) ---
  {
    slug: "algebra-functions",
    area: "P1",
    examName: "TMUA",
    title: "Algebra & functions",
    explanation_md: "Foundations of algebra: polynomial roots, factor theorem, function composition, domain and range, inverse functions.",
    worked_examples: [
      {
        prompt_md: "Find the remainder when $x^3 - 2x + 1$ is divided by $x-2$.",
        solution_md: "By the Remainder Theorem, $f(2) = 2^3 - 2(2) + 1 = 8 - 4 + 1 = 5$."
      }
    ],
    mini_exercises: [
      { prompt_md: "If $f(x)=2x+1$, find $f^{-1}(x)$.", answer_md: "$(x-1)/2$" },
      { prompt_md: "Is $f(x)=x^2$ invertible over all real numbers?", answer_md: "No, it is not one-to-one." }
    ],
    common_traps_md: "Forgetting to specify the domain when finding an inverse function.",
    exam_strategy_md: "Use the discriminant $\\Delta = b^2 - 4ac$ to find the number of real roots for quadratics.",
    theory_to_exam_md: "Functions are heavily tested, often combined with graphs."
  },
  {
    slug: "sequences-series-incl-binomial",
    area: "P1",
    examName: "TMUA",
    title: "Sequences & series (incl. binomial)",
    explanation_md: "Arithmetic and geometric progressions. Sum formulas. Binomial expansion for positive integer powers.",
    worked_examples: [
      {
        prompt_md: "Find the sum of the first 10 terms of an arithmetic progression with first term 2 and common difference 3.",
        solution_md: "$S_{10} = \\frac{10}{2}(2(2) + (10-1)3) = 5(4 + 27) = 155$."
      }
    ],
    mini_exercises: [
      { prompt_md: "Sum to infinity of geometric series with $a=1, r=1/2$?", answer_md: "2" },
      { prompt_md: "Condition for sum to infinity to exist?", answer_md: "$|r| < 1$" }
    ],
    common_traps_md: "Using the sum to infinity formula when $|r| \\ge 1$.",
    exam_strategy_md: "For binomial coefficients, remember $\\binom{n}{k} = \\binom{n}{n-k}$.",
    theory_to_exam_md: "Often combined with logarithms or trigonometry."
  },
  {
    slug: "coordinate-geometry",
    area: "P1",
    examName: "TMUA",
    title: "Coordinate geometry",
    explanation_md: "Straight lines, gradients, circles (equations, tangents, normals).",
    worked_examples: [
      {
        prompt_md: "Find the center and radius of $x^2 + y^2 - 4x + 6y - 3 = 0$.",
        solution_md: "Complete the square: $(x-2)^2 - 4 + (y+3)^2 - 9 - 3 = 0 \\implies (x-2)^2 + (y+3)^2 = 16$. Center $(2, -3)$, radius $4$."
      }
    ],
    mini_exercises: [
      { prompt_md: "Gradient of line perpendicular to $y = 2x + 1$?", answer_md: "-1/2" },
      { prompt_md: "Distance between (0,0) and (3,4)?", answer_md: "5" }
    ],
    common_traps_md: "Getting signs wrong when completing the square.",
    exam_strategy_md: "Draw a quick sketch. It often reveals geometric properties that save algebra.",
    theory_to_exam_md: "Finding intersections of lines and circles using substitution."
  },
  {
    slug: "exponentials-logarithms",
    area: "P1",
    examName: "TMUA",
    title: "Exponentials & logarithms",
    explanation_md: "Rules of logs: $\\log(ab) = \\log a + \\log b$, $\\log(a^b) = b \\log a$. Exponential growth and decay.",
    worked_examples: [
      {
        prompt_md: "Solve $2^{x+1} = 3^x$.",
        solution_md: "Take ln: $(x+1)\\ln 2 = x\\ln 3 \\implies x\\ln 2 + \\ln 2 = x\\ln 3 \\implies x(\\ln 3 - \\ln 2) = \\ln 2 \\implies x = \\frac{\\ln 2}{\\ln 1.5}$."
      }
    ],
    mini_exercises: [
      { prompt_md: "Simplify $\\log_2 8$.", answer_md: "3" },
      { prompt_md: "What is $e^{\\ln 5}$?", answer_md: "5" }
    ],
    common_traps_md: "Thinking $\\log(a+b) = \\log a + \\log b$. This is false!",
    exam_strategy_md: "Convert log equations to exponential form to simplify them.",
    theory_to_exam_md: "Solving equations hidden as quadratics in $e^x$."
  },
  {
    slug: "trigonometry",
    area: "P1",
    examName: "TMUA",
    title: "Trigonometry",
    explanation_md: "Exact values, identities ($\\sin^2 + \\cos^2 = 1$), solving trig equations in given ranges.",
    worked_examples: [
      {
        prompt_md: "Solve $\\sin x = 0.5$ for $0 \\le x \\le 360^{\\circ}$.",
        solution_md: "Base angle is $30^{\\circ}$. Sin is positive in 1st and 2nd quadrants. Solutions: $30^{\\circ}, 150^{\\circ}$."
      }
    ],
    mini_exercises: [
      { prompt_md: "Value of $\\tan 45^{\\circ}$?", answer_md: "1" },
      { prompt_md: "Period of $\\cos(3x)$?", answer_md: "$120^{\\circ}$ or $2\\pi/3$" }
    ],
    common_traps_md: "Dividing by $\\sin x$ without checking if $\\sin x = 0$, thereby losing solutions.",
    exam_strategy_md: "Always check the domain given in the question.",
    theory_to_exam_md: "Using identities to form quadratics in $\\cos x$ or $\\sin x$."
  },
  {
    slug: "differentiation",
    area: "P1",
    examName: "TMUA",
    title: "Differentiation",
    explanation_md: "Finding gradients, stationary points (max/min), tangents and normals.",
    worked_examples: [
      {
        prompt_md: "Find the turning points of $y = x^3 - 3x$.",
        solution_md: "$y' = 3x^2 - 3$. Set to 0: $x^2=1 \\implies x=1, -1$. $y(1)=-2, y(-1)=2$."
      }
    ],
    mini_exercises: [
      { prompt_md: "Derivative of $5x^4$?", answer_md: "$20x^3$" },
      { prompt_md: "Condition for a minimum point?", answer_md: "$y'=0$ and $y'' > 0$" }
    ],
    common_traps_md: "Confusing the gradient of the normal with the tangent.",
    exam_strategy_md: "Sketch the curve to confirm the nature of stationary points.",
    theory_to_exam_md: "Optimization problems in context."
  },
  {
    slug: "integration",
    area: "P1",
    examName: "TMUA",
    title: "Integration",
    explanation_md: "Definite and indefinite integrals. Area under a curve. Area between curves.",
    worked_examples: [
      {
        prompt_md: "Find area bounded by $y=x^2$ and x-axis from $x=0$ to $x=2$.",
        solution_md: "$\\int_0^2 x^2 dx = [\\frac{x^3}{3}]_0^2 = 8/3$."
      }
    ],
    mini_exercises: [
      { prompt_md: "Integral of $2x$?", answer_md: "$x^2 + C$" },
      { prompt_md: "What happens if you integrate below x-axis?", answer_md: "Area comes out negative." }
    ],
    common_traps_md: "Forgetting the $+ C$ in indefinite integrals.",
    exam_strategy_md: "Draw the graph. If it crosses the x-axis, integrate parts separately.",
    theory_to_exam_md: "Finding area between a line and a quadratic."
  },
  {
    slug: "graphs-transformations",
    area: "P1",
    examName: "TMUA",
    title: "Graphs & transformations",
    explanation_md: "Translations, stretches, reflections. $f(x+a)$ moves left, $f(ax)$ compresses horizontally.",
    worked_examples: [
      {
        prompt_md: "Describe transformation from $f(x)$ to $2f(x-3)$.",
        solution_md: "Translation by 3 units right, followed by a vertical stretch by scale factor 2."
      }
    ],
    mini_exercises: [
      { prompt_md: "Transformation for $f(-x)$?", answer_md: "Reflection in y-axis." },
      { prompt_md: "Move $y=x^2$ up by 4?", answer_md: "$y=x^2+4$" }
    ],
    common_traps_md: "Thinking $f(x+2)$ moves it right. It moves LEFT.",
    exam_strategy_md: "Track specific points (like the vertex) through the transformations.",
    theory_to_exam_md: "Identifying the equation of a transformed curve."
  },
  {
    slug: "number-divisibility",
    area: "P1",
    examName: "TMUA",
    title: "Number & divisibility",
    explanation_md: "Primes, factors, multiples, divisibility rules. Modular arithmetic basics.",
    worked_examples: [
      {
        prompt_md: "Show that $n^3 - n$ is divisible by 6 for any integer $n$.",
        solution_md: "$n^3-n = n(n^2-1) = (n-1)n(n+1)$. This is the product of 3 consecutive integers. At least one is even, and exactly one is divisible by 3. Thus divisible by $2 \\times 3 = 6$."
      }
    ],
    mini_exercises: [
      { prompt_md: "Divisibility rule for 9?", answer_md: "Sum of digits is divisible by 9." },
      { prompt_md: "Is 91 prime?", answer_md: "No, $7 \\times 13 = 91$." }
    ],
    common_traps_md: "Assuming a property holds for negative integers without checking.",
    exam_strategy_md: "Factoring algebraic expressions into consecutive integers is a powerful tool.",
    theory_to_exam_md: "Proof questions involving odd/even properties."
  },
  {
    slug: "combinatorics-probability",
    area: "P1",
    examName: "TMUA",
    title: "Combinatorics & probability",
    explanation_md: "Permutations, combinations, independent and mutually exclusive events.",
    worked_examples: [
      {
        prompt_md: "How many ways to arrange letters of 'APPLE'?",
        solution_md: "$5! / 2! = 120 / 2 = 60$."
      }
    ],
    mini_exercises: [
      { prompt_md: "Definition of independent events?", answer_md: "$P(A \\cap B) = P(A)P(B)$" },
      { prompt_md: "Value of $\\binom{5}{2}$?", answer_md: "10" }
    ],
    common_traps_md: "Adding probabilities instead of multiplying when events happen in sequence.",
    exam_strategy_md: "Tree diagrams are your friend for sequential probabilities.",
    theory_to_exam_md: "Complex probability scenarios requiring systematic counting."
  },

  // --- SAT Math ---
  {
    slug: "systems-inequalities",
    area: "Math",
    examName: "SAT",
    title: "Systems & inequalities",
    explanation_md: "Solving systems of linear equations and inequalities. Understand what intersection points mean and how to shade inequality regions. Use Desmos heavily here.",
    worked_examples: [
      {
        prompt_md: "Solve the system: $2x+y=5$ and $x-y=1$.",
        solution_md: "Add the two equations: $3x = 6 \\implies x=2$. Substitute back: $2(2)+y=5 \\implies y=1$."
      }
    ],
    mini_exercises: [
      { prompt_md: "Condition for a system of linear equations to have no solutions?", answer_md: "Same slope, different y-intercepts (parallel lines)." },
      { prompt_md: "How to graph $y > 2x$?", answer_md: "Dashed line at $y=2x$, shade above." }
    ],
    common_traps_md: "Forgetting to flip the inequality sign when dividing by a negative number.",
    exam_strategy_md: "Desmos: type both equations, click the intersection point. Done in 5 seconds.",
    theory_to_exam_md: "Questions asking for the value of $x+y$ given a system."
  },
  {
    slug: "right-triangle-trig",
    area: "Math",
    examName: "SAT",
    title: "Right-triangle trig",
    explanation_md: "SOH CAH TOA. In a right triangle, $\\sin(x) = \\cos(90-x)$. This complementary angle property is heavily tested on the SAT.",
    worked_examples: [
      {
        prompt_md: "If $\\sin(x) = 4/5$, what is $\\cos(90-x)$?",
        solution_md: "Because $\\sin(x) = \\cos(90-x)$, the answer is $4/5$."
      }
    ],
    mini_exercises: [
      { prompt_md: "What is $\\tan(x)$ in terms of sine and cosine?", answer_md: "$\\sin(x)/\\cos(x)$." },
      { prompt_md: "In a 3-4-5 triangle, what is the sine of the smallest angle?", answer_md: "3/5." }
    ],
    common_traps_md: "Using the wrong ratio (e.g. adjacent over hypotenuse for sine).",
    exam_strategy_md: "Whenever you see $\\sin(a) = \\cos(b)$, write $a+b = 90$.",
    theory_to_exam_md: "Direct application of the complementary angle rule."
  },
  {
    slug: "linear-equations-functions",
    area: "Math",
    examName: "SAT",
    title: "Linear equations & functions",
    explanation_md: "$y = mx + b$. Slope ($m$), y-intercept ($b$).",
    worked_examples: [
      {
        prompt_md: "Find slope between $(1,2)$ and $(3,8)$.",
        solution_md: "$m = \\frac{8-2}{3-1} = 6/2 = 3$."
      }
    ],
    mini_exercises: [
      { prompt_md: "Y-intercept of $3x+4y=12$?", answer_md: "3" },
      { prompt_md: "Meaning of slope in context?", answer_md: "Rate of change." }
    ],
    common_traps_md: "Misinterpreting the axes in word problems.",
    exam_strategy_md: "Desmos: Plot the points and fit a line.",
    theory_to_exam_md: "Word problems involving fixed costs and variable rates."
  },
  {
    slug: "nonlinear-functions-quadratics",
    area: "Math",
    examName: "SAT",
    title: "Nonlinear functions/quadratics",
    explanation_md: "Vertex form, standard form, factored form. Discriminant.",
    worked_examples: [
      {
        prompt_md: "Vertex of $y = (x-3)^2 + 4$?",
        solution_md: "$(3, 4)$"
      }
    ],
    mini_exercises: [
      { prompt_md: "Formula for x-coordinate of vertex from $ax^2+bx+c$?", answer_md: "$-b/(2a)$" },
      { prompt_md: "Condition for two real roots?", answer_md: "$b^2-4ac > 0$" }
    ],
    common_traps_md: "Sign errors in vertex form $y=a(x-h)^2+k$.",
    exam_strategy_md: "Graph it in Desmos and click the vertex.",
    theory_to_exam_md: "Finding minimum/maximum values."
  },
  {
    slug: "exponentials-polynomials",
    area: "Math",
    examName: "SAT",
    title: "Exponentials & polynomials",
    explanation_md: "Exponential growth $y = a(1+r)^t$. Polynomial operations.",
    worked_examples: [
      {
        prompt_md: "Expand $(x+2)(x-3)$.",
        solution_md: "$x^2 - x - 6$"
      }
    ],
    mini_exercises: [
      { prompt_md: "Factor $x^2-9$.", answer_md: "$(x-3)(x+3)$" },
      { prompt_md: "Growth factor for 5% increase?", answer_md: "1.05" }
    ],
    common_traps_md: "Confusing simple interest with compound interest.",
    exam_strategy_md: "Plug in a number for $t$ to verify the formula.",
    theory_to_exam_md: "Matching tables to exponential equations."
  },
  {
    slug: "radicals-rational-exponents",
    area: "Math",
    examName: "SAT",
    title: "Radicals & rational exponents",
    explanation_md: "$x^{a/b} = \\sqrt[b]{x^a}$. Rules of exponents.",
    worked_examples: [
      {
        prompt_md: "Simplify $x^{1/2} \\cdot x^{1/3}$.",
        solution_md: "$x^{5/6}$"
      }
    ],
    mini_exercises: [
      { prompt_md: "What is $8^{2/3}$?", answer_md: "4" },
      { prompt_md: "Negative exponent meaning?", answer_md: "Reciprocal." }
    ],
    common_traps_md: "Adding exponents when you should multiply them.",
    exam_strategy_md: "When in doubt, substitute $x=2$ in Desmos.",
    theory_to_exam_md: "Simplifying complex radical expressions."
  },
  {
    slug: "ratios-rates-proportions",
    area: "Math",
    examName: "SAT",
    title: "Ratios/rates/proportions",
    explanation_md: "Setting up equivalent fractions. Cross multiplication.",
    worked_examples: [
      {
        prompt_md: "If 3 apples cost $2, how much for 15 apples?",
        solution_md: "$3/2 = 15/x \\implies 3x = 30 \\implies x=10$."
      }
    ],
    mini_exercises: [
      { prompt_md: "Ratio of 20 to 50?", answer_md: "2:5" },
      { prompt_md: "Speed if 60 miles in 2 hours?", answer_md: "30 mph" }
    ],
    common_traps_md: "Mixing up units (e.g. minutes and hours).",
    exam_strategy_md: "Always write units next to your numbers to prevent errors.",
    theory_to_exam_md: "Unit conversion chains."
  },
  {
    slug: "percentages-units",
    area: "Math",
    examName: "SAT",
    title: "Percentages & units",
    explanation_md: "Percent change = (New - Old) / Old. Repeated percentage changes multiply.",
    worked_examples: [
      {
        prompt_md: "Increase $100 by 20%, then decrease by 20%.",
        solution_md: "$100 \\times 1.2 = 120$. $120 \\times 0.8 = 96$."
      }
    ],
    mini_exercises: [
      { prompt_md: "Find 15% of 80.", answer_md: "12" },
      { prompt_md: "Equation for 'x is 30% of y'.", answer_md: "$x = 0.3y$" }
    ],
    common_traps_md: "Thinking +20% then -20% puts you back where you started.",
    exam_strategy_md: "Translate English directly to Math: 'is' means $=$, 'of' means $\\times$.",
    theory_to_exam_md: "Compounding percentage changes."
  },
  {
    slug: "one-variable-statistics",
    area: "Math",
    examName: "SAT",
    title: "One-variable statistics",
    explanation_md: "Mean, median, mode, range, standard deviation.",
    worked_examples: [
      {
        prompt_md: "Median of 1, 3, 5, 7, 9?",
        solution_md: "5 (middle value)."
      }
    ],
    mini_exercises: [
      { prompt_md: "How does adding a large outlier affect mean and median?", answer_md: "Mean increases significantly, median changes slightly or not at all." },
      { prompt_md: "What does standard deviation measure?", answer_md: "Spread of data." }
    ],
    common_traps_md: "Forgetting to sort the list before finding the median.",
    exam_strategy_md: "Desmos can compute `mean([1,2,3])` and `median([1,2,3])`.",
    theory_to_exam_md: "Comparing data sets."
  },
  {
    slug: "two-variable-data-scatterplots",
    area: "Math",
    examName: "SAT",
    title: "Two-variable data & scatterplots",
    explanation_md: "Line of best fit, positive/negative association.",
    worked_examples: [
      {
        prompt_md: "If points slope downwards, what is the correlation?",
        solution_md: "Negative."
      }
    ],
    mini_exercises: [
      { prompt_md: "Meaning of y-intercept on a scatterplot?", answer_md: "Predicted value when x=0." },
      { prompt_md: "Does a line of best fit hit every point?", answer_md: "Rarely." }
    ],
    common_traps_md: "Assuming correlation implies causation.",
    exam_strategy_md: "Look at the slope of the trendline.",
    theory_to_exam_md: "Predicting values using the line of best fit."
  },
  {
    slug: "probability-inference",
    area: "Math",
    examName: "SAT",
    title: "Probability & inference",
    explanation_md: "Target outcomes / Total outcomes. Conditional probability from tables.",
    worked_examples: [
      {
        prompt_md: "Probability of rolling a 4 on a fair die?",
        solution_md: "1/6."
      }
    ],
    mini_exercises: [
      { prompt_md: "Sum of all probabilities?", answer_md: "1" },
      { prompt_md: "If probability of rain is 0.2, what is probability of no rain?", answer_md: "0.8" }
    ],
    common_traps_md: "Using the wrong total in a two-way table for conditional probability.",
    exam_strategy_md: "Circle the specific row or column requested.",
    theory_to_exam_md: "Two-way table questions."
  },
  {
    slug: "area-volume",
    area: "Math",
    examName: "SAT",
    title: "Area & volume",
    explanation_md: "Formulas are provided on the SAT. Focus on applying them and scaling.",
    worked_examples: [
      {
        prompt_md: "If side lengths of a cube double, what happens to volume?",
        solution_md: "Volume scales by $2^3 = 8$."
      }
    ],
    mini_exercises: [
      { prompt_md: "Area of a circle?", answer_md: "$\\pi r^2$" },
      { prompt_md: "Volume of a cylinder?", answer_md: "$\\pi r^2 h$" }
    ],
    common_traps_md: "Forgetting to square/cube the scale factor for area/volume.",
    exam_strategy_md: "Use the reference sheet!",
    theory_to_exam_md: "Scaling similar 3D figures."
  },
  {
    slug: "lines-angles-triangles",
    area: "Math",
    examName: "SAT",
    title: "Lines/angles/triangles",
    explanation_md: "Parallel lines, transversals, similar triangles.",
    worked_examples: [
      {
        prompt_md: "Sum of angles in a triangle?",
        solution_md: "180 degrees."
      }
    ],
    mini_exercises: [
      { prompt_md: "Vertical angles are...?", answer_md: "Equal." },
      { prompt_md: "Exterior angle of a triangle equals...?", answer_md: "Sum of the two opposite interior angles." }
    ],
    common_traps_md: "Assuming lines are parallel just because they look like it.",
    exam_strategy_md: "Draw on the diagram and fill in all angles you can find.",
    theory_to_exam_md: "Proving triangles similar to find side lengths."
  },
  {
    slug: "circles",
    area: "Math",
    examName: "SAT",
    title: "Circles",
    explanation_md: "Arc length, sector area, radians, circle equations.",
    worked_examples: [
      {
        prompt_md: "Equation of circle with center (0,0) and radius 5?",
        solution_md: "$x^2+y^2=25$."
      }
    ],
    mini_exercises: [
      { prompt_md: "Convert $\\pi$ radians to degrees.", answer_md: "180." },
      { prompt_md: "Arc length formula?", answer_md: "Radius $\\times$ central angle in radians." }
    ],
    common_traps_md: "Forgetting to complete the square to find the center.",
    exam_strategy_md: "Desmos: type the equation, find the center visually.",
    theory_to_exam_md: "Finding the radius from the general form."
  },

  // --- SAT RW ---
  {
    slug: "transitions",
    area: "RW",
    examName: "SAT",
    title: "Transitions",
    explanation_md: "Transition words link ideas. The SAT tests your ability to identify the logical relationship between two sentences: Addition (Furthermore), Contrast (However), Causation (Therefore), or Illustration (For example).",
    worked_examples: [
      {
        prompt_md: "The experiment was a success. [BLANK], the team received a bonus.",
        solution_md: "'Therefore' or 'Consequently'. The first sentence is the cause, the second is the effect."
      }
    ],
    mini_exercises: [
      { prompt_md: "What type of transition is 'Nevertheless'?", answer_md: "Contrast." },
      { prompt_md: "If two sentences present similar ideas, what transition to use?", answer_md: "Similarly, Likewise, Furthermore." }
    ],
    common_traps_md: "Choosing a transition word that sounds smart but doesn't fit the logical relationship.",
    exam_strategy_md: "Cross out the blank, read the sentences, and determine the relationship (Cause, Contrast, Continue) BEFORE looking at the options.",
    theory_to_exam_md: "Direct transition questions."
  },
  {
    slug: "central-ideas-details",
    area: "RW",
    examName: "SAT",
    title: "Central ideas & details",
    explanation_md: "Find the main point of the paragraph.",
    worked_examples: [
      {
        prompt_md: "What is a central idea?",
        solution_md: "The primary message the author wants to convey."
      }
    ],
    mini_exercises: [
      { prompt_md: "Where is the central idea often found?", answer_md: "First or last sentence of a paragraph." },
      { prompt_md: "Should you pick a true detail or the main point?", answer_md: "The main point." }
    ],
    common_traps_md: "Picking a choice that is true according to the text but is merely a supporting detail.",
    exam_strategy_md: "Summarize the text in your own words before looking at choices.",
    theory_to_exam_md: "Main idea questions."
  },
  {
    slug: "command-of-evidence-textual",
    area: "RW",
    examName: "SAT",
    title: "Command of evidence (textual)",
    explanation_md: "Selecting a quote that supports a given claim.",
    worked_examples: [
      {
        prompt_md: "If claim is 'The character was tired', which quote supports it?",
        solution_md: "'He could barely keep his eyes open.'"
      }
    ],
    mini_exercises: [
      { prompt_md: "Must the quote directly relate to the specific claim?", answer_md: "Yes." },
      { prompt_md: "Is a tangential quote acceptable?", answer_md: "No." }
    ],
    common_traps_md: "Picking a quote that sounds relevant to the general topic but doesn't prove the specific claim.",
    exam_strategy_md: "Underline the exact claim in the question stem.",
    theory_to_exam_md: "Support/weaken questions."
  },
  {
    slug: "command-of-evidence-quantitative",
    area: "RW",
    examName: "SAT",
    title: "Command of evidence (quantitative)",
    explanation_md: "Reading charts/graphs to support a claim.",
    worked_examples: [
      {
        prompt_md: "Chart shows a rise in sales. Claim: Sales fell.",
        solution_md: "Chart contradicts the claim."
      }
    ],
    mini_exercises: [
      { prompt_md: "Do you need advanced math?", answer_md: "No, just reading the data accurately." },
      { prompt_md: "Should you ignore the axes labels?", answer_md: "Never." }
    ],
    common_traps_md: "Misreading the scale or legend of the graph.",
    exam_strategy_md: "Verify every data point mentioned in an answer choice.",
    theory_to_exam_md: "Graph-based questions."
  },
  {
    slug: "inferences",
    area: "RW",
    examName: "SAT",
    title: "Inferences",
    explanation_md: "Drawing a logical conclusion based ONLY on the text.",
    worked_examples: [
      {
        prompt_md: "Text says: 'Only employees can enter.' You are not an employee.",
        solution_md: "Inference: You cannot enter."
      }
    ],
    mini_exercises: [
      { prompt_md: "Can you bring in outside knowledge?", answer_md: "No." },
      { prompt_md: "Are extreme words like 'always' good in inferences?", answer_md: "Usually bad." }
    ],
    common_traps_md: "Making leaps of logic not strictly supported by the text.",
    exam_strategy_md: "Stick as close to the text as possible.",
    theory_to_exam_md: "'Which choice most logically completes the text?'"
  },
  {
    slug: "words-in-context",
    area: "RW",
    examName: "SAT",
    title: "Words in context",
    explanation_md: "Choosing the right vocabulary word for the blank based on surrounding clues.",
    worked_examples: [
      {
        prompt_md: "The puzzle was so [BLANK] that it took days to solve.",
        solution_md: "'complex' or 'difficult'."
      }
    ],
    mini_exercises: [
      { prompt_md: "Should you use your own word first?", answer_md: "Yes." },
      { prompt_md: "Does the SAT test secondary meanings?", answer_md: "Often." }
    ],
    common_traps_md: "Choosing the primary definition of a word when the context demands a secondary one.",
    exam_strategy_md: "Look for synonyms or antonyms embedded in the same sentence.",
    theory_to_exam_md: "Vocabulary blanks."
  },
  {
    slug: "text-structure-purpose",
    area: "RW",
    examName: "SAT",
    title: "Text structure & purpose",
    explanation_md: "Understanding why the author wrote the text and how it is organized.",
    worked_examples: [
      {
        prompt_md: "If author lists historical facts then gives an opinion, what is the structure?",
        solution_md: "Presents context then offers a perspective."
      }
    ],
    mini_exercises: [
      { prompt_md: "What is 'purpose'?", answer_md: "The reason the text exists." },
      { prompt_md: "What is 'structure'?", answer_md: "How it is built." }
    ],
    common_traps_md: "Confusing what the text says (content) with why it says it (purpose).",
    exam_strategy_md: "Focus on the verbs in the answer choices (e.g., 'to critique', 'to explain').",
    theory_to_exam_md: "Overall purpose questions."
  },
  {
    slug: "cross-text-connections",
    area: "RW",
    examName: "SAT",
    title: "Cross-text connections",
    explanation_md: "Comparing two texts on the same topic.",
    worked_examples: [
      {
        prompt_md: "Text 1 praises a movie. Text 2 criticizes it.",
        solution_md: "They disagree on the quality of the movie."
      }
    ],
    mini_exercises: [
      { prompt_md: "What is the key to these?", answer_md: "Finding the point of overlap." },
      { prompt_md: "Do you need to understand both fully?", answer_md: "Yes." }
    ],
    common_traps_md: "Answering based on only one of the texts.",
    exam_strategy_md: "Determine the main idea of each text separately before comparing.",
    theory_to_exam_md: "Paired passage questions."
  },
  {
    slug: "rhetorical-synthesis",
    area: "RW",
    examName: "SAT",
    title: "Rhetorical synthesis",
    explanation_md: "Using bullet points to achieve a specific goal.",
    worked_examples: [
      {
        prompt_md: "Goal: Emphasize the speed of the animal.",
        solution_md: "Pick the bullet point that mentions '70 mph'."
      }
    ],
    mini_exercises: [
      { prompt_md: "Do you need to read all bullets?", answer_md: "Often no, just focus on the goal." },
      { prompt_md: "Should the answer introduce new info?", answer_md: "No." }
    ],
    common_traps_md: "Picking a choice that accurately summarizes all bullets but ignores the specific goal requested.",
    exam_strategy_md: "Underline the specific goal in the prompt. Ignore choices that don't serve that goal.",
    theory_to_exam_md: "Bullet point questions."
  },
  {
    slug: "boundaries-punctuation",
    area: "RW",
    examName: "SAT",
    title: "Boundaries (punctuation)",
    explanation_md: "Periods, semicolons, colons, dashes, and commas.",
    worked_examples: [
      {
        prompt_md: "When to use a semicolon?",
        solution_md: "Between two independent clauses."
      }
    ],
    mini_exercises: [
      { prompt_md: "What comes before a colon?", answer_md: "An independent clause." },
      { prompt_md: "Can a comma separate two independent clauses?", answer_md: "Only with a FANBOYS conjunction." }
    ],
    common_traps_md: "Using a comma splice (two sentences joined by just a comma).",
    exam_strategy_md: "Identify the subject and verb of every clause to see if it's independent.",
    theory_to_exam_md: "Punctuation questions."
  },
  {
    slug: "form-structure-sense-grammar",
    area: "RW",
    examName: "SAT",
    title: "Form/structure/sense (grammar)",
    explanation_md: "Subject-verb agreement, pronoun antecedent, verb tense.",
    worked_examples: [
      {
        prompt_md: "The group of students [is/are] here.",
        solution_md: "'is', because 'group' is singular."
      }
    ],
    mini_exercises: [
      { prompt_md: "Singular or plural: 'Each of the dogs'?", answer_md: "Singular." },
      { prompt_md: "Past or present: 'Yesterday, he [run]'?", answer_md: "ran" }
    ],
    common_traps_md: "Getting distracted by prepositional phrases between the subject and the verb.",
    exam_strategy_md: "Cross out prepositional phrases to find the true subject.",
    theory_to_exam_md: "Grammar questions."
  }
];

export function getTheory(examName: "TMUA" | "SAT", subtopic: string): TheoryContent | undefined {
  const targetSlug = slugify(subtopic);
  return THEORY_DB.find(t => t.examName === examName && t.slug === targetSlug);
}
