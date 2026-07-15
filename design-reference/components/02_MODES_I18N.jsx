/* ════════════════════════════════════════════════════════════════════
   Chat modes + the sign library used by "Name the sign".
   A mode is just a preset: it swaps the welcome priming, the composer
   placeholder, and the shape of Salama's reply. Same chat engine.
   ════════════════════════════════════════════════════════════════════ */

const MODES_I18N = {
  en: {
    ask: {
      id: "ask", icon: "chat", label: "Ask Salama", sub: "Driving, rules & safety",
      welcomeTitle: "Your road-safety companion for Qatar",
      welcomeSub: "Ask about licenses, road rules, signs and safe driving. Every answer comes with a trust score.",
      placeholder: "Ask about driving in Qatar…",
    },
    read: {
      id: "read", icon: "image", label: "Read the sign", sub: "Photo → meaning",
      welcomeTitle: "Read a road sign",
      welcomeSub: "Attach a photo of any road sign — Salama reads it, tells you what it means and what to do, with a trust score. No question needed.",
      placeholder: "Attach a sign photo — add a note if you like",
    },
    name: {
      id: "name", icon: "search", label: "Name the sign", sub: "Describe → official sign",
      welcomeTitle: "Describe a sign",
      welcomeSub: "Describe what you remember and Salama returns the matching official sign — image, name and what it means.",
      placeholder: "Describe the sign you have in mind…",
      examples: [
        "A red disc with a white horizontal bar",
        "A red octagon with white letters",
        "A triangle with three arrows in a ring",
      ],
    },
  },
  ar: {
    ask: {
      id: "ask", icon: "chat", label: "اسأل سلامة", sub: "القيادة والقواعد والسلامة",
      welcomeTitle: "رفيقك لقيادة آمنة في قطر",
      welcomeSub: "اسأل عن الرخص وقواعد المرور والإشارات والقيادة الآمنة. كل إجابة مصحوبة بمؤشّر موثوقية.",
      placeholder: "اسأل عن القيادة في قطر…",
    },
    read: {
      id: "read", icon: "image", label: "اقرأ الإشارة", sub: "صورة ← معنى",
      welcomeTitle: "اقرأ إشارة طريق",
      welcomeSub: "أرفق صورة لأي إشارة طريق — تقرأها سلامة وتخبرك بمعناها وما يجب فعله، مع مؤشّر موثوقية. دون الحاجة لسؤال.",
      placeholder: "أرفق صورة إشارة — وأضف ملاحظة إن أردت",
    },
    name: {
      id: "name", icon: "search", label: "سمِّ الإشارة", sub: "وصف ← صورة",
      welcomeTitle: "صِف إشارة",
      welcomeSub: "صِف ما تتذكّره فتعيد سلامة الإشارة الرسمية المطابقة — صورتها واسمها ومعناها.",
      placeholder: "صِف الإشارة التي تفكّر بها…",
      examples: [
        "قرص أحمر يتوسّطه شريط أبيض أفقي",
        "مثمّن أحمر بحروف بيضاء",
        "مثلث فيه ثلاثة أسهم في حلقة",
      ],
    },
  },
};
const MODE_ORDER = ["ask", "read", "name"];

/* ── Sign library (one real photo + clean category diagrams) ──────── */
const signImg = () => (typeof window !== "undefined" && window.__resources && window.__resources.signDemo) || "../assets/sign-demo.png";

