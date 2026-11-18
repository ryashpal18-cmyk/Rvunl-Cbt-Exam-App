import { Paper, Question, Subject, SUBJECTS } from '../types/exam';

type Pair = readonly [english: string, hindi: string];
type Exercise = {
  prompt: Pair;
  answer: Pair;
  distractors: readonly Pair[];
  topic: string;
  explanation?: Pair;
};

const same = (text: string | number): Pair => [String(text), String(text)];

function exercise(prompt: Pair, answer: Pair, pool: readonly Pair[], topic: string, explanation?: Pair): Exercise {
  const distractors = pool.filter(([english, hindi]) => english !== answer[0] && hindi !== answer[1]);
  return { prompt, answer, distractors, topic, explanation };
}

function makeQuestion(subject: Subject, item: Exercise, index: number): Question {
  const distractors = Array.from({ length: 4 }, (_, offset) => item.distractors[(index * 3 + offset) % item.distractors.length]);
  const correctIndex = (index * 7 + Math.floor(index / 5)) % 5;
  const choices = [...distractors];
  choices.splice(correctIndex, 0, item.answer);
  const [explanation_en, explanation_hi] = item.explanation ?? [
    `The correct answer is ${item.answer[0]}.`, `सही उत्तर ${item.answer[1]} है।`,
  ];
  return {
    id: index + 1, subject,
    marks: subject === 'Rajasthan GK' || subject === 'World, India & Everyday Science' ? 2 : 1,
    question_en: item.prompt[0], question_hi: item.prompt[1],
    options_en: [choices[0][0], choices[1][0], choices[2][0], choices[3][0], choices[4][0]],
    options_hi: [choices[0][1], choices[1][1], choices[2][1], choices[3][1], choices[4][1]],
    correctIndex, explanation_en, explanation_hi, topic: item.topic, difficulty: 'Medium',
  };
}

const rajasthanSites: readonly [destination: Pair, sites: readonly Pair[]][] = [
  [['Jaipur', 'जयपुर'], [['Hawa Mahal', 'हवा महल'], ['Amber Palace', 'आमेर महल'], ['Nahargarh Fort', 'नाहरगढ़ दुर्ग'], ['Jaigarh Fort', 'जयगढ़ दुर्ग'], ['Albert Hall Museum', 'अल्बर्ट हॉल संग्रहालय'], ['Galta Ji', 'गलता जी']]],
  [['Jodhpur', 'जोधपुर'], [['Mehrangarh Fort', 'मेहरानगढ़ दुर्ग'], ['Jaswant Thada', 'जसवंत थड़ा'], ['Umaid Bhawan Palace', 'उम्मेद भवन महल'], ['Mandore Gardens', 'मंडोर उद्यान'], ['Kailana Lake', 'कायलाना झील']]],
  [['Udaipur', 'उदयपुर'], [['Lake Pichola', 'पिछोला झील'], ['Fateh Sagar Lake', 'फतेह सागर झील'], ['Saheliyon Ki Bari', 'सहेलियों की बाड़ी'], ['Sajjangarh Palace', 'सज्जनगढ़ महल'], ['Bagore Ki Haveli', 'बागोर की हवेली'], ['Jagdish Temple', 'जगदीश मंदिर']]],
  [['Jaisalmer', 'जैसलमेर'], [['Sonar Qila', 'सोनार किला'], ['Patwon Ki Haveli', 'पटवों की हवेली'], ['Gadisar Lake', 'गड़ीसर झील'], ['Sam Sand Dunes', 'सम के धोरे'], ['Kuldhara', 'कुलधरा'], ['Bada Bagh cenotaphs', 'बड़ा बाग की छतरियाँ']]],
  [['Bikaner', 'बीकानेर'], [['Junagarh Fort', 'जूनागढ़ दुर्ग'], ['Lalgarh Palace', 'लालगढ़ महल'], ['Ganga Government Museum', 'गंगा राजकीय संग्रहालय'], ['Bhandasar Jain Temple', 'भांडासर जैन मंदिर']]],
  [['Bundi', 'बूँदी'], [['Raniji Ki Baori', 'रानीजी की बावड़ी'], ['Nawal Sagar', 'नवल सागर'], ['Chaurasi Khambon Ki Chhatri', 'चौरासी खंभों की छतरी'], ['Sukh Mahal', 'सुख महल']]],
  [['Kota', 'कोटा'], [['Kishore Sagar', 'किशोर सागर'], ['Jagmandir in Kishore Sagar', 'किशोर सागर का जगमंदिर'], ['Chambal Garden', 'चंबल उद्यान'], ['Garh Palace', 'गढ़ महल']]],
  [['Bharatpur', 'भरतपुर'], [['Lohagarh Fort', 'लोहागढ़ दुर्ग'], ['Keoladeo National Park', 'केवलादेव राष्ट्रीय उद्यान'], ['Laxman Mandir', 'लक्ष्मण मंदिर']]],
  [['Sawai Madhopur', 'सवाई माधोपुर'], [['Ranthambore National Park', 'रणथंभौर राष्ट्रीय उद्यान'], ['Ranthambore Fort', 'रणथंभौर दुर्ग'], ['Trinetra Ganesh Temple in Ranthambore', 'रणथंभौर का त्रिनेत्र गणेश मंदिर']]],
  [['Mount Abu', 'माउंट आबू'], [['Nakki Lake', 'नक्की झील'], ['Dilwara Jain Temples', 'देलवाड़ा जैन मंदिर'], ['Guru Shikhar', 'गुरु शिखर']]],
  [['Ajmer', 'अजमेर'], [['Ana Sagar Lake', 'आना सागर झील'], ['Adhai Din Ka Jhonpra', 'अढ़ाई दिन का झोंपड़ा'], ['Ajmer Sharif Dargah', 'अजमेर शरीफ़ दरगाह']]],
  [['Chittorgarh', 'चित्तौड़गढ़'], [['Vijay Stambha built by Rana Kumbha', 'राणा कुंभा का विजय स्तंभ'], ['Kirti Stambha in Chittor Fort', 'चित्तौड़ दुर्ग का कीर्ति स्तंभ'], ['Gaumukh Reservoir in Chittor Fort', 'चित्तौड़ दुर्ग का गौमुख कुंड']]],
  [['Pali district', 'पाली ज़िला'], [['Ranakpur Jain Temple', 'रणकपुर जैन मंदिर']]],
  [['Pushkar', 'पुष्कर'], [['Jagatpita Brahma Temple', 'जगतपिता ब्रह्मा मंदिर']]],
];

