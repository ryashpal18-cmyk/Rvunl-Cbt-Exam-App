import { Difficulty, Paper, Question, SUBJECTS, Subject } from '../types/exam';

const topicRules: Partial<Record<Subject, [string, RegExp][]>> = {
  Mathematics: [
    ['LCM–HCF', /\b(lcm|hcf|least common multiple|highest common factor)\b|लघुत्तम|महत्तम|ल\.स\.प|म\.स\.प/i],
    ['प्रतिशत / Percentage', /percentage|percent|%|प्रतिशत/i],
    ['लाभ और हानि / Profit & loss', /profit|loss|discount|selling price|cost price|लाभ|हानि|छूट/i],
    ['अनुपात / Ratio', /ratio|proportion|अनुपात|समानुपात/i],
    ['औसत / Average', /average|mean of|औसत/i],
    ['समय और कार्य / Time & work', /days to (finish|complete)|work together|कार्य.*दिन|काम.*दिन/i],
    ['ब्याज / Interest', /interest|ब्याज/i],
  ],
  'Reasoning & Mental Ability': [
    ['कैलेंडर / Calendar', /calendar|day of the week|what day|leap year|कैलेंडर|अधिवर्ष|कौन सा दिन/i],
    ['घड़ी / Clock', /clock|minute hand|hour hand|घड़ी|घड़ी/i],
    ['श्रृंखला / Series', /series|next (number|term)|श्रृंखला|अगली संख्या/i],
    ['कोडिंग / Coding', /coded|coding|कूट|कोड/i],
    ['रक्त संबंध / Relationships', /blood relation|related to|रक्त संबंध/i],
  ],
  'Hindi General': [
    ['संधि / Sandhi', /संधि|सन्धि/], ['समास / Samas', /समास/],
    ['पर्यायवाची / Synonyms', /पर्याय/], ['विलोम / Antonyms', /विलोम/],
    ['मुहावरे / Idioms', /मुहावर|लोकोक्ति/],
  ],
  'English General': [
    ['Vocabulary / शब्दावली', /synonym|antonym|meaning|one word/i],
    ['Articles / आर्टिकल', /\barticle\b/i], ['Tenses / काल', /\btense\b/i],
    ['Error detection / त्रुटि पहचान', /error|incorrect part/i],
  ],
  'Rajasthan GK': [
    ['मेले और त्योहार / Fairs & festivals', /\bfair\b|festival|मेला|मेले|त्योहार|उत्सव/i],
    ['किले और महल / Forts & palaces', /fort|palace|दुर्ग|किला|गढ़|महल/i],
    ['नदियाँ और झीलें / Rivers & lakes', /river|lake|नदी|झील/i],
    ['लोक कला / Folk arts', /folk|dance|paintings|लोक|नृत्य|चित्रकला/i],
  ],
  'World, India & Everyday Science': [
    ['जीव विज्ञान / Biology', /human|vitamin|plant|blood|body|cells?|मानव|पादप|विटामिन|रक्त/i],
    ['भौतिक विज्ञान / Physics', /force|energy|velocity|light|sound|ध्वनि|प्रकाश|बल|ऊर्जा/i],
    ['रसायन विज्ञान / Chemistry', /acid|chemical|compound|element|रासायनिक|अम्ल|यौगिक/i],
  ],
};

export function questionTopic(question: Question): string {
  return question.topic?.trim()
    || topicRules[question.subject]?.find(([, pattern]) => pattern.test(`${question.question_en} ${question.question_hi}`))?.[0]
    || 'सामान्य / General';
}

export function normalizeSearch(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function questionKey(question: Question): string {
  const english = normalizeSearch(question.question_en);
  const hindi = normalizeSearch(question.question_hi);
  const options = (english ? question.options_en : question.options_hi).map(normalizeSearch).sort();
  return JSON.stringify([question.subject, english || hindi, options]);
}

export function topicKey(subject: Subject, topic: string): string {
  return JSON.stringify([subject, normalizeSearch(topic)]);
}

export function syllabusTopics(papers: Paper[]) {
  const topics = new Map<string, { subject: Subject; topic: string }>();
  for (const subject of SUBJECTS) {
    for (const [topic] of topicRules[subject] ?? []) topics.set(topicKey(subject, topic), { subject, topic });
  }
  for (const paper of papers) for (const question of paper.questions) {
    const topic = questionTopic(question);
    topics.set(topicKey(question.subject, topic), { subject: question.subject, topic });
  }
  return [...topics.values()];
}

export function bankQuestions(papers: Paper[]): BankQuestion[] {
  const unique = new Map<string, BankQuestion>();
  for (const paper of papers) for (const question of paper.questions) {
    const key = questionKey(question);
    if (!unique.has(key)) unique.set(key, {
      ...question,
      key,
      topic: questionTopic(question),
      difficulty: question.difficulty ?? paper.difficulty ?? 'Medium',
      source: question.source ?? { title: paper.title, year: paper.year },
    });
  }
  return [...unique.values()];
}

export interface BankQuestion extends Question {
  key: string;
  topic: string;
  difficulty: Difficulty;
}

export function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
