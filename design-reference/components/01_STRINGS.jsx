/* ════════════════════════════════════════════════════════════════════
   i18n: UI strings, sample content (EN + AR), and the language context.
   ════════════════════════════════════════════════════════════════════ */

/* ── UI strings ──────────────────────────────────────────────────── */
const STRINGS = {
  en: {
    brandHeadline: "Drive Qatar's roads with confidence.",
    brandTagline: "Salama answers your driving, licensing and road-safety questions — and tells you exactly how much to trust every answer.",
    stat1a: "Official", stat1b: "traffic sources",
    stat2a: "Trust score", stat2b: "on every answer",
    stat3a: "العربية", stat3b: "& English",
    signupTitle: "Create your account", loginTitle: "Welcome back",
    signupSub: "Join Salama to start learning the road.", loginSub: "Sign in to continue.",
    email: "Email", username: "Username", password: "Password", confirm: "Confirm password",
    createBtn: "Create account", signinBtn: "Sign in",
    haveAccount: "Already have an account? ", noAccount: "New to Salama? ",
    signinLink: "Sign in", createLink: "Create one",

    welcomeTitle: "Your road-safety companion for Qatar",
    welcomeSub: "Ask about licenses, road rules, signs and safe driving. Every answer comes with a trust score.",
    inputPlaceholder: "Ask about driving in Qatar…",
    disclaimer: "Salama can make mistakes — check the trust score and verify critical info with the General Traffic Department.",

    newQuestion: "New question",
    modesLabel: "Modes", whatToDo: "What to do",
    matchedCaption: "Closest match in the official sign set",
    uploadCTA: "Upload a sign photo", uploadHint: "PNG or JPG — or attach one in the composer below",
    tryDemo: "Try the demo sign", examplesLabel: "Try describing one",
    searching: "Matching against the official sign set…",
    grpToday: "Today", grpYesterday: "Yesterday", grpEarlier: "Earlier",
    rename: "Rename", delete: "Delete",

    thinking: "Checking the official traffic sources…",
    analyzing: "Reading your image and checking the traffic sources…",
    attachPhoto: "Or upload a photo — try a traffic sign",
    signQuery: "What does this sign mean and what should I do?",
    removeImg: "Remove image",
    verifiedReliable: "Verified reliable", useCaution: "Use with caution", howWeKnow: "How we know",
    copy: "Copy", good: "Good answer", bad: "Bad answer", regen: "Regenerate",

    trustCheck: "Trust check", trustSub: "How sure Salama is about this answer",
    reliableTag: "Reliable", cautionTag: "Use with caution",
    reliableExp: "This answer is well grounded in the official traffic sources.",
    cautionExp: "Parts of this answer are inferred rather than found directly in the sources — double-check before relying on it.",
    mReliability: "Reliability", mEntropy: "Entropy", mCollision: "Collision entropy",
    hReliability: "How confident the model is that its words are grounded in the source documents. Higher is better.",
    hEntropy: "Spread of the model's word choices. Lower means it was more certain about what to say.",
    hCollision: "Sensitivity to the model's most likely answers colliding. Lower means a more focused answer.",
    wordLevel: "Word-level confidence", flagged: "flagged", confident: "confident",
    uqFooter: "Highlighted words are where the model was least certain. Salama always shows this so you can judge an answer before acting on it on the road.",
  },
  ar: {
    brandHeadline: "قُد على طرق قطر بثقة.",
    brandTagline: "تجيب سلامة عن أسئلتك حول القيادة والرخص والسلامة المرورية، وتخبرك بدقّة بمدى موثوقية كل إجابة.",
    stat1a: "مصادر", stat1b: "مرور رسمية",
    stat2a: "مؤشر موثوقية", stat2b: "مع كل إجابة",
    stat3a: "English", stat3b: "والعربية",
    signupTitle: "أنشئ حسابك", loginTitle: "مرحبًا بعودتك",
    signupSub: "انضمّ إلى سلامة لتتعلّم قيادة آمنة.", loginSub: "سجّل الدخول للمتابعة.",
    email: "البريد الإلكتروني", username: "اسم المستخدم", password: "كلمة المرور", confirm: "تأكيد كلمة المرور",
    createBtn: "إنشاء حساب", signinBtn: "تسجيل الدخول",
    haveAccount: "لديك حساب بالفعل؟ ", noAccount: "جديد على سلامة؟ ",
    signinLink: "سجّل الدخول", createLink: "أنشئ حسابًا",

    welcomeTitle: "رفيقك لقيادة آمنة في قطر",
    welcomeSub: "اسأل عن الرخص وقواعد المرور والإشارات والقيادة الآمنة. كل إجابة مصحوبة بمؤشّر موثوقية.",
    inputPlaceholder: "اسأل عن القيادة في قطر…",
    disclaimer: "قد تُخطئ سلامة — تحقّق من مؤشّر الموثوقية وراجع المعلومات الهامة مع الإدارة العامة للمرور.",

    newQuestion: "سؤال جديد",
    modesLabel: "الأوضاع", whatToDo: "ما يجب فعله",
    matchedCaption: "أقرب تطابق في مجموعة الإشارات الرسمية",
    uploadCTA: "ارفع صورة الإشارة", uploadHint: "PNG أو JPG — أو أرفقها في مربع الكتابة أدناه",
    tryDemo: "جرّب الإشارة التجريبية", examplesLabel: "جرّب وصف إحداها",
    searching: "نطابق مع مجموعة الإشارات الرسمية…",
    grpToday: "اليوم", grpYesterday: "أمس", grpEarlier: "سابقًا",
    rename: "إعادة تسمية", delete: "حذف",

    thinking: "نتحقّق من مصادر المرور الرسمية…",
    analyzing: "نقرأ صورتك ونتحقّق من مصادر المرور…",
    attachPhoto: "أو ارفع صورة — جرّب إشارة مرور",
    signQuery: "ماذا تعني هذه الإشارة وما الذي يجب أن أفعله؟",
    removeImg: "إزالة الصورة",
    verifiedReliable: "موثوقة", useCaution: "توخَّ الحذر", howWeKnow: "كيف عرفنا",
    copy: "نسخ", good: "إجابة جيدة", bad: "إجابة سيئة", regen: "إعادة التوليد",

    trustCheck: "فحص الموثوقية", trustSub: "مدى ثقة سلامة بهذه الإجابة",
    reliableTag: "موثوقة", cautionTag: "توخَّ الحذر",
    reliableExp: "هذه الإجابة مستندة جيدًا إلى مصادر المرور الرسمية.",
    cautionExp: "بعض أجزاء هذه الإجابة مستنتَجة وليست مأخوذة مباشرةً من المصادر — تحقّق قبل الاعتماد عليها.",
    mReliability: "الموثوقية", mEntropy: "الإنتروبيا", mCollision: "إنتروبيا التصادم",
    hReliability: "مدى ثقة النموذج بأن كلماته مستندة إلى المستندات المصدرية. كلما زادت كان أفضل.",
    hEntropy: "تشتّت اختيارات النموذج للكلمات. القيمة الأقل تعني يقينًا أكبر.",
    hCollision: "حساسية تصادم أكثر إجابات النموذج احتمالًا. القيمة الأقل تعني إجابة أكثر تركيزًا.",
    wordLevel: "الثقة على مستوى الكلمات", flagged: "مُعلَّمة", confident: "واثقة",
    uqFooter: "الكلمات المميَّزة هي حيث كان النموذج أقل يقينًا. تعرض سلامة ذلك دائمًا لتقيّم الإجابة قبل تطبيقها على الطريق.",
  },
};