const rajasthan = rajasthanSites.flatMap(([destination, sites]) => sites.map(([english, hindi]) => exercise(
  [`Which Rajasthan destination is associated with ${english}?`, `‘${hindi}’ राजस्थान के किस स्थान से जुड़ा है?`],
  destination, rajasthanSites.map(([place]) => place), 'राजस्थान के दर्शनीय स्थल / Rajasthan landmarks',
  [`${english} is associated with ${destination[0]}.`, `‘${hindi}’ का संबंध ${destination[1]} से है।`],
)));

const elements: readonly [english: string, hindi: string, symbol: string][] = [
  ['Hydrogen','हाइड्रोजन','H'], ['Helium','हीलियम','He'], ['Lithium','लिथियम','Li'],
  ['Carbon','कार्बन','C'], ['Nitrogen','नाइट्रोजन','N'], ['Oxygen','ऑक्सीजन','O'],
  ['Fluorine','फ्लोरीन','F'], ['Neon','नियॉन','Ne'], ['Sodium','सोडियम','Na'],
  ['Magnesium','मैग्नीशियम','Mg'], ['Aluminium','एल्युमिनियम','Al'], ['Silicon','सिलिकॉन','Si'],
  ['Phosphorus','फॉस्फोरस','P'], ['Sulfur','सल्फर','S'], ['Chlorine','क्लोरीन','Cl'],
  ['Potassium','पोटैशियम','K'], ['Calcium','कैल्शियम','Ca'], ['Iron','लोहा','Fe'],
  ['Copper','ताँबा','Cu'], ['Silver','चाँदी','Ag'],
];

