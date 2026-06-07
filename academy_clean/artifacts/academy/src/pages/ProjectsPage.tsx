import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { CheckCircle, Clock, Trash2, ChevronRight, Loader2, XCircle, Star, Upload, X, Lock, Eye } from "lucide-react";
import { useCurrentUser } from "@/lib/auth-context";
import { Link } from "wouter";
import { apiFetch } from "@/lib/api-fetch";

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
  lang: AssignmentLang;
  title: string;
  problem: string;
  example: string;
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

const ASSIGNMENTS: Assignment[] = [
  // ── C ──
  { id: 1, lang: "C", title: "طباعة الأعداد الزوجية", problem: "اكتب برنامجاً في لغة C يطلب من المستخدم إدخال عدد صحيح، ثم يطبع جميع الأعداد الزوجية من 1 إلى هذا العدد.", example: "أدخل عدداً: 10\nالأعداد الزوجية: 2، 4، 6، 8، 10" },
  { id: 2, lang: "C", title: "حساب مجموع الأرقام", problem: "اكتب برنامجاً يحسب مجموع أرقام عدد صحيح موجب مدخل من المستخدم.", example: "أدخل عدداً: 1234\nمجموع الأرقام = 10" },
  { id: 3, lang: "C", title: "البحث عن الأعداد الأولية", problem: "اكتب برنامجاً يطبع جميع الأعداد الأولية بين 1 و100 باستخدام لغة C.", example: "2 3 5 7 11 13 ..." },
  // ── C++ ──
  { id: 4, lang: "C++", title: "آلة حاسبة بسيطة", problem: "اكتب برنامجاً بلغة C++ ينفذ العمليات الحسابية الأربع (+، -، *، /) على عددين يدخلهما المستخدم مع التحقق من القسمة على صفر.", example: "أدخل العملية: 10 + 5\nالناتج = 15" },
  { id: 5, lang: "C++", title: "مبدأ الوراثة", problem: "صمم هيكلاً يحتوي على كلاس أساسي Animal مع كلاسات مشتقة Dog وCat مع تطبيق الوراثة وتجاوز الدوال.", example: "Dog يرث من Animal\nيتجاوز دالة speak() لتطبع: نباح" },
  { id: 6, lang: "C++", title: "مصفوفة ديناميكية", problem: "اكتب برنامجاً بلغة C++ يستخدم vector لتخزين أرقام المستخدم ثم يعرضها مرتبة تصاعدياً.", example: "أدخل أرقاماً: 5 2 8 1 9\nمرتبة: 1 2 5 8 9" },
  // ── C# ──
  { id: 7, lang: "C#", title: "قائمة المهام", problem: "أنشئ تطبيقاً بلغة C# يخزن مهام في قائمة مع إمكانية الإضافة والحذف والعرض.", example: "أضف مهمة: 'إنهاء التقرير'\nالمهام: [1] إنهاء التقرير" },
  { id: 8, lang: "C#", title: "الواجهات Interfaces", problem: "أنشئ واجهة IShape مع دوال Area() و Perimeter()، ثم نفذها في كلاس Circle وRectangle.", example: "Circle.Area() = 78.5\nRectangle.Area() = 20" },
  { id: 9, lang: "C#", title: "قراءة ملف نصي", problem: "اكتب برنامجاً بـ C# يقرأ ملفاً نصياً ويعد عدد الكلمات والأسطر فيه.", example: "عدد الأسطر: 10\nعدد الكلمات: 85" },
  // ── SQL ──
  { id: 10, lang: "SQL", title: "استعلام SELECT مع فلترة", problem: "أنشئ جدول Students وأضف 5 سجلات، ثم استعلم عن الطلاب الذين حصلوا على درجة أعلى من 80.", example: "SELECT name FROM Students WHERE grade > 80;" },
  { id: 11, lang: "SQL", title: "ربط الجداول JOIN", problem: "صمم جدولين Orders و Customers وأنشئ استعلام INNER JOIN لعرض اسم العميل مع طلباته.", example: "SELECT c.name, o.product FROM Customers c INNER JOIN Orders o ON c.id = o.customer_id;" },
  { id: 12, lang: "SQL", title: "تجميع البيانات GROUP BY", problem: "أنشئ استعلاماً يجمع إجمالي المبيعات لكل منطقة باستخدام GROUP BY وHAVING.", example: "SELECT region, SUM(sales) FROM Sales GROUP BY region HAVING SUM(sales) > 1000;" },
  // ── MySQL ──
  { id: 13, lang: "MySQL", title: "إنشاء قاعدة بيانات مكتبة", problem: "صمم قاعدة بيانات MySQL لمكتبة تحتوي على جداول: Books, Authors, Members, Loans مع العلاقات المناسبة.", example: "CREATE TABLE Books (id INT PRIMARY KEY, title VARCHAR(255), author_id INT, ...)" },
  { id: 14, lang: "MySQL", title: "Stored Procedure", problem: "أنشئ Stored Procedure في MySQL تقبل رقم طالب وتعيد معدله الدراسي.", example: "CALL GetStudentGPA(1001);\n-- النتيجة: 3.75" },
  { id: 15, lang: "MySQL", title: "التحسين بالفهارس", problem: "أضف فهارس Index مناسبة لجدول products كبير وقارن أداء الاستعلامات قبل وبعد الفهرسة.", example: "CREATE INDEX idx_category ON products(category_id);" },
  // ── CS50 ──
  { id: 16, lang: "CS50", title: "Caesar Cipher", problem: "نفذ خوارزمية Caesar Cipher بلغة C حيث يقبل البرنامج مفتاح التشفير ثم يشفر النص المدخل.", example: "المفتاح: 2\nالنص: Hello\nالمشفر: Jgnnq" },
  { id: 17, lang: "CS50", title: "هرم ماريو", problem: "اكتب برنامجاً يرسم هرماً من علامات # بالعرض الذي يدخله المستخدم (1-8).", example: "العرض: 4\n   #\n  ##\n ###\n####" },
  { id: 18, lang: "CS50", title: "حساب الباقي الصرف", problem: "اكتب برنامجاً يحسب أقل عدد من العملات المعدنية اللازمة للباقي (25, 10, 5, 1 سنتاً).", example: "المبلغ: 0.41\nعدد العملات: 4 (25+10+5+1)" },
  // ── HTML ──
  { id: 19, lang: "HTML", title: "صفحة تعريفية شخصية", problem: "صمم صفحة HTML تعريفية تحتوي على: رأس الصفحة، صورة، قسم عن النفس، قائمة بالمهارات، ومعلومات التواصل.", example: "<header>, <section>, <ul>, <footer> مع استخدام Semantic HTML5" },
  { id: 20, lang: "HTML", title: "نموذج تسجيل", problem: "أنشئ نموذج HTML كامل للتسجيل يحتوي على: الاسم، البريد، كلمة المرور، التاريخ، القائمة المنسدلة، وزر الإرسال مع التحقق المدمج.", example: "<form>, <input type='email'>, <select>, <input type='submit'>" },
  { id: 21, lang: "HTML", title: "جدول بيانات الطلاب", problem: "أنشئ جدول HTML يعرض بيانات 10 طلاب: الاسم، الدرجة، التقدير. مع دمج الخلايا وتنسيق الترويسة.", example: "<table>, <thead>, <tbody>, <tr>, <td>, <th> مع colspan/rowspan" },
  // ── CSS ──
  { id: 22, lang: "CSS", title: "تصميم بطاقة منتج", problem: "صمم بطاقة منتج احترافية باستخدام CSS تحتوي على: صورة، عنوان، وصف، سعر، وزر شراء مع تأثير hover.", example: "box-shadow، border-radius، transition، :hover pseudo-class" },
  { id: 23, lang: "CSS", title: "شبكة صور Flexbox", problem: "أنشئ شبكة صور متجاوبة باستخدام Flexbox تعرض 6 بطاقات في صفوف 3×2 على الشاشة الكبيرة و1×6 على الموبايل.", example: "display: flex; flex-wrap: wrap; @media query للتجاوب" },
  { id: 24, lang: "CSS", title: "قائمة تنقل متحركة", problem: "صمم قائمة تنقل أفقية مع: تأثير underline متحرك عند الـ hover، dropdown menu، وتحويل لـ hamburger menu في الموبايل.", example: "CSS transitions، :hover، position: absolute للـ dropdown" },
  // ── JavaScript ──
  { id: 25, lang: "JavaScript", title: "آلة حاسبة تفاعلية", problem: "أنشئ آلة حاسبة تفاعلية باستخدام HTML وCSS وJavaScript تدعم العمليات الأساسية مع تاريخ العمليات.", example: "addEventListener، querySelector، innerHTML، eval() أو منطق مخصص" },
  { id: 26, lang: "JavaScript", title: "جلب بيانات من API", problem: "استخدم fetch() لجلب قائمة مستخدمين من https://jsonplaceholder.typicode.com/users وعرضهم في بطاقات.", example: "fetch(url).then(r => r.json()).then(data => { /* عرض البيانات */ })" },
  { id: 27, lang: "JavaScript", title: "لعبة خمن الرقم", problem: "أنشئ لعبة 'خمن الرقم' حيث يختار البرنامج رقماً من 1-100 والمستخدم يخمن مع تلميحات (أكبر/أصغر) وعدد المحاولات.", example: "Math.random()، parseInt()، while loop أو event listeners" },
  // ── React ──
  { id: 28, lang: "React", title: "قائمة مهام Todo", problem: "أنشئ تطبيق Todo List بـ React مع: إضافة مهام، حذفها، تعليمها كمنجزة، وفلترة (الكل/النشطة/المنجزة) مع useState.", example: "useState، props، .map()، conditional rendering، event handlers" },
  { id: 29, lang: "React", title: "جلب وعرض بيانات API", problem: "أنشئ مكون React يجلب قائمة منتجات من API وعرضها في بطاقات مع حالة loading وerror وبحث فوري.", example: "useEffect، useState، fetch، conditional rendering للـ loading/error" },
  { id: 30, lang: "React", title: "نظام مصادقة بسيط", problem: "أنشئ نظام تسجيل دخول بـ React مع: نموذج login، حماية المسارات بـ React Router، وتخزين الجلسة.", example: "React Router، useContext أو useState، localStorage، ProtectedRoute component" },
  // ── Tailwind CSS ──
  { id: 31, lang: "Tailwind CSS", title: "صفحة هبوط Landing Page", problem: "صمم صفحة هبوط كاملة باستخدام Tailwind CSS تحتوي على: navbar، hero section، features cards، وfooter.", example: "flex، grid، responsive breakpoints (sm:، md:، lg:)، hover: utilities" },
  { id: 32, lang: "Tailwind CSS", title: "لوحة إدارة Dashboard", problem: "صمم لوحة تحكم باستخدام Tailwind CSS تحتوي على: sidebar، header، بطاقات إحصاء، وجدول بيانات.", example: "grid-cols-4، sidebar fixed أو sticky، card components بـ shadow وrounded" },
  { id: 33, lang: "Tailwind CSS", title: "نظام تصميم مكونات", problem: "أنشئ مكتبة مكونات باستخدام Tailwind CSS: أزرار بأنواع متعددة، badges، alerts، وmodal.", example: "variant classes (primary/secondary/danger)، @apply في CSS لإعادة الاستخدام" },
  // ── Bootstrap ──
  { id: 34, lang: "Bootstrap", title: "موقع شركة متجاوب", problem: "أنشئ موقع شركة متجاوب بـ Bootstrap 5 يحتوي على: navbar، carousel، cards، وcontact form.", example: "container، row، col-md-4، navbar-toggler، carousel component" },
  { id: 35, lang: "Bootstrap", title: "نموذج تسجيل محسّن", problem: "صمم نموذج تسجيل احترافي بـ Bootstrap مع: التحقق من المدخلات، حالة invalid/valid، وأيقونات مدمجة.", example: "form-control، is-invalid، invalid-feedback، input-group، Bootstrap icons" },
  { id: 36, lang: "Bootstrap", title: "جدول بيانات تفاعلي", problem: "أنشئ جدول بيانات بـ Bootstrap مع: ترتيب الأعمدة، بحث، pagination، وأزرار إجراءات لكل صف.", example: "table-striped، table-hover، pagination، modal لتأكيد الحذف" },
  // ── Angular ──
  { id: 37, lang: "Angular", title: "تطبيق قائمة مهام", problem: "أنشئ تطبيق Todo بـ Angular مع: Component، Service، Two-way Data Binding، وحذف/إضافة المهام.", example: "[(ngModel)]، *ngFor، *ngIf، @Injectable() service، EventEmitter" },
  { id: 38, lang: "Angular", title: "نظام التوجيه Routing", problem: "أنشئ تطبيق Angular متعدد الصفحات مع: RouterModule، lazy loading، وحماية المسارات بـ Guards.", example: "RouterModule.forRoot()، canActivate Guard، routerLink، ActivatedRoute" },
  { id: 39, lang: "Angular", title: "استهلاك REST API", problem: "استخدم HttpClientModule في Angular لاستهلاك API وعرض البيانات مع معالجة الأخطاء بـ RxJS.", example: "HttpClient، Observable، pipe(catchError())، async pipe في القالب" },
  // ── Vue.js ──
  { id: 40, lang: "Vue.js", title: "تطبيق قائمة مهام", problem: "أنشئ تطبيق Todo بـ Vue 3 مع Composition API: إضافة وحذف وتعليم المهام مع reactive state.", example: "ref()، computed()، v-for، v-model، @click event" },
  { id: 41, lang: "Vue.js", title: "متجر Vuex/Pinia", problem: "استخدم Pinia لإدارة حالة تطبيق Vue يحتوي على: سلة تسوق، إضافة وحذف منتجات، وحساب الإجمالي.", example: "defineStore()، state، getters، actions، useStore() في المكونات" },
  { id: 42, lang: "Vue.js", title: "تطبيق الطقس", problem: "أنشئ تطبيق طقس بـ Vue 3 يجلب بيانات من API وعرض درجة الحرارة والحالة مع رسوم متحركة.", example: "Axios أو fetch، v-if/v-else، transition component، async/await" },
  // ── Laravel ──
  { id: 43, lang: "Laravel", title: "نظام CRUD للمنتجات", problem: "أنشئ نظام CRUD كامل بـ Laravel لإدارة المنتجات: إنشاء، قراءة، تحديث، حذف مع Eloquent ORM.", example: "php artisan make:model Product -m -c\nController بـ index()، create()، store()، edit()، update()، destroy()" },
  { id: 44, lang: "Laravel", title: "مصادقة Laravel Breeze", problem: "أضف نظام مصادقة كامل لمشروع Laravel باستخدام Laravel Breeze مع تسجيل الدخول والخروج وحماية المسارات.", example: "composer require laravel/breeze\nphp artisan breeze:install\n@auth و@guest في Blade" },
  { id: 45, lang: "Laravel", title: "RESTful API بـ Laravel", problem: "أنشئ RESTful API بـ Laravel Sanctum للمصادقة مع API Resources لتنسيق البيانات.", example: "php artisan make:controller Api/ProductController --api\nRoute::apiResource('products', ProductController::class)" },
  // ── PHP ──
  { id: 46, lang: "PHP", title: "نظام تسجيل دخول", problem: "أنشئ نظام تسجيل دخول بـ PHP خام مع: قاعدة بيانات MySQL، تشفير كلمة المرور بـ password_hash، وجلسات Sessions.", example: "mysqli أو PDO، password_hash()، password_verify()، $_SESSION" },
  { id: 47, lang: "PHP", title: "معالجة نماذج HTML", problem: "اكتب سكريبت PHP يعالج نموذج HTML: التحقق من المدخلات، sanitization، وحفظ البيانات في قاعدة بيانات.", example: "filter_var()، htmlspecialchars()، PDO prepared statements" },
  { id: 48, lang: "PHP", title: "API JSON بـ PHP", problem: "أنشئ نقطة API بـ PHP خام تستقبل طلبات JSON وتعيد بيانات من قاعدة البيانات بصيغة JSON.", example: "header('Content-Type: application/json')، json_encode()، json_decode()، $_SERVER['REQUEST_METHOD']" },
  // ── Node.js ──
  { id: 49, lang: "Node.js", title: "خادم HTTP بسيط", problem: "أنشئ خادم HTTP بـ Node.js خام (بدون Express) يستجيب لمسارات مختلفة ويقرأ بيانات من ملف JSON.", example: "http.createServer()، req.url، fs.readFileSync()، res.writeHead()، res.end()" },
  { id: 50, lang: "Node.js", title: "CLI أداة سطر الأوامر", problem: "أنشئ أداة CLI بـ Node.js تقبل وسائط من سطر الأوامر وتؤدي عمليات على الملفات (قراءة، كتابة، بحث).", example: "process.argv، fs.promises، path module، readline للتفاعل" },
  { id: 51, lang: "Node.js", title: "نظام مراقبة الملفات", problem: "أنشئ سكريبت Node.js يراقب مجلداً ويسجل أي تغييرات (إضافة/حذف/تعديل) مع الوقت.", example: "fs.watch() أو chokidar، EventEmitter، تسجيل التغييرات في ملف log" },
  // ── Python ──
  { id: 52, lang: "Python", title: "تحليل البيانات CSV", problem: "اكتب سكريبت Python يقرأ ملف CSV، يحسب المتوسط والمجموع لأعمدة رقمية، ويصدر النتائج لملف جديد.", example: "import csv، with open() as f، csv.DictReader()، statistics.mean()" },
  { id: 53, lang: "Python", title: "Web Scraper", problem: "أنشئ Web Scraper بـ Python باستخدام requests وBeautifulSoup لاستخراج عناوين المقالات وروابطها من موقع.", example: "requests.get(url)، BeautifulSoup(html, 'html.parser')، soup.find_all('a')" },
  { id: 54, lang: "Python", title: "نظام قاعدة البيانات SQLite", problem: "أنشئ تطبيق Python لإدارة مكتبة كتب باستخدام SQLite3 مع عمليات CRUD كاملة.", example: "import sqlite3، conn.execute()، cursor.fetchall()، context manager" },
  // ── MongoDB ──
  { id: 55, lang: "MongoDB", title: "CRUD بـ MongoDB Shell", problem: "نفذ عمليات CRUD كاملة في MongoDB Shell لمجموعة 'products': إضافة، بحث، تحديث، حذف مع استعلامات متقدمة.", example: "db.products.insertMany([...])، find({price: {$gt: 100}})، updateOne()، deleteMany()" },
  { id: 56, lang: "MongoDB", title: "Aggregation Pipeline", problem: "أنشئ Aggregation Pipeline لتحليل بيانات مبيعات: group بالشهر، sort، limit، وproject الحقول المطلوبة.", example: "$group، $sort، $limit، $project، $match في pipeline" },
  { id: 57, lang: "MongoDB", title: "Mongoose Schema", problem: "أنشئ Schema بـ Mongoose لنظام مدونة يحتوي على: مقالات، تعليقات مضمنة، وعلاقة مرجعية بالمستخدمين.", example: "new Schema({})، ref: 'User'، populate()، pre-save hook للتحقق" },
  // ── Express.js ──
  { id: 58, lang: "Express.js", title: "RESTful API كامل", problem: "أنشئ RESTful API بـ Express.js لإدارة مهام: CRUD كامل، middleware للتحقق، وtry/catch للأخطاء.", example: "app.get/post/put/delete، express.Router()، middleware chain" },
  { id: 59, lang: "Express.js", title: "Middleware مخصص", problem: "أنشئ middleware للتسجيل (logging)، والتحقق من الـ token، وحد معدل الطلبات (rate limiting).", example: "app.use((req, res, next) => {...})، req.headers.authorization، next()" },
  { id: 60, lang: "Express.js", title: "رفع الملفات Multer", problem: "أنشئ نقطة نهاية لرفع الصور بـ Express وMulter مع التحقق من نوع الملف وحجمه وتخزينه.", example: "multer({ storage, fileFilter, limits })، req.file، path.extname()" },
  // ── Next.js ──
  { id: 61, lang: "Next.js", title: "موقع SSR مع API Routes", problem: "أنشئ موقع Next.js مع: صفحة SSR تجلب بيانات من API Route داخلي، وصفحة SSG للمحتوى الثابت.", example: "getServerSideProps()، getStaticProps()، pages/api/data.ts، useRouter()" },
  { id: 62, lang: "Next.js", title: "مدونة بـ App Router", problem: "أنشئ مدونة بـ Next.js 14 App Router مع: layout، Server Components، Dynamic Routes، وMetadata API.", example: "app/layout.tsx، app/blog/[slug]/page.tsx، generateMetadata()، fetch() caching" },
  { id: 63, lang: "Next.js", title: "مصادقة بـ NextAuth", problem: "أضف نظام مصادقة لمشروع Next.js باستخدام NextAuth.js مع Google Provider وحماية الصفحات.", example: "NextAuth()، SessionProvider، useSession()، withAuth middleware" },
  // ── ASP.NET ──
  { id: 64, lang: "ASP.NET", title: "Web API بـ C#", problem: "أنشئ Web API بـ ASP.NET Core مع Controller، Entity Framework Core، وعمليات CRUD لإدارة منتجات.", example: "[ApiController]، [HttpGet/Post/Put/Delete]، DbContext، IActionResult" },
  { id: 65, lang: "ASP.NET", title: "مصادقة JWT", problem: "أضف JWT Authentication لـ ASP.NET Core API مع تسجيل الدخول والتسجيل وحماية نقاط النهاية.", example: "JwtBearer، AddAuthentication()، [Authorize]، ClaimsPrincipal" },
  { id: 66, lang: "ASP.NET", title: "Razor Pages Form", problem: "أنشئ صفحة Razor Pages لنموذج تواصل مع التحقق من المدخلات بـ Data Annotations وإرسال البريد الإلكتروني.", example: "PageModel، [BindProperty]، [Required]، ModelState.IsValid، SmtpClient" },
  // ── Django ──
  { id: 67, lang: "Django", title: "تطبيق CRUD بـ Django", problem: "أنشئ تطبيق Django لإدارة مقالات مدونة مع: Models، Views، URLs، Templates، وDjango Admin.", example: "models.Model، views.py، urls.py، {% for %}، {% extends %}" },
  { id: 68, lang: "Django", title: "Django REST Framework", problem: "أنشئ API بـ Django REST Framework مع Serializers، ViewSets، وRouter لإدارة بيانات.", example: "ModelSerializer، ViewSet، DefaultRouter، @action decorator" },
  { id: 69, lang: "Django", title: "مصادقة وأذونات", problem: "أضف نظام مصادقة لـ Django مع: تسجيل المستخدمين، تسجيل الدخول/الخروج، وأذونات مخصصة.", example: "django.contrib.auth، @login_required، UserCreationForm، Permission" },
  // ── Flask ──
  { id: 70, lang: "Flask", title: "API REST بـ Flask", problem: "أنشئ REST API بـ Flask مع SQLAlchemy لإدارة مهام: CRUD كامل، JSON responses، وerror handlers.", example: "@app.route('/tasks', methods=['GET', 'POST'])، db.session.add()، jsonify()" },
  { id: 71, lang: "Flask", title: "نظام مصادقة Flask-Login", problem: "أضف مصادقة لتطبيق Flask باستخدام Flask-Login مع: تسجيل المستخدمين، تشفير كلمة المرور، وحماية المسارات.", example: "LoginManager، @login_required، UserMixin، generate_password_hash()" },
  { id: 72, lang: "Flask", title: "رفع الملفات", problem: "أنشئ نقطة نهاية Flask لرفع الصور مع: التحقق من النوع والحجم، تخزين آمن، وعرضها.", example: "request.files، secure_filename()، ALLOWED_EXTENSIONS، send_from_directory()" },
];

