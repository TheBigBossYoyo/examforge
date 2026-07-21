/**
 * Resource & paper seed (section E). LINKS + METADATA ONLY.
 *
 * COPYRIGHT (section K): we store metadata and link out. The only directly
 * seeded PDFs are the official free UAT-UK TMUA files. For MAT/STEP/AEA/UKMT we
 * seed official INDEX pages only. Every row carries the standard license note.
 */

export const LICENSE_NOTE =
  "Official source — open the link; contents are not redistributed by this app.";

export interface SeedResource {
  exam: "TMUA" | "SAT";
  title: string;
  url: string;
  type:
    | "past_paper"
    | "spec"
    | "notes"
    | "theory"
    | "questionbank"
    | "video"
    | "tool"
    | "dates";
  cost: "free" | "paid";
  has_solutions: boolean;
  relevance?: number;
  difficulty?: string;
  topic_tags?: string[];
  note?: string;
  source_name: string;
  source_type: "official" | "adjacent";
}

/** A TMUA past-paper year bundle (five official PDFs). */
export interface TmuaYear {
  year: number;
  label: string;
  p1: string;
  p1Worked: string;
  p2: string;
  p2Worked: string;
  key: string;
  note?: string;
}

const PREP_HUB = "https://esat-tmua.ac.uk/tmua-preparation-materials/";

export const TMUA_YEARS: TmuaYear[] = [
  {
    year: 2016,
    label: "2016",
    p1: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07125112/TMUA-2016-paper-1.pdf",
    p1Worked:
      "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07125113/TMUA-2016-paper-1-worked-answers.pdf",
    p2: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07125102/TMUA-2016-paper-2.pdf",
    p2Worked:
      "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07125106/TMUA-2016-paper-2-worked-answers.pdf",
    key: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07125113/TMUA-2016-answer-keys.pdf",
  },
  {
    year: 2017,
    label: "2017",
    p1: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07125230/TMUA-2017-paper-1.pdf",
    p1Worked:
      "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07125231/TMUA-2017-paper-1-worked-answers.pdf",
    p2: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07125224/TMUA-2017-paper-2.pdf",
    p2Worked:
      "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07125228/TMUA-2017-paper-2-worked-answers.pdf",
    key: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07125232/TMUA-2017-answer-keys.pdf",
  },
  {
    year: 2018,
    label: "2018",
    p1: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07125407/TMUA-2018-paper-1.pdf",
    p1Worked:
      "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07125413/TMUA-2018-paper-1-worked-answers.pdf",
    p2: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07125404/TMUA-2018-paper-2.pdf",
    p2Worked:
      "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07125406/TMUA-2018-paper-2-worked-answers.pdf",
    key: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07125413/TMUA-2018-answer-keys.pdf",
  },
  {
    year: 2019,
    label: "2019",
    p1: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07140825/TMUA-2019-paper-1.pdf",
    p1Worked:
      "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07140826/TMUA-2019-paper-1-worked-answers.pdf",
    p2: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07140823/TMUA-2019-paper-2.pdf",
    p2Worked:
      "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07140824/TMUA-2019-paper-2-worked-answers.pdf",
    key: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07140827/TMUA-2019-answer-keys.pdf",
  },
  {
    year: 2020,
    label: "2020",
    p1: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07140953/TMUA-2020-paper-1.pdf",
    p1Worked:
      "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07140955/TMUA-2020-paper-1-worked-answers.pdf",
    p2: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07140951/TMUA-2020-paper-2.pdf",
    p2Worked:
      "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07140952/TMUA-2020-paper-2-worked-answers.pdf",
    key: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07140956/TMUA-2020-answer-keys.pdf",
  },
  {
    year: 2021,
    label: "2021",
    p1: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07141119/TMUA-2021-paper-1.pdf",
    p1Worked:
      "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07141121/TMUA-2021-paper-1-worked-answers.pdf",
    p2: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07141117/TMUA-2021-paper-2.pdf",
    p2Worked:
      "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07141118/TMUA-2021-paper-2-worked-answers.pdf",
    key: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07141122/TMUA-2021-answer-keys.pdf",
  },
  {
    year: 2022,
    label: "2022",
    p1: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07141241/TMUA-2022-paper-1.pdf",
    p1Worked:
      "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/06/04105226/TMUA-2022-paper-1-worked-answers.pdf",
    p2: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07141239/TMUA-2022-paper-2.pdf",
    p2Worked:
      "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/06/04105227/TMUA-2022-paper-2-worked-answers.pdf",
    key: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07141242/TMUA-2022-answer-keys.pdf",
  },
  {
    year: 2023,
    label: "2023",
    p1: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/04/30144109/TMUA-2023-paper-1.pdf",
    p1Worked:
      "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/06/04105227/TMUA-2023-paper-1-worked-answers.pdf",
    p2: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/04/30144111/TMUA-2023-paper-2.pdf",
    p2Worked:
      "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/06/04105226/TMUA-2023-paper-2-worked-answers.pdf",
    key: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/04/30144123/TMUA-2023-answer-keys.pdf",
  },
  {
    year: 2015,
    label: "Early specimen",
    note: "Early specimen paper",
    p1: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07141417/TMUA-early-specimen-paper-1.pdf",
    p1Worked:
      "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07141418/TMUA-early-specimen-paper-1-worked-answers.pdf",
    p2: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07141413/TMUA-early-specimen-paper-2.pdf",
    p2Worked:
      "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07141415/TMUA-early-specimen-paper-2-worked-answers.pdf",
    key: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07141414/TMUA-early-specimen-paper-answer-keys.pdf",
  },
];

