export interface DesmosQuestion {
  prompt_md: string;
  choices?: string[];
  correct_answer: string;
  reveal_md: string;
}

export interface DesmosLesson {
  slug: string;
  n: number;
  title: string;
  explanation_md: string;
  desmos_state_json: string;
  try_it_md: string;
  questions: DesmosQuestion[];
}

export const DESMOS_LESSONS: DesmosLesson[] = [
  {
    slug: "1-basics-setup",
    n: 1,
    title: "Basics & setup",
    explanation_md: "Desmos is built into the digital SAT. It is your most powerful tool. You don't need a standalone calculator. You can type expressions, use functions, and zoom in/out of the graph. Ensure your calculator is set to **Degrees** for most geometry questions, or **Radians** if the question uses $\\pi$.",
    desmos_state_json: JSON.stringify({
      graph: { degreeMode: true },
      expressions: { list: [{ id: "1", latex: "\\sin(30)" }] }
    }),
    try_it_md: "Try changing `\\sin(30)` to `\\cos(60)` and notice the output.",
    questions: [
      {
        prompt_md: "What is $\\tan(45^{\\circ})$?",
        choices: ["0", "0.5", "1", "undefined"],
        correct_answer: "1",
        reveal_md: "Type `\\tan(45)`. Since the calculator is in degree mode, it returns `1`."
      }
    ]
  },
  {
    slug: "2-solve-any-equation-graphically",
    n: 2,
    title: "Solve any equation graphically",
    explanation_md: "If you have an equation like $3x + 5 = 20$, you don't need to do algebra! Just type it directly into Desmos. Desmos will draw a vertical line at the $x$-value that makes the equation true. Click on the line to see the $x$-intercept.",
    desmos_state_json: JSON.stringify({
      expressions: { list: [{ id: "1", latex: "3x+5=20" }] }
    }),
    try_it_md: "Click on the vertical line graphed to find the $x$-intercept. It should be at $x=5$.",
    questions: [
      {
        prompt_md: "Solve for $x$: $2(x-4) + 3x = 7x - 12$.",
        choices: ["2", "4", "-2", "No solution"],
        correct_answer: "2",
        reveal_md: "Type `2(x-4)+3x=7x-12` exactly as written. Desmos graphs a vertical line at $x=2$."
      }
    ]
  },
  {
    slug: "3-systems-intersections",
    n: 3,
    title: "Systems (intersections)",
    explanation_md: "To solve a system of linear equations, type both equations on separate lines. Look for where the lines cross. Click the intersection point to reveal the $(x, y)$ coordinate.",
    desmos_state_json: JSON.stringify({
      expressions: { list: [{ id: "1", latex: "y=2x-3" }, { id: "2", latex: "x+y=9" }] }
    }),
    try_it_md: "Find the intersection point of the two lines shown.",
    questions: [
      {
        prompt_md: "If $y = 3x - 1$ and $2x + y = 14$, what is the value of $y$?",
        choices: ["3", "5", "8", "10"],
        correct_answer: "8",
        reveal_md: "Type `y=3x-1` on line 1, and `2x+y=14` on line 2. The intersection is $(3, 8)$. The question asks for $y$, so the answer is 8."
      }
    ]
  },
  {
    slug: "4-quadratics-parabolas",
    n: 4,
    title: "Quadratics/parabolas (vertex/roots/axis)",
    explanation_md: "Finding roots (x-intercepts) and the vertex (minimum or maximum) of a quadratic is effortless. Type the equation $y = ax^2 + bx + c$. Desmos automatically highlights the vertex and the roots as clickable gray dots.",
    desmos_state_json: JSON.stringify({
      expressions: { list: [{ id: "1", latex: "y=x^2-6x+5" }] }
    }),
    try_it_md: "Click the parabola to reveal its vertex and x-intercepts.",
    questions: [
      {
        prompt_md: "What is the minimum value of $f(x) = x^2 - 8x + 20$?",
        choices: ["4", "16", "20", "2"],
        correct_answer: "4",
        reveal_md: "Type `f(x) = x^2 - 8x + 20`. Click the vertex, which is $(4, 4)$. The minimum value (the y-coordinate) is 4."
      }
    ]
  },
  {
    slug: "5-parameter-problems-slider",
    n: 5,
    title: "Parameter problems with a SLIDER",
    explanation_md: "If a problem has an unknown constant like $k$ or $c$, type the equation and add a slider for the constant. Move the slider to see how the graph changes. This is incredible for 'how many solutions' questions.",
    desmos_state_json: JSON.stringify({
      expressions: { 
        list: [
          { id: "1", latex: "y=x^2+kx+9" },
          { id: "2", latex: "k=6", slider: { min: "-10", max: "10" } }
        ] 
      }
    }),
    try_it_md: "Drag the slider for $k$. For what values of $k$ does the parabola touch the x-axis exactly once?",
    questions: [
      {
        prompt_md: "For what positive value of $k$ does $x^2 + kx + 16 = 0$ have exactly one real solution?",
        choices: ["4", "8", "16", "32"],
        correct_answer: "8",
        reveal_md: "Type `y=x^2+kx+16` and add a slider for $k$. Adjust $k$ until the parabola's vertex touches the x-axis exactly once. This happens at $k=8$ (and $k=-8$)."
      }
    ]
  },
  {
    slug: "6-tables-modelling",
    n: 6,
    title: "Tables & modelling",
    explanation_md: "You can input data points using a table. Click the `+` button in Desmos, select Table, and type in your $x_1$ and $y_1$ values. Desmos plots them instantly.",
    desmos_state_json: JSON.stringify({
      expressions: {
        list: [
          { id: "1", type: "table", columns: [
            { latex: "x_1", values: ["1", "2", "3", "4"] },
            { latex: "y_1", values: ["5", "10", "20", "40"] }
          ]}
        ]
      }
    }),
    try_it_md: "Add the point (5, 80) to the table.",
    questions: [
      {
        prompt_md: "Does the table show linear or exponential growth?",
        choices: ["Linear", "Exponential"],
        correct_answer: "Exponential",
        reveal_md: "Looking at the graphed points, they curve upwards steeply. The y-values are doubling every step, which is exponential growth."
      }
    ]
  },
  {
    slug: "7-regression-line-of-best-fit",
    n: 7,
    title: "Regression/line of best fit",
    explanation_md: "After making a table with $x_1$ and $y_1$, you can find the line of best fit by typing `y_1 ~ m x_1 + b`. The tilde `~` tells Desmos to run a regression. Desmos will calculate the $m$ (slope) and $b$ (y-intercept) for you!",
    desmos_state_json: JSON.stringify({
      expressions: {
        list: [
          { id: "1", type: "table", columns: [
            { latex: "x_1", values: ["1", "2", "3", "5"] },
            { latex: "y_1", values: ["2.1", "3.8", "6.2", "9.9"] }
          ]},
          { id: "2", latex: "y_1 \\sim m x_1 + b" }
        ]
      }
    }),
    try_it_md: "Look at the values of $m$ and $b$ calculated by Desmos below the expression.",
    questions: [
      {
        prompt_md: "Based on the regression, what is the approximate slope ($m$)?",
        choices: ["1.5", "2.0", "2.5", "3.0"],
        correct_answer: "2.0",
        reveal_md: "Desmos shows the parameter $m$ is approximately 2.01."
      }
    ]
  },
  {
    slug: "8-inequalities-regions",
    n: 8,
    title: "Inequalities & regions (shading)",
    explanation_md: "If you need to graph an inequality like $y > 2x + 1$, type it directly. Desmos shades the correct region. For systems of inequalities, type both on separate lines and look for the overlapping darker shaded region.",
    desmos_state_json: JSON.stringify({
      expressions: { list: [{ id: "1", latex: "y > 2x-3" }, { id: "2", latex: "y \\le -x+4" }] }
    }),
    try_it_md: "Identify the region where both inequalities overlap.",
    questions: [
      {
        prompt_md: "Is the point $(0, 5)$ a solution to the system?",
        choices: ["Yes", "No"],
        correct_answer: "No",
        reveal_md: "Plot $(0, 5)$ in Desmos. Notice it falls outside the double-shaded region (it fails $y \\le -x+4$)."
      }
    ]
  },
  {
    slug: "9-statistics",
    n: 9,
    title: "Statistics (mean,median,stdev,total,lists)",
    explanation_md: "Desmos can do stats! You can assign a list to a variable, like `L = [1, 5, 8, 12]`. Then use commands like `mean(L)`, `median(L)`, `stdev(L)`, or `total(L)`.",
    desmos_state_json: JSON.stringify({
      expressions: { list: [{ id: "1", latex: "L=[4, 8, 15, 16, 23, 42]" }, { id: "2", latex: "mean(L)" }, { id: "3", latex: "median(L)" }] }
    }),
    try_it_md: "Add the value `100` to list $L$ and watch the mean and median update.",
    questions: [
      {
        prompt_md: "If a dataset has values 10, 20, 30, 40, 50, what is its median?",
        choices: ["20", "30", "40", "50"],
        correct_answer: "30",
        reveal_md: "Type `median([10, 20, 30, 40, 50])`. Desmos outputs 30."
      }
    ]
  },
  {
    slug: "10-restricting-domain",
    n: 10,
    title: "Restricting domain",
    explanation_md: "Sometimes you only care about a specific interval. You can restrict the domain using curly braces. For example, `y = x^2 {0 < x < 5}` will only draw the parabola for $x$ between 0 and 5.",
    desmos_state_json: JSON.stringify({
      expressions: { list: [{ id: "1", latex: "y = -x^2 + 10x \\{0 < x < 10\\}" }] }
    }),
    try_it_md: "Change the restriction to `{2 < x < 8}` and see the graph truncate.",
    questions: [
      {
        prompt_md: "How many x-intercepts does $y = x^2 - 4 \\{ x > 0 \\}$ have?",
        choices: ["0", "1", "2", "3"],
        correct_answer: "1",
        reveal_md: "Type `y = x^2 - 4 {x > 0}`. Without restriction, there are two intercepts (2 and -2). With the restriction, only $x=2$ is graphed, so there is exactly 1."
      }
    ]
  },
  {
    slug: "11-when-not-to-use-desmos",
    n: 11,
    title: "WHEN NOT to use Desmos (judgment)",
    explanation_md: "Desmos is powerful but can be slower than basic algebra for trivial questions. For example, 'If $x=3$, what is $2x+1$?' is faster in your head. Also, Desmos struggles with extreme zooming (e.g. slopes of 0.000001) or very complex algebraic restructuring where an analytical rule is faster.",
    desmos_state_json: JSON.stringify({
      expressions: { list: [{ id: "1", latex: "y=x" }] }
    }),
    try_it_md: "Reflect on when you should trust algebra over graphing.",
    questions: [
      {
        prompt_md: "Which of the following is faster to do mentally rather than typing into Desmos?",
        choices: ["Finding intersections of two complex parabolas", "Solving $2x = 10$", "Running linear regression", "Finding standard deviation"],
        correct_answer: "Solving $2x = 10$",
        reveal_md: "You know $x=5$ instantly. Typing it wastes 5-10 seconds."
      }
    ]
  },
  {
    slug: "speed-drills",
    n: 12,
    title: "Speed Drills",
    explanation_md: "Practice makes perfect. Complete these 3 drills using Desmos as fast as possible.",
    desmos_state_json: JSON.stringify({ expressions: { list: [] } }),
    try_it_md: "Clear your Desmos workspace before starting.",
    questions: [
      {
        prompt_md: "Solve $5x - 7 = 3x + 11$.",
        choices: ["6", "9", "12", "15"],
        correct_answer: "9",
        reveal_md: "Type `5x-7=3x+11`, click vertical line -> $x=9$."
      },
      {
        prompt_md: "Minimum of $y = x^2 - 12x + 40$?",
        choices: ["4", "6", "16", "40"],
        correct_answer: "4",
        reveal_md: "Type it, click vertex $(6, 4)$. Min value is 4."
      },
      {
        prompt_md: "Intersection of $y=4x-2$ and $y=-x+8$?",
        choices: ["(2, 6)", "(3, 5)", "(4, 4)", "(2, 8)"],
        correct_answer: "(2, 6)",
        reveal_md: "Type both, click intersection point -> $(2, 6)$."
      }
    ]
  }
];
