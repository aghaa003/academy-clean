import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { CheckCircle, Clock, Trash2, ChevronRight, Loader2, XCircle, Star, Upload, X, Lock, Eye } from "lucide-react";
import { useCurrentUser } from "@/lib/auth-context";
import { Link } from "wouter";
import { apiFetch } from "@/lib/api-fetch";
import { MermaidDiagram } from "@/components/MermaidDiagram";

const PROJ_LANG_KEYWORDS: Record<string, string[]> = {
  "C": ["int", "printf", "scanf", "return", "main", "for", "while", "if", "include"],
  "C++": ["int", "cout", "cin", "return", "main", "class", "vector", "namespace", "include"],
  "C#": ["console", "class", "void", "using", "namespace", "static", "main"],
  "SQL": ["select", "from", "where", "insert", "update", "delete", "create", "table"],
  "MySQL": ["select", "from", "where", "create", "table", "insert", "join"],
  "CS50": ["int", "printf", "main", "string", "return", "for", "while"],
  "HTML": ["html", "body", "div", "head", "style", "form", "input"],
  "CSS": ["color", "background", "display", "flex", "margin", "padding"],
  "JavaScript": ["function", "const", "let", "var", "return", "document", "console"],
  "React": ["import", "usestate", "useeffect", "return", "component", "props"],
  "Tailwind CSS": ["flex", "grid", "text", "bg", "rounded", "p-", "shadow"],
  "Bootstrap": ["container", "row", "col", "btn", "navbar", "card"],
  "Angular": ["component", "ngmodule", "injectable", "constructor", "import"],
  "Vue.js": ["template", "data", "methods", "computed", "v-for", "v-if"],
  "Laravel": ["route", "controller", "model", "php", "public", "return"],
  "PHP": ["php", "echo", "function", "array", "return", "$"],
  "Node.js": ["require", "module", "const", "http", "fs", "app", "express"],
  "Python": ["def", "import", "print", "return", "for", "while", "if", "class"],
  "MongoDB": ["db", "find", "insert", "aggregate", "match", "group"],
  "Express.js": ["express", "router", "req", "res", "app", "const"],
  "Next.js": ["export", "default", "function", "import", "page", "router"],
  "ASP.NET": ["using", "namespace", "public", "class", "controller", "async"],
  "Django": ["django", "import", "def", "class", "models", "views"],
  "Flask": ["flask", "import", "app", "route", "def", "return"],
};

function projectClientFallback(code: string, language: string, problem: string): ReviewResult {
  try {
    const trimmed = (code || "").trim();
    const lines = trimmed.split("\n").filter((l) => l.trim().length > 0);
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    const tooShort = wordCount < 4 || lines.length < 1;
    const keywords = PROJ_LANG_KEYWORDS[language] || ["function", "return", "if", "for"];
    const codeLower = trimmed.toLowerCase();
    const matched = keywords.filter((kw) => codeLower.includes(kw)).length;
    const ratio = keywords.length > 0 ? matched / keywords.length : 0;
    let score: number;
    const strengths: string[] = [];
    const improvements: string[] = [];
    if (tooShort) {
      score = 20;
      improvements.push("الحل قصير جداً — يحتاج إلى تفصيل أكثر");
      improvements.push("حاول كتابة الكود الكامل لحل المسألة");
    } else {
      score = Math.min(95, Math.round(25 + ratio * 55 + Math.min(lines.length * 2, 20)));
      if (ratio > 0.4) strengths.push(`يستخدم عناصر لغة ${language} بشكل صحيح`);
      if (lines.length >= 5) strengths.push("الحل منظم وله هيكل جيد");
      if (trimmed.includes("//") || trimmed.includes("#") || trimmed.includes("/*")) {
        strengths.push("يحتوي على تعليقات توضيحية");
      }
      if (strengths.length === 0) strengths.push("تم تقديم الحل");
      if (ratio < 0.35) improvements.push(`تأكد من استخدام عناصر لغة ${language} الأساسية`);
      if (lines.length < 4) improvements.push("يمكنك توسيع الحل وإضافة معالجة للحالات المختلفة");
      if (improvements.length === 0) improvements.push("حاول اختبار الحل بحالات مختلفة");
    }
    const isCorrect = score >= 55;
    return {
      isCorrect,
      score,
      summary: isCorrect ? `حل جيد لمسألة ${language}` : "الحل يحتاج إلى مراجعة وتحسين",
      strengths,
      improvements,
      explanation: isCorrect
        ? `تم تقييم حلك تلقائياً. الحل يبدو منطقياً ويحتوي على عناصر لغة ${language} الأساسية.`
        : `تم تقييم حلك تلقائياً. الحل يفتقر لبعض العناصر الأساسية لـ${language}. راجع المسألة وأضف المزيد من التفاصيل.`,
      hint: isCorrect ? "" : `ابدأ بتحليل المسألة خطوة بخطوة وتأكد من استخدام الصيغة الصحيحة للغة ${language}`,
    };
  } catch {
    return {
      isCorrect: true, score: 70,
      summary: "تم تقديم الحل بنجاح",
      strengths: ["تم تقديم الحل"],
      improvements: ["يمكن مراجعة الحل لتحسينه"],
      explanation: "تم قبول حلك.",
      hint: "",
    };
  }
}

type Category = "basics" | "specialty";
type BasicsLang = "C" | "C++" | "C#" | "SQL" | "MySQL" | "CS50";
type SpecialtySubTrack = "frontend" | "backend";