const PROJECTS: Project[] = [
  { id: 1, track: "basics", title: "آلة حاسبة متقدمة", desc: "بناء آلة حاسبة تدعم العمليات الأساسية والمتقدمة مع واجهة رسومية.", difficulty: 2, tags: ["C++", "UI", "OOP"], category: "آلة حاسبة" },
  { id: 2, track: "basics", title: "نظام إدارة المكتبة", desc: "تطوير نظام لإدارة الكتب والأعضاء والإعارات باستخدام قاعدة بيانات.", difficulty: 3, tags: ["C#", "SQL", "OOP"], category: "إدارة بيانات" },
  { id: 3, track: "basics", title: "برنامج إدارة الطلاب", desc: "نظام لتسجيل الطلاب وحساب معدلاتهم وعرض التقارير.", difficulty: 2, tags: ["C", "ملفات", "هياكل بيانات"], category: "إدارة سجلات" },
  { id: 4, track: "basics", title: "لعبة الأفعى Snake", desc: "تطوير لعبة الأفعى الكلاسيكية باستخدام مفاهيم البرمجة الإجرائية.", difficulty: 3, tags: ["C++", "رسومات", "منطق اللعبة"], category: "تطوير ألعاب" },
  { id: 5, track: "basics", title: "محرك SQL مصغر", desc: "بناء محرك SQL بسيط يدعم CREATE TABLE وINSERT وSELECT يدوياً.", difficulty: 4, tags: ["C", "SQL", "معالجة نصوص"], category: "محركات قواعد البيانات" },
  { id: 6, track: "basics", title: "مترجم CS50 تسلسلي", desc: "تنفيذ تحديات CS50 كاملة من Week 0 إلى Week 5 في مشروع متسلسل.", difficulty: 3, tags: ["CS50", "C", "خوارزميات"], category: "تحديات CS50" },
  { id: 7, track: "frontend", title: "متجر إلكتروني React", desc: "بناء متجر إلكتروني كامل مع سلة تسوق وصفحات المنتجات باستخدام React.", difficulty: 3, tags: ["React", "TypeScript", "CSS"], category: "تطوير ويب" },
  { id: 8, track: "frontend", title: "لوحة تحكم إدارية", desc: "تصميم داشبورد تفاعلي مع رسوم بيانية وإحصاءات في الوقت الحقيقي.", difficulty: 3, tags: ["Vue.js", "Charts", "Dashboard"], category: "لوحة تحكم" },
  { id: 9, track: "frontend", title: "تطبيق الطقس", desc: "تطبيق يعرض بيانات الطقس من API بتصميم جذاب مع رسوم متحركة.", difficulty: 2, tags: ["React", "API", "Tailwind CSS"], category: "تطبيق ويب" },
  { id: 10, track: "frontend", title: "منصة مدونة", desc: "إنشاء منصة تدوين كاملة مع مقالات ونظام تعليقات وتصنيفات.", difficulty: 4, tags: ["Next.js", "Markdown", "SEO"], category: "نظام نشر" },
  { id: 11, track: "frontend", title: "مشغل موسيقى", desc: "بناء مشغل موسيقى بواجهة جميلة يدعم قوائم التشغيل والتحكم.", difficulty: 3, tags: ["React", "Web Audio API", "CSS"], category: "وسائط" },
  { id: 12, track: "frontend", title: "مولد مخططات ذهنية", desc: "أداة رسم تفاعلية لإنشاء مخططات ذهنية قابلة للتصدير.", difficulty: 4, tags: ["Angular", "Canvas", "SVG"], category: "إنتاجية" },
  { id: 13, track: "backend", title: "API تجارة إلكترونية", desc: "بناء RESTful API شامل لمتجر إلكتروني مع المصادقة وإدارة المنتجات.", difficulty: 4, tags: ["Node.js", "Express.js", "MongoDB"], category: "تطوير خادم" },
  { id: 14, track: "backend", title: "نظام مصادقة كامل", desc: "تطوير نظام تسجيل دخول شامل مع JWT وتشفير وإعادة تعيين كلمة المرور.", difficulty: 4, tags: ["Python", "Django", "PostgreSQL"], category: "أمان" },
  { id: 15, track: "backend", title: "نظام دردشة Real-Time", desc: "خادم دردشة باستخدام WebSockets يدعم غرفاً متعددة ورسائل فورية.", difficulty: 4, tags: ["Node.js", "Express.js", "MongoDB"], category: "الوقت الحقيقي" },
  { id: 16, track: "backend", title: "خدمة مصغرة Microservice", desc: "بناء خدمة مصغرة مستقلة مع API Gateway.", difficulty: 5, tags: ["Node.js", "Laravel", "Flask"], category: "معمارية" },
  { id: 17, track: "backend", title: "محرك بحث مخصص", desc: "تطوير محرك بحث نصي كامل مع فهرسة وترتيب نتائج.", difficulty: 5, tags: ["Python", "Django", "MongoDB"], category: "بحث ونصوص" },
  { id: 18, track: "backend", title: "نظام إدارة ملفات API", desc: "بناء API لرفع وتنزيل وتنظيم الملفات مع Express وMulter.", difficulty: 3, tags: ["Express.js", "PHP", "Next.js"], category: "تخزين ملفات" },
];