/* ── tokenizer for the word-level confidence map ─────────────────── */
function toks(text, flags = []) {
  const set = new Set(flags);
  return text.split(/\s+/).map((w) => ({ t: w + " ", r: set.has(w) ? -0.13 : 0 }));
}

const REL_TEXT_EN = "When driving in a sandstorm in Doha, reduce your speed to suit the conditions, keep a safe distance from other vehicles, and use the right edge of the road as a guide. Switch your glare lights to low beam, use windscreen wipers, and stay alert to drivers who do not turn on their headlights.";
const UNREL_TEXT_EN = "According to the provided sources, there is no direct information on where to renew a car plate. However, for renewing a driving license you should go to the Traffic Department. The source does not specify if this applies to plates, so this answer is based on an assumption. For accurate details, contact the General Traffic Department directly.";
const REL_TEXT_AR = "عند القيادة أثناء العاصفة الرملية في الدوحة، خفّف سرعتك بما يتناسب مع الظروف، وحافظ على مسافة آمنة عن المركبات الأخرى، واستخدم الحافة اليمنى للطريق كدليل. حوّل الأضواء العالية إلى المنخفضة، واستخدم مسّاحات الزجاج، وانتبه للسائقين الذين لا يشغّلون أضواءهم.";
const UNREL_TEXT_AR = "وفقًا للمصادر المتاحة، لا توجد معلومات مباشرة حول مكان تجديد لوحة السيارة. لكن لتجديد رخصة القيادة، عليك التوجّه إلى إدارة المرور خلال ثلاثين يومًا من انتهائها. لا تحدّد المصادر ما إذا كان هذا ينطبق على اللوحات، لذا فإن هذه الإجابة مبنية على افتراض. للحصول على معلومات دقيقة، تواصل مع الإدارة العامة للمرور مباشرةً.";
const SIGN_TEXT_EN = "This is a No Entry sign. It means entry is prohibited for all vehicles in this direction, so you must not drive past it. The road ahead is closed to you or runs one-way against you, so take an alternative route. Ignoring this sign is a traffic violation that can carry a fine.";
const SIGN_TEXT_AR = "هذه إشارة ممنوع الدخول. تعني أن دخول جميع المركبات ممنوع في هذا الاتجاه، لذا يجب ألا تتجاوزها. الطريق أمامك مغلق أو باتجاه واحد عكس اتجاهك، لذا اسلك طريقًا بديلًا. تجاهل هذه الإشارة مخالفة مرورية قد تترتب عليها غرامة.";