const capitals: readonly [Pair, Pair][] = [
  [['Gujarat','गुजरात'],['Gandhinagar','गांधीनगर']], [['Maharashtra','महाराष्ट्र'],['Mumbai','मुंबई']],
  [['Bihar','बिहार'],['Patna','पटना']], [['Odisha','ओडिशा'],['Bhubaneswar','भुवनेश्वर']],
  [['West Bengal','पश्चिम बंगाल'],['Kolkata','कोलकाता']], [['Tamil Nadu','तमिलनाडु'],['Chennai','चेन्नई']],
  [['Kerala','केरल'],['Thiruvananthapuram','तिरुवनंतपुरम']], [['Karnataka','कर्नाटक'],['Bengaluru','बेंगलुरु']],
  [['Telangana','तेलंगाना'],['Hyderabad','हैदराबाद']], [['Madhya Pradesh','मध्य प्रदेश'],['Bhopal','भोपाल']],
  [['Uttar Pradesh','उत्तर प्रदेश'],['Lucknow','लखनऊ']], [['Jharkhand','झारखंड'],['Ranchi','राँची']],
  [['Chhattisgarh','छत्तीसगढ़'],['Raipur','रायपुर']], [['Assam','असम'],['Dispur','दिसपुर']],
  [['Goa','गोवा'],['Panaji','पणजी']],
];

const units: readonly [Pair, Pair][] = [
  [['force','बल'],['newton','न्यूटन']], [['energy','ऊर्जा'],['joule','जूल']],
  [['power','शक्ति'],['watt','वाट']], [['pressure','दाब'],['pascal','पास्कल']],
  [['electric current','विद्युत धारा'],['ampere','एम्पियर']], [['electric charge','विद्युत आवेश'],['coulomb','कूलॉम']],
  [['potential difference','विभवांतर'],['volt','वोल्ट']], [['electrical resistance','विद्युत प्रतिरोध'],['ohm','ओम']],
  [['frequency','आवृत्ति'],['hertz','हर्ट्ज़']], [['thermodynamic temperature','ऊष्मागतिक तापमान'],['kelvin','केल्विन']],
  [['length','लंबाई'],['metre','मीटर']], [['mass','द्रव्यमान'],['kilogram','किलोग्राम']],
  [['time','समय'],['second','सेकंड']], [['amount of substance','पदार्थ की मात्रा'],['mole','मोल']],
  [['luminous intensity','ज्योति तीव्रता'],['candela','कैंडेला']],
];

const science = [
  ...elements.map(([english, hindi, symbol]) => exercise(
    [`What is the chemical symbol for ${english}?`, `${hindi} का रासायनिक प्रतीक क्या है?`],
    same(symbol), elements.map((element) => same(element[2])), 'रासायनिक प्रतीक / Chemical symbols',
  )),
  ...capitals.map(([state, capital]) => exercise(
    [`Which city is the capital of ${state[0]}?`, `${state[1]} की राजधानी कौन-सी है?`],
    capital, capitals.map(([, city]) => city), 'भारत की राजधानियाँ / Indian state capitals',
  )),
  ...units.map(([quantity, unit]) => exercise(
    [`What is the SI unit of ${quantity[0]}?`, `${quantity[1]} की SI इकाई क्या है?`],
    unit, units.map(([, value]) => value), 'मापन / SI units',
  )),
];

const hindiOpposites = [
  ['आशा','निराशा'], ['आदर','अनादर'], ['आगमन','प्रस्थान'], ['आरोह','अवरोह'], ['आदान','प्रदान'],
  ['उदय','अस्त'], ['उन्नति','अवनति'], ['उदार','कृपण'], ['उपकार','अपकार'], ['उत्कर्ष','अपकर्ष'],
  ['कठोर','कोमल'], ['गुण','दोष'], ['जय','पराजय'], ['ज्ञान','अज्ञान'], ['तेज़','मंद'],
  ['निंदा','स्तुति'], ['पक्ष','विपक्ष'], ['प्रकट','गुप्त'], ['बंधन','मुक्ति'], ['मान','अपमान'],
  ['लाभ','हानि'], ['वरदान','अभिशाप'], ['विनम्र','उद्दंड'], ['हर्ष','विषाद'], ['सजीव','निर्जीव'],
] as const;
const hindiSynonyms = [
  ['अग्नि','अनल'], ['आकाश','गगन'], ['आँख','नयन'], ['इंद्र','देवराज'], ['कमल','पंकज'],
  ['किनारा','तट'], ['चंद्रमा','शशि'], ['जल','नीर'], ['जंगल','अरण्य'], ['दिन','दिवस'],
  ['रात','रजनी'], ['धनुष','चाप'], ['धरती','वसुंधरा'], ['नदी','सरिता'], ['बादल','मेघ'],
  ['बिजली','दामिनी'], ['समुद्र','सागर'], ['पहाड़','गिरि'], ['प्रकाश','ज्योति'], ['वायु','पवन'],
  ['फूल','पुष्प'], ['भ्रमर','भौंरा'], ['सूर्य','रवि'], ['सर्प','भुजंग'], ['हाथी','गज'],
] as const;
const hindi = ([hindiOpposites, hindiSynonyms] as const).flatMap((pairs, kind) => pairs.map(([word, answer]) => exercise(
  same(`‘${word}’ का ${kind === 0 ? 'विलोम' : 'पर्यायवाची'} शब्द चुनिए।`),
  same(answer), pairs.map(([, value]) => same(value)), kind === 0 ? 'विलोम / Antonyms' : 'पर्यायवाची / Synonyms',
)));