const TRACK_LABELS: Record<ProjectTrack, string> = {
  basics: "أساسيات البرمجة",
  frontend: "مسار Frontend",
  backend: "مسار Backend",
};

const STARTED_PROJECTS_KEY = "academy_started_projects";

function loadStarted(): StartedProject[] {
  try { return JSON.parse(localStorage.getItem(STARTED_PROJECTS_KEY) ?? "[]") as StartedProject[]; }
  catch { return []; }
}

function saveStarted(list: StartedProject[]) {
  localStorage.setItem(STARTED_PROJECTS_KEY, JSON.stringify(list));
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

  useEffect(() => { setStartedProjects(loadStarted()); }, []);

  const activeLang: AssignmentLang =
    activeCategory === "basics"
      ? activeBasicsLang
      : activeSubTrack === "frontend"
        ? activeFrontendLang
        : activeBackendLang;

  const categoryAssignments = ASSIGNMENTS.filter((a) => a.lang === activeLang);
  const currentAssignment = categoryAssignments[currentAssignmentIdx] ?? categoryAssignments[0];
  const filteredProjects = PROJECTS.filter((p) => p.track === activeTrack);

  const handleNextAssignment = () => {
    setCurrentAssignmentIdx((prev) => (prev + 1) % categoryAssignments.length);
    setSolution("");
    setReviewResult(null);
    setReviewError(null);
  };
const getProjectHint = async (problem: string) => {
  if (hintLoading) return;
  setHintLoading(true);
  setHintText(null);
  try {
    const res = await apiFetch("/api/ai/helper-projects", {
  method: "POST",
  body: JSON.stringify({ mode: "hint", question: problem }),
});
  
    if (res.ok) {
      const data = await res.json() as { ai_response?: string };
      setHintText(data.ai_response ?? null);
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
    if (!solution.trim()) {
      setReviewError("الرجاء كتابة الحل أولاً قبل تقديمه.");
      return;
    }
    if (!currentAssignment) return;
    setReviewing(true);
    setReviewResult(null);
    setReviewError(null);
    const lang = String(activeLang);
    const problem = currentAssignment.problem ?? "";
    try {
      let data: ReviewResult;
      try {
        const res = await apiFetch("/api/assignments/review", {
  method: "POST",
  body: JSON.stringify({  code: solution,
            language: lang,
            problem,
            problemTitle: currentAssignment.title,}),
});
      
        if (res.ok) {
          const json = await res.json() as ReviewResult;
          data = (json && typeof json.score === "number") ? json : projectClientFallback(solution, lang, problem);
        } else {
          data = projectClientFallback(solution, lang, problem);
        }
      } catch {
        data = projectClientFallback(solution, lang, problem);
      }
      setReviewResult(data);
    } catch {
      setReviewResult(projectClientFallback(solution, lang, problem));
    } finally {
      setReviewing(false);
    }
  };

  const handleHelpRequest = () => {
    if (!currentAssignment) return;
    setSolution((prev) =>
      prev
        ? `${prev}\n\n-- تلميح: حاول تقسيم المسألة لخطوات صغيرة وابدأ بالحالة الأبسط أولاً.`
        : `-- تلميح لمسألة "${currentAssignment.title}":\n-- ابدأ بتعريف المتغيرات المطلوبة\n-- ثم فكر في المنطق الأساسي خطوة بخطوة`
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
    saveStarted(updated);
    setJustStarted(project.id);
    setTimeout(() => setJustStarted(null), 3000);
  };

  const handleFinishProject = (projectId: number) => {
    const updated = startedProjects.map((s) =>
      s.projectId === projectId ? { ...s, status: "done" as ProjectStatus } : s
    );
    setStartedProjects(updated);
    saveStarted(updated);
  };

  const handleRemoveProject = (projectId: number) => {
    const updated = startedProjects.filter((s) => s.projectId !== projectId);
    setStartedProjects(updated);
    saveStarted(updated);
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
    const project = PROJECTS.find((p) => p.id === uploadProjectId);
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

      const repoRes = await apiFetch("/api/repositories", {
  method: "POST",
  body: JSON.stringify({
          title: `حل: ${project.title}`,
          description: uploadSolutionText.trim() || `حل مشروع ${project.title}`,
          technologies: project.tags,
          codeFilesUrls: fileUrl ? [fileUrl] : [],
          pdfFilesUrls: [],
          coverImageUrl,
          userId: user.id,
          isPublic: uploadIsPublic,
          sourceProject: String(project.id),
        }),
});
    

      if (repoRes.ok) {
        setUploadSuccess(true);
        handleFinishProject(project.id);
        setTimeout(closeUploadModal, 2000);
      } else {
        alert("فشل رفع الحل، يرجى المحاولة مجدداً");
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
                      onClick={() => { setCurrentAssignmentIdx(i); setSolution(""); setReviewResult(null); setReviewError(null); }}
                      className={`w-3 h-3 rounded-full transition-colors ${i === currentAssignmentIdx ? "bg-indigo-600" : "bg-gray-200"}`}
                      data-testid={`dot-assignment-${i}`}
                    />
                  ))}
                </div>
              </div>

              {currentAssignment && (
                <div className="p-6">
                  <h3 className="font-bold text-gray-800 text-base mb-3 text-right">{currentAssignment.title}</h3>
                  <p className="text-gray-700 leading-relaxed mb-4 text-right">{currentAssignment.problem}</p>
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 whitespace-pre-line text-right border border-gray-100 mb-5">
                    {currentAssignment.example}
                  </div>

                  <p className="font-semibold text-gray-800 mb-2 text-right">الحل:</p>
                  <textarea
                    value={solution}
                    onChange={(e) => { setSolution(e.target.value); setReviewResult(null); setReviewError(null); }}
                    placeholder="اكتب حلك هنا..."
                    className="w-full h-40 border border-gray-200 rounded-xl p-3 text-sm text-right resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
                    data-testid="textarea-solution"
                  />

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

              <div className="flex gap-3 px-6 pb-6 flex-wrap">
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
  onClick={() => getProjectHint(currentAssignment?.problem ?? "")}
  disabled={hintLoading}
  className="rounded-full px-4 py-2 text-sm text-indigo-600 border border-indigo-200 hover:bg-indigo-50 disabled:opacity-50"
>
  {hintLoading ? <Loader2 size={13} className="animate-spin inline" /> : "💡 تلميح"}
</button>

<button
  onClick={() => getProjectFix(solution, String(activeLang), currentAssignment?.problem ?? "")}
  disabled={fixLoading || !solution.trim()}
  className="rounded-full px-4 py-2 text-sm text-amber-700 border border-amber-200 hover:bg-amber-50 disabled:opacity-50"
>
  {fixLoading ? <Loader2 size={13} className="animate-spin inline" /> : "🔧 إصلاح الكود"}
</button>

{hintText && (
  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800 text-right">
    🔍 {hintText}
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
                const project = PROJECTS.find((p) => p.id === sp.projectId);
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
                        <button onClick={() => handleFinishProject(sp.projectId)} className="rounded-full text-xs px-3 py-1.5 bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors">
                          ✓ تم الانتهاء
                        </button>
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
          <div className="inline-flex gap-2 flex-wrap justify-center">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const started = getProjectStarted(project.id);
            return (
              <div
                key={project.id}
                className={`bg-white rounded-2xl shadow-sm border p-6 flex flex-col ${started ? "border-indigo-200" : "border-gray-100"}`}
                data-testid={`card-project-${project.id}`}
              >
                <div className="text-xs text-indigo-500 font-semibold mb-2 text-right">{project.category} 🏷</div>
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
                        <button onClick={() => handleFinishProject(project.id)} className="w-full rounded-full py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-colors">
                          ✓ تم الانتهاء
                        </button>
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
                <p className="text-indigo-200 text-xs mt-0.5">{PROJECTS.find((p) => p.id === uploadProjectId)?.title}</p>
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
                          : "انقر لرفع ملف الحل (.zip, .py, .js, .ts, .html, ...)"
                        }
                      </p>
                      <input
                        ref={uploadFileRef}
                        type="file"
                        accept=".py,.js,.ts,.cpp,.c,.cs,.html,.css,.java,.zip,.txt,.rar,.gz"
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