/* ── Sample conversations ────────────────────────────────────────── */
const SAMPLE_I18N = {
  en: {
    reliable: {
      answer: "When driving in a sandstorm in Doha, the General Traffic Department advises you to:",
      points: [
        "Reduce your speed to suit the conditions and the intensity of the storm.",
        "Keep a safe distance from other vehicles — you'll need more room to stop.",
        "Use the right edge of the road as a guide while driving.",
        "Switch glare lights to low beam to prevent dazzling other drivers.",
        "Use windscreen wipers and the humidity remover to keep visibility clear.",
        "Stay alert to drivers who do not turn on their headlights.",
      ],
      source: "eng-book-traffic2.pdf · §4 Adverse weather",
      verdict: "reliable", confidence: 0.78,
      metrics: { reliability: -0.07348, entropy: 2.34898, collision: 1.82597 },
      tokens: toks(REL_TEXT_EN),
    },
    unreliable: {
      answer: "According to the provided sources, there's no direct guidance on renewing a car license plate. Based on related rules:",
      points: [
        "For renewing a driving license, you should visit the Traffic Department or its nearest branch within 30 days of expiry.",
        "The sources don't confirm whether the same applies to license plates.",
      ],
      note: "Part of this answer is inferred, not found directly in the sources. Please verify with the General Traffic Department.",
      source: "Inferred · not directly sourced",
      verdict: "unreliable", confidence: 0.34,
      metrics: { reliability: -0.11908, entropy: 3.63371, collision: 2.97456 },
      tokens: toks(UNREL_TEXT_EN, ["According", "for", "you", "The", "does", "if", "this", "an", "assumption.", "accurate", "General"]),
    },
    sign: {
      answer: "This is a No Entry sign. Here's what it means and what you should do:",
      points: [
        "Entry is prohibited for all vehicles in this direction.",
        "Do not drive past the sign — the road ahead is closed to you or runs one-way against you.",
        "Take an alternative route. Ignoring it is a traffic violation that can carry a fine and black points.",
      ],
      source: "eng-book-traffic2.pdf · §2 Prohibitory signs",
      verdict: "reliable", confidence: 0.82,
      metrics: { reliability: -0.05912, entropy: 1.98123, collision: 1.44201 },
      tokens: toks(SIGN_TEXT_EN),
    },
  },
  ar: {    reliable: {
      answer: "عند القيادة أثناء العاصفة الرملية في الدوحة، تنصحك الإدارة العامة للمرور بما يلي:",
      points: [
        "خفّف سرعتك بما يتناسب مع الظروف وشدّة العاصفة.",
        "حافظ على مسافة آمنة عن المركبات الأخرى — ستحتاج مسافة أطول للتوقف.",
        "استخدم الحافة اليمنى للطريق كدليل أثناء القيادة.",
        "حوّل الأضواء العالية إلى المنخفضة لتجنّب إبهار السائقين الآخرين.",
        "استخدم مسّاحات الزجاج ومزيل الرطوبة للحفاظ على وضوح الرؤية.",
        "انتبه للسائقين الذين لا يشغّلون أضواءهم.",
      ],
      source: "eng-book-traffic2.pdf · القسم ٤ الأحوال الجوية",
      verdict: "reliable", confidence: 0.78,
      metrics: { reliability: -0.07348, entropy: 2.34898, collision: 1.82597 },
      tokens: toks(REL_TEXT_AR),
    },
    unreliable: {
      answer: "وفقًا للمصادر المتاحة، لا توجد إرشادات مباشرة حول تجديد لوحة السيارة. استنادًا إلى القواعد ذات الصلة:",
      points: [
        "لتجديد رخصة القيادة، عليك زيارة إدارة المرور أو أقرب فرع لها خلال ٣٠ يومًا من انتهائها.",
        "لا تؤكّد المصادر ما إذا كان الأمر نفسه ينطبق على لوحات السيارات.",
      ],
      note: "جزء من هذه الإجابة مستنتَج وليس موجودًا مباشرةً في المصادر. يُرجى التحقّق مع الإدارة العامة للمرور.",
      source: "مستنتَج · غير مأخوذ من مصدر مباشر",
      verdict: "unreliable", confidence: 0.34,
      metrics: { reliability: -0.11908, entropy: 3.63371, collision: 2.97456 },
      tokens: toks(UNREL_TEXT_AR, ["وفقًا", "مباشرة", "لكن", "هذا", "افتراض.", "دقيقة،", "مباشرةً."]),
    },
    sign: {
      answer: "هذه إشارة «ممنوع الدخول». إليك معناها وما يجب أن تفعله:",
      points: [
        "يُمنع دخول جميع المركبات في هذا الاتجاه.",
        "لا تتجاوز الإشارة — الطريق أمامك مغلق أو باتجاه واحد عكس اتجاهك.",
        "اسلك طريقًا بديلًا. تجاهل الإشارة مخالفة مرورية قد تترتب عليها غرامة ونقاط مرورية.",
      ],
      source: "eng-book-traffic2.pdf · القسم ٢ إشارات المنع",
      verdict: "reliable", confidence: 0.82,
      metrics: { reliability: -0.05912, entropy: 1.98123, collision: 1.44201 },
      tokens: toks(SIGN_TEXT_AR),
    },
  },
};