export { PREP_HUB };

/** Static resources (everything except the generated TMUA past-paper rows). */
export const STATIC_RESOURCES: SeedResource[] = [
  // ---------------- TMUA OFFICIAL DOCS ----------------
  {
    exam: "TMUA",
    title: "TMUA Specification (April 2025)",
    url: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2025/04/30103002/TMUA_Content_Specification_April2025.pdf",
    type: "spec",
    cost: "free",
    has_solutions: false,
    relevance: 5,
    source_name: "UAT-UK Official",
    source_type: "official",
  },
  {
    exam: "TMUA",
    title: "Notes on Mathematics (TMUA & ESAT M2, June 2025)",
    url: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2025/06/25160446/Notes_on_Mathematics_for_TMUA_and-ESAT_M2_June2025.pdf",
    type: "notes",
    cost: "free",
    has_solutions: false,
    relevance: 5,
    source_name: "UAT-UK Official",
    source_type: "official",
  },
  {
    exam: "TMUA",
    title: "Notes on Logic and Proof (Paper 2, June 2025)",
    url: "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2025/06/25160507/Notes_on_Logic_and_Proof_June2025.pdf",
    type: "notes",
    cost: "free",
    has_solutions: false,
    relevance: 5,
    source_name: "UAT-UK Official",
    source_type: "official",
  },
  {
    exam: "TMUA",
    title: "TMUA Preparation hub",
    url: PREP_HUB,
    type: "theory",
    cost: "free",
    has_solutions: false,
    relevance: 5,
    source_name: "UAT-UK Official",
    source_type: "official",
  },
  {
    exam: "TMUA",
    title: "TMUA Prepare page",
    url: "https://esat-tmua.ac.uk/prepare/",
    type: "theory",
    cost: "free",
    has_solutions: false,
    relevance: 5,
    source_name: "UAT-UK Official",
    source_type: "official",
  },
  {
    exam: "TMUA",
    title: "Pearson VUE TMUA timed practice (real test interface)",
    url: "https://www.pearsonvue.com/us/en/uatuk.html",
    type: "tool",
    cost: "free",
    has_solutions: false,
    relevance: 5,
    source_name: "Pearson VUE",
    source_type: "official",
  },

  // ---------------- TMUA-ADJACENT (index pages only) ----------------
  {
    exam: "TMUA",
    title: "MAT (Oxford Mathematics Admissions Test) — papers & solutions",
    url: "https://www.maths.ox.ac.uk/study-here/undergraduate-study/maths-admissions-test",
    type: "past_paper",
    cost: "free",
    has_solutions: true,
    relevance: 4,
    note: "Discontinued 2025. Q1 = 10 MCQs is the most TMUA-like. Papers 2007–2024 + 1996–2006 precursor + syllabus.",
    source_name: "Oxford Mathematics (MAT)",
    source_type: "adjacent",
  },
  {
    exam: "TMUA",
    title: "STEP Support Programme (Cambridge)",
    url: "https://maths.org/step/",
    type: "theory",
    cost: "free",
    has_solutions: true,
    relevance: 3,
    note: "Foundation modules + hints + solutions. Favour foundation/easier items.",
    source_name: "STEP Support Programme",
    source_type: "adjacent",
  },
  {
    exam: "TMUA",
    title: "STEP Question Database (searchable; filter 'C1')",
    url: "https://step.maths.org/questions",
    type: "questionbank",
    cost: "free",
    has_solutions: true,
    relevance: 3,
    source_name: "STEP Support Programme",
    source_type: "adjacent",
  },
  {
    exam: "TMUA",
    title: "OCR STEP (official papers 2014+ & spec)",
    url: "https://www.ocr.org.uk/administration/step-mathematics/",
    type: "past_paper",
    cost: "free",
    has_solutions: true,
    relevance: 3,
    source_name: "OCR STEP",
    source_type: "adjacent",
  },
  {
    exam: "TMUA",
    title: "Worked STEP papers",
    url: "https://maths.org/step/worked-step-papers",
    type: "theory",
    cost: "free",
    has_solutions: true,
    relevance: 3,
    source_name: "STEP Support Programme",
    source_type: "adjacent",
  },
  {
    exam: "TMUA",
    title: "AEA Mathematics (Pearson Edexcel)",
    url: "https://qualifications.pearson.com/en/qualifications/edexcel-a-levels/advanced-extension-award-mathematics-2018.html",
    type: "past_paper",
    cost: "free",
    has_solutions: true,
    relevance: 3,
    note: "Pure depth + mark schemes.",
    source_name: "Pearson Edexcel AEA",
    source_type: "adjacent",
  },
  {
    exam: "TMUA",
    title: "AEA / Edexcel past-paper search",
    url: "https://qualifications.pearson.com/en/support/support-topics/exams/past-papers.html",
    type: "past_paper",
    cost: "free",
    has_solutions: true,
    relevance: 3,
    source_name: "Pearson Edexcel",
    source_type: "adjacent",
  },
  {
    exam: "TMUA",
    title: "UKMT competition papers hub",
    url: "https://ukmt.org.uk/competition-papers",
    type: "past_paper",
    cost: "free",
    has_solutions: true,
    relevance: 3,
    source_name: "UKMT",
    source_type: "adjacent",
  },
  {
    exam: "TMUA",
    title: "UKMT Senior Mathematical Challenge (25 MCQ / 90 min)",
    url: "https://ukmt.org.uk/senior-challenges/senior-mathematical-challenge",
    type: "past_paper",
    cost: "free",
    has_solutions: true,
    relevance: 4,
    note: "Closest TMUA speed analogue.",
    source_name: "UKMT",
    source_type: "adjacent",
  },
  {
    exam: "TMUA",
    title: "British Mathematical Olympiad",
    url: "https://bmos.ukmt.org.uk/home/bmo.shtml",
    type: "past_paper",
    cost: "free",
    has_solutions: true,
    relevance: 2,
    source_name: "UKMT / BMO",
    source_type: "adjacent",
  },
  {
    exam: "TMUA",
    title: "Mathsaurus (official-link aggregator + free video solutions)",
    url: "https://mathsaurus.com/",
    type: "video",
    cost: "free",
    has_solutions: true,
    relevance: 3,
    source_name: "Mathsaurus",
    source_type: "adjacent",
  },
  {
    exam: "TMUA",
    title: "NRICH (problem-solving)",
    url: "https://nrich.maths.org/",
    type: "theory",
    cost: "free",
    has_solutions: false,
    relevance: 2,
    source_name: "NRICH",
    source_type: "adjacent",
  },

  // ---------------- SAT OFFICIAL ----------------
  {
    exam: "SAT",
    title: "Bluebook app (full-length adaptive practice tests)",
    url: "https://bluebook.collegeboard.org/students",
    type: "tool",
    cost: "free",
    has_solutions: true,
    relevance: 5,
    source_name: "College Board",
    source_type: "official",
  },
  {
    exam: "SAT",
    title: "My Practice (scores + wrong-answer review)",
    url: "https://mypractice.collegeboard.org",
    type: "tool",
    cost: "free",
    has_solutions: true,
    relevance: 5,
    source_name: "College Board",
    source_type: "official",
  },
  {
    exam: "SAT",
    title: "Official Digital SAT Prep on Khan Academy",
    url: "https://satsuite.collegeboard.org/practice/khan-academy",
    type: "theory",
    cost: "free",
    has_solutions: true,
    relevance: 5,
    note: "Foundations / Medium / Advanced.",
    source_name: "College Board × Khan Academy",
    source_type: "official",
  },
  {
    exam: "SAT",
    title: "SAT Suite Question Bank (3,500+ official questions)",
    url: "https://satsuitequestionbank.collegeboard.org/",
    type: "questionbank",
    cost: "free",
    has_solutions: true,
    relevance: 5,
    note: "Exportable. Import your own selections via the Admin importer.",
    source_name: "College Board",
    source_type: "official",
  },
  {
    exam: "SAT",
    title: "SAT practice hub",
    url: "https://satsuite.collegeboard.org/practice",
    type: "theory",
    cost: "free",
    has_solutions: true,
    relevance: 5,
    source_name: "College Board",
    source_type: "official",
  },
  {
    exam: "SAT",
    title: "SAT dates & deadlines (confirm Aug 2026 date)",
    url: "https://satsuite.collegeboard.org/sat/dates-deadlines",
    type: "dates",
    cost: "free",
    has_solutions: false,
    relevance: 5,
    source_name: "College Board",
    source_type: "official",
  },
  {
    exam: "SAT",
    title: "Digital SAT Specifications Overview (PDF)",
    url: "https://satsuite.collegeboard.org/media/pdf/digital-sat-test-spec-overview.pdf",
    type: "spec",
    cost: "free",
    has_solutions: false,
    relevance: 5,
    source_name: "College Board",
    source_type: "official",
  },
  {
    exam: "SAT",
    title: "Assessment Framework for the Digital SAT Suite (full spec PDF)",
    url: "https://satsuite.collegeboard.org/media/pdf/assessment-framework-for-digital-sat-suite.pdf",
    type: "spec",
    cost: "free",
    has_solutions: false,
    relevance: 5,
    source_name: "College Board",
    source_type: "official",
  },
  {
    exam: "SAT",
    title: "SAT Math classroom-practice/theory (PDF)",
    url: "https://satsuite.collegeboard.org/media/pdf/sat-suite-classroom-practice-math.pdf",
    type: "theory",
    cost: "free",
    has_solutions: true,
    relevance: 4,
    source_name: "College Board",
    source_type: "official",
  },
  {
    exam: "SAT",
    title: "Desmos Graphing Calculator (practise the tool)",
    url: "https://www.desmos.com/calculator",
    type: "tool",
    cost: "free",
    has_solutions: false,
    relevance: 5,
    source_name: "Desmos",
    source_type: "official",
  },
  {
    exam: "SAT",
    title: "Desmos Graphing Calculator API docs (for the embed)",
    url: "https://www.desmos.com/api/v1.10/docs/index.html",
    type: "tool",
    cost: "free",
    has_solutions: false,
    relevance: 4,
    source_name: "Desmos",
    source_type: "official",
  },
];