const englishOpposites = [
  ['abundant','scarce'], ['ancient','modern'], ['bitter','sweet'], ['brave','cowardly'], ['careful','careless'],
  ['cheap','expensive'], ['deep','shallow'], ['early','late'], ['empty','full'], ['expand','contract'],
  ['familiar','unfamiliar'], ['flexible','rigid'], ['formal','informal'], ['frequent','rare'], ['generous','stingy'],
  ['guilty','innocent'], ['honest','dishonest'], ['humble','arrogant'], ['include','exclude'], ['increase','decrease'],
  ['major','minor'], ['permanent','temporary'], ['polite','rude'], ['private','public'], ['transparent','opaque'],
] as const;
const englishVerbs = [
  ['arise','arose'], ['begin','began'], ['break','broke'], ['bring','brought'], ['buy','bought'],
  ['catch','caught'], ['choose','chose'], ['drink','drank'], ['drive','drove'], ['fall','fell'],
  ['fly','flew'], ['forget','forgot'], ['give','gave'], ['grow','grew'], ['hide','hid'],
  ['keep','kept'], ['leave','left'], ['sell','sold'], ['shake','shook'], ['sing','sang'],
  ['speak','spoke'], ['swim','swam'], ['take','took'], ['teach','taught'], ['write','wrote'],
] as const;
const english = [
  ...englishOpposites.map(([word, answer]) => exercise(
    [`Choose the antonym of “${word}”.`, `“${word}” का विलोम अंग्रेज़ी शब्द चुनिए।`],
    same(answer), englishOpposites.map(([, value]) => same(value)), 'Vocabulary / शब्दावली',
  )),
  ...englishVerbs.map(([word, answer]) => exercise(
    [`Choose the simple past form of “${word}”.`, `“${word}” का साधारण भूतकाल वाला रूप चुनिए।`],
    same(answer), englishVerbs.map(([, value]) => same(value)), 'Tenses / काल',
  )),
];

function numeric(prompt: Pair, answer: number, step: number, topic: string, explanation: Pair, maximum = Infinity): Exercise {
  const alternatives = [-3, -2, -1, 1, 2, 3, 4].map((offset) => answer + offset * step);
  return exercise(prompt, same(answer), alternatives.filter((value) => value >= 0 && value <= maximum).map(same), topic, explanation);
}

const maths = Array.from({ length: 10 }, (_, index) => {
  const value = 120 + index * 40;
  const percent = (index + 2) * 5;
  const price = 200 + index * 80;
  const gain = 10 + index * 5;
  const part = 30 + index * 9;
  const first = 2 + index;
  const second = first + 2;
  const mean = 24 + index * 7;
  const factor = index + 3;
  return [
    numeric([`Find ${percent}% of ${value}.`, `${value} का ${percent}% कितना है?`], value * percent / 100, 4, 'प्रतिशत / Percentage',
      same(`${value} × ${percent} ÷ 100 = ${value * percent / 100}`)),
    numeric([`An article costs ₹${price}. Find its selling price at ${gain}% profit.`, `किसी वस्तु का क्रय मूल्य ₹${price} है। ${gain}% लाभ पर विक्रय मूल्य कितना है?`],
      price * (100 + gain) / 100, 10, 'लाभ और हानि / Profit & loss', same(`${price} × (100 + ${gain}) ÷ 100 = ${price * (100 + gain) / 100}`)),
    numeric([`₹${(first + second) * part} is divided in the ratio ${first} : ${second}. Find the larger share.`,
      `₹${(first + second) * part} को ${first} : ${second} में बाँटा जाता है। बड़ा हिस्सा कितना है?`],
      second * part, part, 'अनुपात / Ratio', same(`${(first + second) * part} × ${second} ÷ (${first} + ${second}) = ${second * part}`)),
    numeric([`The average of ${mean - 4}, ${mean} and x is ${mean}. Find x.`, `${mean - 4}, ${mean} और x का औसत ${mean} है। x कितना है?`],
      mean + 4, 2, 'औसत / Average', same(`3 × ${mean} − (${mean - 4} + ${mean}) = ${mean + 4}`)),
    numeric([`Find the LCM of ${4 * factor} and ${6 * factor}.`, `${4 * factor} और ${6 * factor} का लघुत्तम समापवर्त्य कितना है?`],
      12 * factor, factor, 'LCM–HCF', [`LCM(4, 6) = 12. Multiply by ${factor}.`, `4 और 6 का लघुत्तम समापवर्त्य 12 है। इसे ${factor} से गुणा करें।`]),
  ];
}).flat();