type FrontendLang = "HTML" | "CSS" | "JavaScript" | "React" | "Tailwind CSS" | "Bootstrap" | "Angular" | "Vue.js";
type BackendLang = "Laravel" | "PHP" | "Node.js" | "Python" | "MongoDB" | "Express.js" | "Next.js" | "ASP.NET" | "Django" | "Flask";
type SpecialtyLang = FrontendLang | BackendLang;

type AssignmentLang = BasicsLang | SpecialtyLang;
type ProjectTrack = "basics" | "frontend" | "backend";
type ProjectStatus = "inProgress" | "done";

interface Assignment {
  id: number;
  course_id: number;
  title: string;
  question: string;
  description: string | null;
  requirements: string | null;
  help_text: string | null;
  difficulty: number;
  language: string | null;
  points: number;
  assignment_order: number;
  completed?: boolean;
  score?: number | null;
}

interface Project {
  id: number;
  track: ProjectTrack;
  title: string;
  desc: string;
  difficulty: number;
  tags: string[];
  category: string;
}

interface StartedProject {
  projectId: number;
  status: ProjectStatus;
  startedAt: string;
  dbId?: number;
}

interface ReviewResult {
  isCorrect: boolean;
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  explanation: string;
  hint: string;
}

const BASICS_LANGS: BasicsLang[] = ["C", "C++", "C#", "SQL", "MySQL", "CS50"];

const FRONTEND_LANGS: FrontendLang[] = ["HTML", "CSS", "JavaScript", "React", "Tailwind CSS", "Bootstrap", "Angular", "Vue.js"];
const BACKEND_LANGS: BackendLang[] = ["Laravel", "PHP", "Node.js", "Python", "MongoDB", "Express.js", "Next.js", "ASP.NET", "Django", "Flask"];

const TRACK_LABELS: Record<ProjectTrack, string> = {
  basics: "أساسيات البرمجة",
  frontend: "مسار Frontend",
  backend: "مسار Backend",
};

// Scoped per signed-in user so one account's started-project list doesn't
// leak into whichever account next uses the same browser.
const startedProjectsKey = (userId: string | null | undefined) => `academy_started_projects_${userId ?? "guest"}`;

function loadStarted(userId: string | null | undefined): StartedProject[] {
  try { return JSON.parse(localStorage.getItem(startedProjectsKey(userId)) ?? "[]") as StartedProject[]; }
  catch { return []; }
}

function saveStarted(userId: string | null | undefined, list: StartedProject[]) {
  localStorage.setItem(startedProjectsKey(userId), JSON.stringify(list));
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export default function ProjectsPage() {
  const { user } = useCurrentUser();
  const [activeCategory, setActiveCategory] = useState<Category>("basics");
  const [activeBasicsLang, setActiveBasicsLang] = useState<BasicsLang>("C");
  const [activeSubTrack, setActiveSubTrack] = useState<SpecialtySubTrack>("frontend");
  const [activeFrontendLang, setActiveFrontendLang] = useState<FrontendLang>("HTML");
  const [activeBackendLang, setActiveBackendLang] = useState<BackendLang>("Laravel");
  const [solution, setSolution] = useState("");
  const [currentAssignmentIdx, setCurrentAssignmentIdx] = useState(0);
  const [activeTrack, setActiveTrack] = useState<ProjectTrack>("basics");
  const [startedProjects, setStartedProjects] = useState<StartedProject[]>([]);
  const [justStarted, setJustStarted] = useState<number | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [hintLoading,   setHintLoading]   = useState(false);
const [hintText,      setHintText]       = useState<string | null>(null);
const [hintMermaid,   setHintMermaid]    = useState<string | null>(null);
const [hintDiagramType, setHintDiagramType] = useState<"mistake" | "solution">("solution");
const [fixLoading,    setFixLoading]     = useState(false);
const [fixedCode,     setFixedCode]      = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Upload solution modal state
  const [uploadProjectId, setUploadProjectId] = useState<number | null>(null);
  const [uploadSolutionText, setUploadSolutionText] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCoverImage, setUploadCoverImage] = useState<File | null>(null);
  const [uploadIsPublic, setUploadIsPublic] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const uploadFileRef = useRef<HTMLInputElement | null>(null);
  const uploadCoverImageRef = useRef<HTMLInputElement | null>(null);

  // Dynamic projects (fetched from backend)
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  // Dynamic assignments (fetched from backend)
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);

  // Solution file upload (for AI review)
  const [solutionFile, setSolutionFile] = useState<File | null>(null);
  const solutionFileRef = useRef<HTMLInputElement | null>(null);

  const fetchProjects = useCallback(() => {
    setProjectsLoading(true);
    apiFetch("/api/projects")
      .then((r) => (r.ok ? r.json() : { projects: [] }))
      .then((data) => {
        const list = Array.isArray(data?.projects) ? data.projects : [];
        setProjects(
          list.map((p: { id: number; track: ProjectTrack; title: string; description: string | null; difficulty: number; tags: string[] | null; category: string | null }) => ({
            id: p.id,
            track: p.track,
            title: p.title,
            desc: p.description ?? "",
            difficulty: p.difficulty,
            tags: p.tags ?? [],
            category: p.category ?? "",
          }))
        );
      })
      .catch(() => setProjects([]))
      .finally(() => setProjectsLoading(false));
  }, []);

  useEffect(() => {
    const local = loadStarted(user?.id);
    setStartedProjects(local);
    // Prune entries whose linked repo was deleted elsewhere (e.g. from the
    // profile page) — otherwise this list kept showing "in progress" for
    // projects that no longer have any backing repository.
    const withDbId = local.filter((s) => s.dbId);
    if (withDbId.length === 0) return;
    Promise.all(
      withDbId.map((s) => apiFetch(`/api/repositories/${s.dbId}`).then((r) => ({ projectId: s.projectId, exists: r.ok })))
    ).then((results) => {
      const deletedIds = new Set(results.filter((r) => !r.exists).map((r) => r.projectId));
      if (deletedIds.size === 0) return;
      const pruned = local.filter((s) => !deletedIds.has(s.projectId));
      setStartedProjects(pruned);
      saveStarted(user?.id, pruned);
    }).catch(() => {});
  }, [user?.id]);
  useEffect(() => { fetchProjects(); }, [fetchProjects]);


  const activeLang: AssignmentLang =
    activeCategory === "basics"
      ? activeBasicsLang
      : activeSubTrack === "frontend"
        ? activeFrontendLang
        : activeBackendLang;

  useEffect(() => {
    setAssignmentsLoading(true);
    setCurrentAssignmentIdx(0);
    setSolution("");
    setSolutionFile(null);
    setReviewResult(null);
    setReviewError(null);
    apiFetch(`/api/assignments?language=${encodeURIComponent(activeLang)}&limit=50`)
      .then((r) => (r.ok ? r.json() : { assignments: [] }))
      .then((data) => setAssignments(Array.isArray(data?.assignments) ? data.assignments : []))
      .catch(() => setAssignments([]))
      .finally(() => setAssignmentsLoading(false));
  }, [activeLang]);

  const categoryAssignments = assignments;
  const currentAssignment = categoryAssignments[currentAssignmentIdx] ?? categoryAssignments[0];
  const filteredProjects = projects.filter((p) => p.track === activeTrack);

  const handleNextAssignment = () => {
    if (categoryAssignments.length === 0) return;
    setCurrentAssignmentIdx((prev) => (prev + 1) % categoryAssignments.length);
    setSolution("");
    setSolutionFile(null);
    setReviewResult(null);
    setReviewError(null);
  };