const SIGN_LIBRARY = [
  {
    id: "no-entry", cat: "prohibition", shape: "circle", glyph: "—", real: true,
    name: { en: "No Entry", ar: "ممنوع الدخول" },
    keywords: {
      en: ["red", "disc", "circle", "round", "white", "bar", "horizontal", "line", "no entry", "do not enter"],
      ar: ["أحمر", "قرص", "دائرة", "دائري", "أبيض", "شريط", "أفقي", "خط", "ممنوع", "الدخول"]
    },
    explain: {
      en: {
        points: ["Entry is prohibited for all vehicles in this direction.",
          "Do not drive past it — the road ahead is closed to you or one-way against you.",
          "Take an alternative route; ignoring it is a violation with a fine and black points."],
        source: "eng-book-traffic2.pdf · §2 Prohibitory signs", verdict: "reliable", confidence: 0.86
      },
      ar: {
        points: ["يُمنع دخول جميع المركبات في هذا الاتجاه.",
          "لا تتجاوزها — الطريق أمامك مغلق أو باتجاه واحد عكسك.",
          "اسلك طريقًا بديلًا؛ تجاهلها مخالفة بغرامة ونقاط سوداء."],
        source: "eng-book-traffic2.pdf · القسم ٢ إشارات المنع", verdict: "reliable", confidence: 0.86
      },
    },
  },
  {
    id: "stop", cat: "prohibition", shape: "octagon", glyph: "STOP",
    name: { en: "Stop", ar: "قف" },
    keywords: {
      en: ["octagon", "eight", "red", "stop", "letters", "text", "sided"],
      ar: ["مثمن", "ثماني", "أحمر", "قف", "حروف", "نص"]
    },
    explain: {
      en: {
        points: ["Come to a complete stop at the line — not just a slow roll.",
          "Give way to all traffic and pedestrians before moving off.",
          "Move only when the way is clearly safe."],
        source: "eng-book-traffic2.pdf · §2 Priority signs", verdict: "reliable", confidence: 0.84
      },
      ar: {
        points: ["قف توقّفًا تامًّا عند الخط — لا مجرّد تباطؤ.",
          "أعطِ الأولوية لكل المركبات والمشاة قبل التحرّك.",
          "تحرّك فقط عندما يكون الطريق آمنًا بوضوح."],
        source: "eng-book-traffic2.pdf · القسم ٢ إشارات الأولوية", verdict: "reliable", confidence: 0.84
      },
    },
  },
  {
    id: "roundabout", cat: "warning", shape: "triangle", glyph: "↻",
    name: { en: "Roundabout Ahead", ar: "دوّار أمامك" },
    keywords: {
      en: ["triangle", "warning", "roundabout", "arrows", "ring", "circle arrows", "three arrows", "circular"],
      ar: ["مثلث", "تحذير", "دوار", "أسهم", "حلقة", "ثلاثة", "دائري"]
    },
    explain: {
      en: {
        points: ["Slow down on approach and watch for vehicles from your right.",
          "Give way to traffic already circulating unless signed otherwise.",
          "Signal left as you leave at your exit."],
        source: "eng-book-traffic2.pdf · §1 Warning signs", verdict: "reliable", confidence: 0.77
      },
      ar: {
        points: ["خفّف السرعة عند الاقتراب وانتبه للمركبات من يمينك.",
          "أعطِ الأولوية للمركبات الدائرة ما لم تُشِر لوحة بغير ذلك.",
          "أشّر لليسار عند خروجك من المخرج."],
        source: "eng-book-traffic2.pdf · القسم ١ إشارات التحذير", verdict: "reliable", confidence: 0.77
      },
    },
  },
  {
    id: "no-overtaking", cat: "prohibition", shape: "circle", glyph: "⇄",
    name: { en: "No Overtaking", ar: "ممنوع التجاوز" },
    keywords: {
      en: ["overtaking", "passing", "two cars", "red ring", "cars", "pass"],
      ar: ["تجاوز", "سيارتين", "حلقة", "مركبتين", "تخطي"]
    },
    explain: {
      en: {
        points: ["Do not pass the vehicle ahead until the restriction ends.",
          "Stay in your lane; the ban is usually due to limited sight lines.",
          "It lifts at the matching end-of-restriction sign."],
        source: "eng-book-traffic2.pdf · §2 Prohibitory signs", verdict: "reliable", confidence: 0.79
      },
      ar: {
        points: ["لا تتجاوز المركبة التي أمامك حتى ينتهي المنع.",
          "ابقَ في مسارك؛ يُفرض المنع عادةً لمحدودية الرؤية.",
          "يُرفع عند إشارة نهاية التقييد المقابلة."],
        source: "eng-book-traffic2.pdf · القسم ٢ إشارات المنع", verdict: "reliable", confidence: 0.79
      },
    },
  },
  {
    id: "no-parking", cat: "mandatory", shape: "circle", glyph: "P",
    name: { en: "No Parking", ar: "ممنوع الوقوف" },
    keywords: {
      en: ["parking", "blue", "slash", "diagonal", "p"],
      ar: ["وقوف", "أزرق", "خط مائل", "مائل"]
    },
    explain: {
      en: {
        points: ["You may stop briefly to pick up or drop off, but not leave the car parked.",
          "Do not leave the vehicle unattended within the restricted zone.",
          "Check any time plate; parking here risks a fine and towing."],
        source: "Inferred · confirm local plate", verdict: "unreliable", confidence: 0.41, note: true
      },
      ar: {
        points: ["يمكنك التوقّف لحظيًّا للركوب أو النزول دون ترك السيارة واقفة.",
          "لا تترك المركبة دون سائق داخل المنطقة المقيّدة.",
          "راجع لوحة التوقيت؛ الوقوف هنا يعرّضك لغرامة وسحب."],
        source: "مستنتَج · تأكّد من اللوحة المحلية", verdict: "unreliable", confidence: 0.41, note: true
      },
    },
  },
];

/* ── naive description → sign matcher ─────────────────────────────── */
function matchSign(desc, lang) {
  const d = (desc || "").toLowerCase();
  let best = SIGN_LIBRARY[0], bestScore = -1;
  for (const s of SIGN_LIBRARY) {
    const kws = (s.keywords[lang] || []).concat(s.keywords.en || []);
    let score = 0;
    for (const k of kws) if (d.includes(k.toLowerCase())) score += 1;
    if (score > bestScore) { bestScore = score; best = s; }
  }
  const body = best.explain[lang];
  const sign = { id: best.id, real: best.real, img: best.real ? signImg() : null, cat: best.cat, shape: best.shape, glyph: best.glyph, name: best.name };
  const answer = lang === "ar"
    ? `أقرب تطابق هو إشارة «${best.name.ar}». إليك معناها:`
    : `The closest match is the ${best.name.en} sign. Here's what it means:`;
  return {
    answer, points: body.points, source: body.source,
    verdict: body.verdict, confidence: body.confidence, note: body.note,
    sign, signName: best.name[lang],
  };
}

Object.assign(window, { MODES_I18N, MODE_ORDER, SIGN_LIBRARY, matchSign });
