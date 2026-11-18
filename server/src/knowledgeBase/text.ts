const STOP_WORDS = new Set(
  `a about after again all also am an and any are as at be been before being both but by can
  could did do does doing done during each else for from get got had has have having he her here
  hers him his how i if in into is it its just let like may me might mine more most must my
  need of off on once only or other our ours out over please really same she should so some
  still such tell than that the their them then there these they this those through to too
  under until up us very want was we were what when which while who whom whose why will with
  would yes yet you your yours hi hello thanks thank okay ok know s t ll ve re d m
  bad good great see kind sort thing things something anything maybe actually basically
  right well sure oh um uh gonna wanna go going come today tomorrow tonight one two three`.split(
    /\s+/,
  ),
);

const SYNONYMS: Record<string, string> = {
  cost: "price",
  fee: "price",
  charge: "price",
  much: "price",
  expensive: "price",
  cheap: "price",
  afford: "price",
  rate: "price",
  pay: "payment",
  paid: "payment",
  hurt: "pain",
  ache: "pain",
  aching: "pain",
  toothache: "pain",
  sore: "pain",
  painful: "pain",
  urgent: "emergency",
  urgently: "emergency",
  asap: "emergency",
  kid: "child",
  children: "child",
  son: "child",
  daughter: "child",
  toddler: "child",
  baby: "child",
  pediatric: "child",
  open: "hours",
  close: "hours",
  where: "address",
  location: "address",
  locat: "address",
  directions: "address",
  doctor: "dentist",
  dr: "dentist",
  coverage: "insurance",
  cover: "insurance",
  covered: "insurance",
  insur: "insurance",
  uninsur: "uninsured",
  without: "uninsured",
  clean: "cleaning",
  hygiene: "cleaning",
  whiten: "whitening",
  whiter: "whitening",
  bleach: "whitening",
  braces: "aligner",
  brace: "aligner",
  invisalign: "aligner",
  straighten: "aligner",
  crooked: "aligner",
  pull: "extraction",
  extract: "extraction",
  removal: "extraction",
  cavity: "filling",
  cavities: "filling",
  fill: "filling",
  cancellation: "cancel",
  reschedul: "reschedule",
  move: "reschedule",
  park: "parking",
  scared: "anxious",
  afraid: "anxious",
  nervous: "anxious",
  fear: "anxious",
  anxiety: "anxious",
  español: "spanish",
  long: "minute",
  duration: "minute",
  hour: "hours",
  prescribe: "prescription",
  prescrib: "prescription",
  teeth: "tooth",
  espanol: "spanish",
};

export function stem(word: string): string {
  if (word.length > 5 && word.endsWith("ing")) {
    return word.slice(0, -3);
  }

  if (word.length > 4 && word.endsWith("ies")) {
    return `${word.slice(0, -3)}y`;
  }

  if (word.length > 4 && word.endsWith("ed")) {
    return word.slice(0, -2);
  }

  if (word.length > 3 && word.endsWith("s") && !/(ss|us|is)$/.test(word)) {
    return word.slice(0, -1);
  }

  return word;
}

function term(word: string): string {
  const stemmed = stem(word);

  return SYNONYMS[stemmed] ?? SYNONYMS[word] ?? stemmed;
}

export function tokenize(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/x-?rays?/g, "xray")
    .replace(/['’]/g, " ");
  const words = normalized.match(/[\p{L}\p{N}]+/gu) ?? [];

  return words.filter((w) => !STOP_WORDS.has(w) && !/^\d+$/.test(w)).map(term);
}