const getProjectHint = async (problem: string) => {
  if (hintLoading) return;
  setHintLoading(true);
  setHintText(null);
  setHintMermaid(null);
  try {
    const res = await apiFetch("/api/ai/helper-projects", {
      method: "POST",
      body: JSON.stringify({ mode: "hint", question: problem, code: solution }),
    });

    if (res.ok) {
      const data = await res.json() as { hint?: string; mermaid?: string; ai_response?: string; diagramType?: "mistake" | "solution" };
      setHintText(data.hint ?? data.ai_response ?? null);
      setHintMermaid(data.mermaid ?? null);
      setHintDiagramType(data.diagramType ?? (solution.trim() ? "mistake" : "solution"));
    }
  } catch { /* silent */ }
  finally { setHintLoading(false); }
};

const getProjectFix = async (code: string, language: string, problem: string) => {
  if (fixLoading) return;
  setFixLoading(true);
  setFixedCode(null);
  try {
    const res = await apiFetch("/api/ai/helper-projects", {
  method: "POST",
  body: JSON.stringify({ mode: "fix", code, language, question: problem }),
});
 
    if (res.ok) {
      const data = await res.json() as { fixed_code?: string };
      setFixedCode(data.fixed_code ?? null);
    }
  } catch { /* silent */ }
  finally { setFixLoading(false); }
};
  const handleLangChange = (lang: AssignmentLang) => {
    setCurrentAssignmentIdx(0);
    setSolution("");
    setReviewResult(null);
    setReviewError(null);
    if (activeCategory === "basics") {
      setActiveBasicsLang(lang as BasicsLang);
    } else if (activeSubTrack === "frontend") {
      setActiveFrontendLang(lang as FrontendLang);
    } else {
      setActiveBackendLang(lang as BackendLang);
    }
  };

  const handleSubTrackChange = (track: SpecialtySubTrack) => {
    setActiveSubTrack(track);
    setCurrentAssignmentIdx(0);
    setSolution("");
    setReviewResult(null);
    setReviewError(null);
  };

  const handleSubmitSolution = async () => {
    if (!solution.trim() && !solutionFile) {
      setReviewError("الرجاء كتابة الحل أو رفع ملف الحل أولاً قبل تقديمه.");
      return;
    }
    if (!currentAssignment) return;
    setReviewing(true);
    setReviewResult(null);
    setReviewError(null);
    const lang = String(activeLang);
    const problem = currentAssignment.question ?? "";
    let code = solution.trim();
    if (!code && solutionFile) {
      try {
        code = await readFileAsText(solutionFile);
      } catch {
        code = "";
      }
    }
    try {
      let data: ReviewResult;
      try {
        const res = await apiFetch("/api/assignments/review", {
  method: "POST",
  body: JSON.stringify({  code,
            language: lang,
            problem,
            problemTitle: currentAssignment.title,}),
});

        if (res.ok) {
          const json = await res.json() as ReviewResult;
          data = (json && typeof json.score === "number") ? json : projectClientFallback(code, lang, problem);
        } else {
          data = projectClientFallback(code, lang, problem);
        }
      } catch {
        data = projectClientFallback(code, lang, problem);
      }
      setReviewResult(data);

      if (user?.id && currentAssignment.id) {
        apiFetch("/api/assignments/submit", {
          method: "POST",
          body: JSON.stringify({ assignment_id: currentAssignment.id, solution: code, language: lang }),
        }).catch(() => {});

        if (data.isCorrect) {
          setAssignments((prev) =>
            prev.map((a) =>
              a.id === currentAssignment.id
                ? { ...a, completed: true, score: typeof a.score === "number" ? Math.max(a.score, data.score) : data.score }
                : a
            )
          );
        }
      }
    } catch {
      setReviewResult(projectClientFallback(code, lang, problem));
    } finally {
      setReviewing(false);
    }
  };

  const handleHelpRequest = () => {
    if (!currentAssignment) return;
    // Prefer the help text the admin/content-creator wrote for this specific
    // assignment; fall back to a generic prompt only if none was provided.
    const adminHelp = currentAssignment.help_text?.trim();
    const helpLine = adminHelp
      ? adminHelp
      : "ابدأ بتعريف المتغيرات المطلوبة، ثم فكر في المنطق الأساسي خطوة بخطوة.";
    setSolution((prev) =>
      prev
        ? `${prev}\n\n-- مساعدة: ${helpLine}`
        : `-- مساعدة لمسألة "${currentAssignment.title}":\n-- ${helpLine}`
    );
  };

  const getProjectStarted = (projectId: number) => startedProjects.find((s) => s.projectId === projectId);

  const handleStartProject = async (project: Project) => {
    if (getProjectStarted(project.id)) return;
    const entry: StartedProject = {
      projectId: project.id,
      status: "inProgress",
      startedAt: new Date().toISOString(),
    };
    if (user?.id) {
      try {
        const res = await apiFetch("/api/repositories", {
  method: "POST",
  body: JSON.stringify({
            title: project.title,
            description: project.desc,
            technologies: project.tags,
            userId: user.id,
            isPublic: true,
            isDraft: true,
            sourceProject: String(project.id),
          }),
});
      
        if (res.ok) {
          const data = await res.json() as { id?: number };
          entry.dbId = data.id;
        }
      } catch { /* silent */ }
    }
    const updated = [...startedProjects, entry];
    setStartedProjects(updated);
    saveStarted(user?.id, updated);
    setJustStarted(project.id);
    setTimeout(() => setJustStarted(null), 3000);
  };

  const handleFinishProject = (projectId: number) => {
    const updated = startedProjects.map((s) =>
      s.projectId === projectId ? { ...s, status: "done" as ProjectStatus } : s
    );
    setStartedProjects(updated);
    saveStarted(user?.id, updated);
  };

  const handleRemoveProject = (projectId: number) => {
    const entry = startedProjects.find((s) => s.projectId === projectId);
    const updated = startedProjects.filter((s) => s.projectId !== projectId);
    setStartedProjects(updated);
    saveStarted(user?.id, updated);
    // Also remove the linked draft/solution repository — otherwise removing a
    // project here left an orphaned entry showing up on the profile page.
    if (entry?.dbId) {
      apiFetch(`/api/repositories/${entry.dbId}`, { method: "DELETE" }).catch(() => {});
    }
  };

  const openUploadModal = (projectId: number) => {
    setUploadProjectId(projectId);
    setUploadSolutionText("");
    setUploadFile(null);
    setUploadCoverImage(null);
    setUploadIsPublic(true);
    setUploadSuccess(false);
  };

  const closeUploadModal = () => {
    setUploadProjectId(null);
    setUploadFile(null);
    setUploadCoverImage(null);
    setUploadSuccess(false);
  };

  const handleUploadSolution = async () => {
    const project = projects.find((p) => p.id === uploadProjectId);
    if (!project || !user?.id) return;
    if (!uploadSolutionText.trim() && !uploadFile) {
      alert("الرجاء كتابة وصف الحل أو رفع ملف.");
      return;
    }
    setUploading(true);
    try {
      let fileUrl: string | null = null;
      if (uploadFile) {
        const form = new FormData();
        form.append("file", uploadFile);
        const upRes = await apiFetch("/api/upload", { method: "POST", body: form });
        if (upRes.ok) {
          const upData = await upRes.json() as { file?: { url: string }; url?: string };
          fileUrl = upData.file?.url ?? upData.url ?? "";
        } else {
          alert("فشل رفع الملف، يرجى المحاولة مجدداً.");
          setUploading(false);
          return;
        }
      }

      let coverImageUrl: string | null = null;
      if (uploadCoverImage) {
        const form = new FormData();
        form.append("file", uploadCoverImage);
        const upRes = await apiFetch("/api/upload", { method: "POST", body: form });

        if (upRes.ok) {
          const upData = await upRes.json() as { file?: { url: string }; url?: string };
          coverImageUrl = upData.file?.url ?? upData.url ?? "";
        }
      }

      // Update the existing draft repo created when the project was started,
      // rather than creating a second, disconnected repository — this is what
      // kept the project-page and profile-page repo lists out of sync.
      const startedEntry = startedProjects.find((s) => s.projectId === project.id);
      const payload = {
        title: `حل: ${project.title}`,
        description: uploadSolutionText.trim() || `حل مشروع ${project.title}`,
        technologies: project.tags,
        codeFilesUrls: fileUrl ? [fileUrl] : [],
        pdfFilesUrls: [],
        coverImageUrl,
        userId: user.id,
        isPublic: uploadIsPublic,
        isDraft: false,
        sourceProject: String(project.id),
      };

      const repoRes = startedEntry?.dbId
        ? await apiFetch(`/api/repositories/${startedEntry.dbId}`, { method: "PUT", body: JSON.stringify(payload) })
        : await apiFetch("/api/repositories", { method: "POST", body: JSON.stringify(payload) });

      if (repoRes.ok) {
        if (!startedEntry?.dbId) {
          const data = await repoRes.json() as { id?: number };
          if (data.id) {
            const updated = startedProjects.map((s) => (s.projectId === project.id ? { ...s, dbId: data.id } : s));
            setStartedProjects(updated);
            saveStarted(user?.id, updated);
          }
        }
        setUploadSuccess(true);
        handleFinishProject(project.id);
        setTimeout(closeUploadModal, 2000);
      } else {
        // Surface the backend's real validation message (e.g. the anti-cheat /
        // "not enough evidence of work" check) instead of a generic failure alert.
        const err = await repoRes.json().catch(() => null) as { error?: string } | null;
        alert(err?.error ?? "فشل رفع الحل، يرجى المحاولة مجدداً");
      }
    } catch {
      alert("حدث خطأ أثناء رفع الحل");
    } finally {
      setUploading(false);
    }
  };

  const assignmentHeaderLabel =
    activeCategory === "basics"
      ? `تكليفات لغة ${activeBasicsLang}`
      : `تكليفات ${activeLang}`;

  const currentLangs: AssignmentLang[] =
    activeCategory === "basics"
      ? BASICS_LANGS
      : activeSubTrack === "frontend"
        ? FRONTEND_LANGS
        : BACKEND_LANGS;

  const activeLangForSelector =
    activeCategory === "basics"
      ? activeBasicsLang
      : activeSubTrack === "frontend"
        ? activeFrontendLang
        : activeBackendLang;

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f2f5]" dir="rtl">
      <Navbar />

      <div className="bg-white border-b border-gray-200 py-8 px-4 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 inline-block relative">
          التكليفات والمشاريع
          <div className="absolute bottom-0 right-0 left-0 h-1 rounded-full mt-1" style={{ background: "linear-gradient(90deg,#3730a3,#7c3aed)" }} />
        </h1>
      </div>

      {/* Assignment section */}
      <section className="max-w-7xl mx-auto w-full px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Assignment */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900 text-lg">{assignmentHeaderLabel}</h2>
                <div className="flex gap-1.5">
                  {categoryAssignments.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setCurrentAssignmentIdx(i); setSolution(""); setSolutionFile(null); setReviewResult(null); setReviewError(null); }}
                      className={`w-3 h-3 rounded-full transition-colors ${i === currentAssignmentIdx ? "bg-indigo-600" : "bg-gray-200"}`}
                      data-testid={`dot-assignment-${i}`}
                    />
                  ))}
                </div>
              </div>

              {assignmentsLoading && (
                <div className="p-6 flex items-center justify-center text-gray-400 gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm">جاري تحميل التكليفات...</span>
                </div>
              )}

              {!assignmentsLoading && categoryAssignments.length === 0 && (
                <div className="p-6 text-center text-gray-500 text-sm">
                  لا توجد تكليفات لهذه اللغة بعد.
                </div>
              )}

              {!assignmentsLoading && currentAssignment && (
                <div className="p-6">
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <h3 className="font-bold text-gray-800 text-base text-right">{currentAssignment.title}</h3>
                    <div className="flex items-center gap-2">
                      {currentAssignment.completed ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                          <CheckCircle size={13} /> مكتمل{typeof currentAssignment.score === "number" ? ` (${currentAssignment.score}/100)` : ""}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1">
                          <Clock size={13} /> لم يتم الإنجاز
                        </span>
                      )}
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                        الصعوبة: {currentAssignment.difficulty}/5
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-700 leading-relaxed mb-4 text-right">{currentAssignment.question}</p>
                  {currentAssignment.requirements && (
                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 whitespace-pre-line text-right border border-gray-100 mb-5">
                      {currentAssignment.requirements}
                    </div>
                  )}

                  <p className="font-semibold text-gray-800 mb-2 text-right">الحل:</p>
                  <textarea
                    value={solution}
                    onChange={(e) => { setSolution(e.target.value); setReviewResult(null); setReviewError(null); }}
                    placeholder="اكتب حلك هنا..."
                    className="w-full h-40 border border-gray-200 rounded-xl p-3 text-sm text-right resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
                    data-testid="textarea-solution"
                  />

                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-2 text-right">أو ارفع ملف الحل (اختياري)</p>
                    <div
                      className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-300 transition-colors"
                      onClick={() => solutionFileRef.current?.click()}
                    >
                      <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                      <p className="text-sm text-gray-500">
                        {solutionFile ? (
                          <span className="text-indigo-600 font-semibold">✓ {solutionFile.name}</span>
                        ) : (
                          "انقر لرفع ملف (.py, .js, .ts, .cpp, .c, .cs, .css, .java, .zip, .txt)"
                        )}
                      </p>
                      <input
                        ref={solutionFileRef}
                        type="file"
                        accept=".py,.js,.ts,.cpp,.c,.cs,.css,.java,.zip,.txt"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          setSolutionFile(file);
                          setReviewResult(null);
                          setReviewError(null);
                        }}
                      />
                    </div>
                  </div>

                  {reviewResult && (
                    <div className={`mt-4 rounded-xl border p-5 ${reviewResult.isCorrect ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={16}
                              className={i < Math.round((reviewResult.score / 100) * 5) ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}
                            />
                          ))}
                          <span className="text-sm font-bold text-gray-700">{reviewResult.score}/100</span>
                        </div>
                        <div className={`flex items-center gap-1.5 font-bold text-sm ${reviewResult.isCorrect ? "text-green-700" : "text-amber-700"}`}>
                          {reviewResult.isCorrect ? <><CheckCircle size={16} /> حل صحيح!</> : <><XCircle size={16} /> يحتاج تحسين</>}
                        </div>
                      </div>
                      <p className="text-sm text-gray-800 font-semibold mb-2 text-right">{reviewResult.summary}</p>
                      {reviewResult.explanation && (
                        <p className="text-sm text-gray-700 mb-3 text-right leading-relaxed">{reviewResult.explanation}</p>
                      )}
                      {reviewResult.strengths.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs font-bold text-green-700 mb-1">✅ نقاط القوة:</p>
                          <ul className="text-xs text-gray-700 space-y-0.5 text-right">
                            {reviewResult.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                          </ul>
                        </div>
                      )}
                      {reviewResult.improvements.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs font-bold text-amber-700 mb-1">💡 اقتراحات للتحسين:</p>
                          <ul className="text-xs text-gray-700 space-y-0.5 text-right">
                            {reviewResult.improvements.map((s, i) => <li key={i}>• {s}</li>)}
                          </ul>
                        </div>
                      )}
                      {!reviewResult.isCorrect && reviewResult.hint && (
                        <p className="text-xs text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2 mt-2 text-right">🔍 {reviewResult.hint}</p>
                      )}
                    </div>
                  )}

                  {reviewError && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 text-right">
                      ⚠️ {reviewError}
                    </div>
                  )}
                </div>
              )}

              {!assignmentsLoading && currentAssignment && (
              <div className="px-6 pb-6 space-y-4">
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={handleNextAssignment}
                    className="rounded-full px-6 py-2.5 font-semibold text-sm text-white"
                    style={{ background: "#f59e0b" }}
                    data-testid="button-next-assignment"
                  >
                    السؤال التالي
                  </button>
                  <button
                    onClick={handleHelpRequest}
                    className="rounded-full px-6 py-2.5 font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50"
                    data-testid="button-help"
                  >
                    طلب مساعدة
                  </button>
                  <button
                    onClick={() => getProjectHint(currentAssignment?.question ?? "")}
                    disabled={hintLoading}
                    className="rounded-full px-4 py-2 text-sm text-indigo-600 border border-indigo-200 hover:bg-indigo-50 disabled:opacity-50"
                  >
                    {hintLoading ? <Loader2 size={13} className="animate-spin inline" /> : "💡 تلميح"}
                  </button>
                  <button
                    onClick={() => getProjectFix(solution, String(activeLang), currentAssignment?.question ?? "")}
                    disabled={fixLoading || !solution.trim()}
                    className="rounded-full px-4 py-2 text-sm text-amber-700 border border-amber-200 hover:bg-amber-50 disabled:opacity-50"
                  >
                    {fixLoading ? <Loader2 size={13} className="animate-spin inline" /> : "🔧 إصلاح الكود"}
                  </button>
                  <button
                    onClick={handleSubmitSolution}
                    disabled={reviewing}
                    className="rounded-full px-6 py-2.5 font-semibold text-sm text-white flex items-center gap-2 disabled:opacity-70"
                    style={{ background: "#16a34a" }}
                    data-testid="button-submit"
                  >
                    {reviewing ? <><Loader2 size={14} className="animate-spin" /> جاري التقييم...</> : "تقديم الحل"}
                  </button>
                </div>

                {/* Result panels render as full-width blocks below the button row,
                    instead of as flex siblings squeezed in next to the buttons. */}
                {(hintText || hintMermaid) && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800 text-right space-y-3">
                    {hintText && <p>🔍 {hintText}</p>}
                    {hintMermaid && (
                      <div className="bg-white rounded-lg border border-indigo-100 p-3">
                        <div className="text-xs text-indigo-400 mb-2 font-semibold">
                          {hintDiagramType === "mistake" ? "مخطط يوضح أين أخطأت" : "مخطط الحل الصحيح"}
                        </div>
                        <MermaidDiagram chart={hintMermaid} />
                      </div>
                    )}
                  </div>
                )}

                {fixedCode && (
                  <div className="bg-gray-900 rounded-xl p-4 text-xs font-mono text-green-400 overflow-x-auto">
                    <div className="flex justify-between items-center mb-2">
                      <button
                        onClick={() => setSolution(fixedCode)}
                        className="text-xs text-green-300 border border-green-700 rounded px-2 py-1"
                      >
                        استخدم هذا الكود
                      </button>
                      <span className="text-gray-500">الكود المصحح</span>
                    </div>
                    <pre>{fixedCode}</pre>
                  </div>
                )}
              </div>
              )}
            </div>
          </div>

          {/* Right: Category + Language selector */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">اختر مجال التكليف</h3>
              </div>
              <div className="p-4 flex flex-col gap-3">
                {(["basics", "specialty"] as Category[]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setActiveCategory(cat); setCurrentAssignmentIdx(0); setSolution(""); setReviewResult(null); setReviewError(null); }}
                    className={`w-full text-right rounded-xl p-4 border transition-all ${activeCategory === cat ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-100 hover:border-indigo-200"}`}
                    data-testid={`button-category-${cat}`}
                  >
                    <div className="font-semibold text-sm">
                      {cat === "basics" ? "تكليفات أساسيات البرمجة" : "تكليفات الاختصاص"}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {cat === "basics" ? "C، C++، C#، SQL، MySQL، CS50" : "Frontend و Backend"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {activeCategory === "specialty" && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900">اختر المسار</h3>
                </div>
                <div className="p-4 flex gap-2">
                  {(["frontend", "backend"] as SpecialtySubTrack[]).map((track) => (
                    <button
                      key={track}
                      onClick={() => handleSubTrackChange(track)}
                      className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold border transition-all ${activeSubTrack === track ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-100 text-gray-700 hover:border-indigo-200"}`}
                      data-testid={`button-subtrack-${track}`}
                    >
                      {track === "frontend" ? "Frontend" : "Backend"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">
                  {activeCategory === "basics" ? "اختر اللغة" : `تقنيات ${activeSubTrack === "frontend" ? "Frontend" : "Backend"}`}
                </h3>
              </div>
              <div className="p-4 flex flex-col gap-2 max-h-72 overflow-y-auto">
                {currentLangs.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleLangChange(lang)}
                    className={`w-full text-right rounded-xl px-4 py-2.5 border text-sm font-semibold transition-all ${
                      activeLangForSelector === lang
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-100 text-gray-700 hover:border-indigo-200"
                    }`}
                    data-testid={`button-lang-${lang}`}
                  >
                    {activeCategory === "basics" ? `لغة ${lang}` : lang}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Started Projects Banner */}
      {startedProjects.length > 0 && (
        <section className="max-w-7xl mx-auto w-full px-4 pb-6">
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-indigo-600" />
              <h3 className="font-bold text-indigo-800">مشاريعك النشطة ({startedProjects.length})</h3>
              {user && (
                <Link href="/profile" className="mr-auto text-xs text-indigo-600 hover:underline flex items-center gap-1">
                  عرض في الملف الشخصي <ChevronRight size={13} />
                </Link>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {startedProjects.map((sp) => {
                const project = projects.find((p) => p.id === sp.projectId);
                if (!project) return null;
                return (
                  <div
                    key={sp.projectId}
                    className={`bg-white rounded-xl border p-4 flex flex-col gap-2 ${sp.status === "done" ? "border-green-200" : "border-indigo-200"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button onClick={() => handleRemoveProject(sp.projectId)} className="text-red-400 hover:text-red-600 shrink-0 mt-0.5" title="حذف">
                        <Trash2 size={14} />
                      </button>
                      <span className="font-semibold text-sm text-gray-800 text-right leading-tight">{project.title}</span>
                    </div>
                    <div className={`text-xs font-semibold flex items-center gap-1 justify-end ${sp.status === "done" ? "text-green-600" : "text-amber-600"}`}>
                      {sp.status === "done" ? <><CheckCircle size={13} /> مكتمل</> : <><div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /><Clock size={13} /> قيد التنفيذ</>}
                    </div>
                    {sp.status === "inProgress" && (
                      <div className="flex flex-col gap-1.5">
                        {/* No unchecked "instant finish" button — completion only happens
                            through رفع الحل, which the backend validates (real files/
                            description, not just a click). */}
                        {user && (
                          <button
                            onClick={() => openUploadModal(sp.projectId)}
                            className="rounded-full text-xs px-3 py-1.5 bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1"
                          >
                            <Upload size={11} /> رفع الحل
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {justStarted !== null && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg text-sm font-semibold z-50 flex items-center gap-2">
          <CheckCircle size={16} />
          تم البدء بالمشروع! يمكنك متابعته في قسم مشاريعك أعلاه
        </div>
      )}

      {/* Practical Projects */}
      <section className="max-w-7xl mx-auto w-full px-4 pb-14">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2 text-center relative inline-block">
          المشاريع العملية
          <div className="absolute bottom-0 right-0 left-0 h-0.5 rounded-full" style={{ background: "linear-gradient(90deg,#3730a3,#7c3aed)" }} />
        </h2>
        <div className="text-center mb-8 mt-4">
          <div className="inline-flex gap-2 flex-wrap justify-center items-center">
            {(["basics", "frontend", "backend"] as ProjectTrack[]).map((track) => (
              <button
                key={track}
                onClick={() => setActiveTrack(track)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${activeTrack === track ? "bg-indigo-600 text-white shadow" : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300"}`}
                data-testid={`button-track-${track}`}
              >
                {TRACK_LABELS[track]}
              </button>
            ))}
          </div>
        </div>

        {projectsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-100 rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg font-medium">لا توجد مشاريع في هذا المسار حالياً</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const started = getProjectStarted(project.id);
            return (
              <div
                key={project.id}
                className={`bg-white rounded-2xl shadow-sm border p-6 flex flex-col ${started ? "border-indigo-200" : "border-gray-100"}`}
                data-testid={`card-project-${project.id}`}
              >
                <div className="flex items-center justify-between mb-2">

                  <div className="text-xs text-indigo-500 font-semibold text-right flex-1">{project.category} 🏷</div>
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2 text-right">{project.title}</h3>
                <p className="text-gray-500 text-sm mb-4 text-right leading-relaxed flex-1">{project.desc}</p>
                <div className="flex items-center gap-1.5 mb-4 flex-row-reverse">
                  <span className="text-sm text-gray-500">:الصعوبة</span>
                  {[1, 2, 3, 4, 5].map((d) => (
                    <div key={d} className={`w-3 h-3 rounded-full ${d <= project.difficulty ? "bg-indigo-600" : "bg-gray-200"}`} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mb-5 justify-end">
                  {project.tags.map((tag) => (
                    <span key={tag} className="text-xs border border-indigo-200 text-indigo-600 rounded-full px-2.5 py-1">{tag}</span>
                  ))}
                </div>

                {!started ? (
                  <button
                    onClick={() => handleStartProject(project)}
                    className="w-full rounded-full py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
                    style={{ background: "linear-gradient(90deg,#3730a3,#7c3aed)" }}
                    data-testid={`button-start-project-${project.id}`}
                  >
                    بدء المشروع
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className={`flex items-center justify-center gap-2 text-sm font-bold py-2 rounded-full ${started.status === "done" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                      {started.status === "done" ? <><CheckCircle size={15} /> مكتمل</> : <><Clock size={15} /> قيد التنفيذ</>}
                    </div>
                    {started.status === "inProgress" && (
                      <>
                        {/* No unchecked "instant finish" button — completion only happens
                            through رفع الحل, which the backend validates. */}
                        {user && (
                          <button
                            onClick={() => openUploadModal(project.id)}
                            className="w-full rounded-full py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5"
                            data-testid={`button-upload-solution-${project.id}`}
                          >
                            <Upload size={14} /> رفع الحل
                          </button>
                        )}
                      </>
                    )}
                    <button onClick={() => handleRemoveProject(project.id)} className="w-full rounded-full py-2 text-sm font-semibold text-red-500 border border-red-200 hover:bg-red-50 transition-colors flex items-center justify-center gap-1">
                      <Trash2 size={14} /> حذف المشروع
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}
      </section>

      <Footer />

      {/* Upload Solution Modal */}
      {uploadProjectId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-gray-100"
              style={{ background: "linear-gradient(90deg,#1e1b4b,#3730a3)" }}
            >
              <button onClick={closeUploadModal} className="text-white/70 hover:text-white">
                <X size={20} />
              </button>
              <div className="text-right">
                <h2 className="text-white font-bold text-base">رفع حل المشروع</h2>
                <p className="text-indigo-200 text-xs mt-0.5">{projects.find((p) => p.id === uploadProjectId)?.title}</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {uploadSuccess ? (
                <div className="text-center py-8">
                  <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
                  <p className="font-bold text-green-700 text-lg">تم رفع الحل بنجاح!</p>
                  <p className="text-sm text-gray-500 mt-1">تم حفظ مشروعك في ملفك الشخصي</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2 text-right">وصف الحل (اختياري)</label>
                    <textarea
                      value={uploadSolutionText}
                      onChange={(e) => setUploadSolutionText(e.target.value)}
                      placeholder="اشرح نهجك في حل المشروع..."
                      rows={4}
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm text-right resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2 text-right">رفع ملف الحل (اختياري)</label>
                    <div
                      className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-300 transition-colors"
                      onClick={() => uploadFileRef.current?.click()}
                    >
                      <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                      <p className="text-sm text-gray-500">
                        {uploadFile
                          ? <span className="text-indigo-600 font-semibold">✓ {uploadFile.name}</span>
                          : "انقر لرفع ملف الحل (.zip, .py, .js, .ts, ...)"
                        }
                      </p>
                      <input
                        ref={uploadFileRef}
                        type="file"
                        accept=".py,.js,.ts,.cpp,.c,.cs,.css,.java,.zip,.txt,.rar,.gz"
                        className="hidden"
                        onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2 text-right">صورة غلاف المشروع (اختياري)</label>
                    <div
                      className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-300 transition-colors"
                      onClick={() => uploadCoverImageRef.current?.click()}
                    >
                      {uploadCoverImage ? (
                        <div className="flex flex-col items-center gap-1">
                          <img
                            src={URL.createObjectURL(uploadCoverImage)}
                            alt="cover preview"
                            className="h-20 object-cover rounded-lg mx-auto"
                          />
                          <span className="text-indigo-600 font-semibold text-xs">✓ {uploadCoverImage.name}</span>
                        </div>
                      ) : (
                        <>
                          <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                          <p className="text-sm text-gray-500">انقر لرفع صورة غلاف للمشروع (.jpg, .png, ...)</p>
                        </>
                      )}
                      <input
                        ref={uploadCoverImageRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setUploadCoverImage(e.target.files?.[0] ?? null)}
                      />
                    </div>
                  </div>

                  {/* Privacy toggle */}
                  <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setUploadIsPublic(true)}
                        className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${uploadIsPublic ? "bg-indigo-600 text-white" : "text-gray-500 border border-gray-200 hover:bg-gray-50 bg-white"}`}
                      >
                        <Eye size={13} /> عام
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadIsPublic(false)}
                        className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${!uploadIsPublic ? "bg-gray-700 text-white" : "text-gray-500 border border-gray-200 hover:bg-gray-50 bg-white"}`}
                      >
                        <Lock size={13} /> خاص
                      </button>
                    </div>
                    <span className="text-sm font-medium text-gray-700">خصوصية الحل</span>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button onClick={closeUploadModal} className="rounded-full px-5 py-2.5 text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50">
                      إلغاء
                    </button>
                    <button
                      onClick={handleUploadSolution}
                      disabled={uploading}
                      className="flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-white disabled:opacity-70"
                      style={{ background: "linear-gradient(90deg,#4f46e5,#7c3aed)" }}
                      data-testid="button-confirm-upload"
                    >
                      {uploading ? <><Loader2 size={14} className="animate-spin" /> جاري الرفع...</> : <><Upload size={14} /> رفع الحل</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