/* ── Suggestions & history ───────────────────────────────────────── */
const SUGGESTIONS_I18N = {
  en: [
    { icon: "id", kind: "reliable", title: "Driving licenses", sub: "What types exist in Qatar?", q: "What are the different types of driving licenses in Qatar?" },
    { icon: "storm", kind: "reliable", title: "Sandstorm driving", sub: "How do I stay safe in Doha?", q: "What should I remember when driving in a sandstorm in Doha?" },
    { icon: "warning", kind: "reliable", title: "Warning lights", sub: "Engine oil pressure is on", q: "What action should I take if the engine oil pressure warning indicator is on?" },
    { icon: "plate", kind: "unreliable", title: "License plate", sub: "Where do I renew it?", q: "Where should I go if I want to renew my car license plate?" },
  ],
  ar: [
    { icon: "id", kind: "reliable", title: "أنواع الرخص", sub: "ما المتوفّر في قطر؟", q: "ما هي أنواع رخص القيادة المختلفة في قطر؟" },
    { icon: "storm", kind: "reliable", title: "القيادة في العاصفة", sub: "كيف أبقى آمنًا في الدوحة؟", q: "ما الذي يجب تذكّره عند القيادة في عاصفة رملية بالدوحة؟" },
    { icon: "warning", kind: "reliable", title: "أضواء التحذير", sub: "إضاءة ضغط زيت المحرك", q: "ماذا أفعل إذا أضاء مؤشّر ضغط زيت المحرك؟" },
    { icon: "plate", kind: "unreliable", title: "لوحة السيارة", sub: "أين أجدّدها؟", q: "أين أذهب لتجديد لوحة سيارتي؟" },
  ],
};

const HISTORY_I18N = {
  en: [
    { t: "Driving in a sandstorm", w: "Today" },
    { t: "Types of driving licenses", w: "Today" },
    { t: "Engine oil pressure light", w: "Yesterday" },
    { t: "Renewing my license plate", w: "Yesterday" },
    { t: "Speed limits on Doha highways", w: "Earlier" },
    { t: "Parking fines & violations", w: "Earlier" },
  ],
  ar: [
    { t: "القيادة في عاصفة رملية", w: "Today" },
    { t: "أنواع رخص القيادة", w: "Today" },
    { t: "مؤشّر ضغط زيت المحرك", w: "Yesterday" },
    { t: "تجديد لوحة سيارتي", w: "Yesterday" },
    { t: "حدود السرعة على طرق الدوحة", w: "Earlier" },
    { t: "مخالفات وغرامات الوقوف", w: "Earlier" },
  ],
};

/* ── Language context ────────────────────────────────────────────── */
const LangContext = React.createContext(null);
const useLang = () => React.useContext(LangContext);

Object.assign(window, { STRINGS, SAMPLE_I18N, SUGGESTIONS_I18N, HISTORY_I18N, LangContext, useLang });