const days: readonly Pair[] = [
  ['Monday','सोमवार'], ['Tuesday','मंगलवार'], ['Wednesday','बुधवार'], ['Thursday','गुरुवार'],
  ['Friday','शुक्रवार'], ['Saturday','शनिवार'], ['Sunday','रविवार'],
];
const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'];
const reasoning = names.flatMap((name, index) => {
  const base = index + 3;
  const step = index + 2;
  const sequence = Array.from({ length: 4 }, (_, n) => base + n * step).join(', ');
  const fromDay = index % days.length;
  const after = 23 + index * 3;
  const hour = index + 1;
  const angle = Math.min(hour, 12 - hour) * 30;
  const rank = index + 7;
  const people = 28 + index * 3;
  const from = String.fromCharCode(65 + index);
  const to = String.fromCharCode(65 + index + 3);
  return [
    numeric([`Find the next number: ${sequence}, …`, `अगली संख्या बताइए: ${sequence}, …`],
      base + 4 * step, 1, 'श्रृंखला / Series', [`Add ${step} each time.`, `हर बार ${step} जोड़ें।`]),
    exercise([`Today is ${days[fromDay][0]}. Which day is ${after} days from today?`, `आज ${days[fromDay][1]} है। ${after} दिन बाद कौन-सा दिन होगा?`],
      days[(fromDay + after) % 7], days, 'कैलेंडर / Calendar',
      [`${after} leaves remainder ${after % 7} on division by 7.`, `${after} को 7 से भाग देने पर ${after % 7} शेष रहता है।`]),
    numeric([`What is the smaller angle in degrees between clock hands at ${hour}:00?`, `${hour}:00 बजे घड़ी की सुइयों के बीच छोटा कोण कितने डिग्री का होगा?`],
      angle, 10, 'घड़ी / Clock', [`Each hour mark is 30°. Take the shorter arc.`, `हर घंटे के निशान के बीच 30° है। छोटे चाप का कोण लें।`]),
    numeric([`In a line of ${people}, ${name} is number ${rank} from the front. What is the position from the back?`,
      `${people} लोगों की कतार में ${name} आगे से ${rank}वें स्थान पर है। पीछे से स्थान क्या है?`],
      people - rank + 1, 1, 'क्रम और स्थान / Ranking', same(`${people} − ${rank} + 1 = ${people - rank + 1}`)),
    exercise([`If each letter is replaced by the letter three places to its right, how is ${from} coded?`,
      `हर अक्षर के बदले उसके दाईं ओर तीसरा अक्षर लिखा जाए, तो ${from} का कोड क्या होगा?`],
      same(to), [1, 2, 4, 5, 6].map((offset) => same(String.fromCharCode(65 + index + offset))), 'कोडिंग / Coding',
      [`Moving three letters right of ${from} gives ${to}.`, `${from} से तीन अक्षर दाईं ओर जाने पर ${to} मिलता है।`]),
  ];
});

const exercises: Record<Subject, Exercise[]> = {
  'Rajasthan GK': rajasthan,
  'World, India & Everyday Science': science,
  'Reasoning & Mental Ability': reasoning,
  'Hindi General': hindi,
  'English General': english,
  Mathematics: maths,
};

// Reference facts: Rajasthan Tourism destination guides and the IUPAC Periodic Table.
export const subjectPracticePapers: Paper[] = SUBJECTS.map((subject, index) => ({
  paperId: `subject-practice-bank-${index + 1}`,
  title: `RVUNL subject practice · ${subject}`,
  durationMinutes: 50,
  category: 'Subject Practice',
  difficulty: 'Medium',
  questions: exercises[subject].map((item, itemIndex) => makeQuestion(subject, item, itemIndex)),
}));
