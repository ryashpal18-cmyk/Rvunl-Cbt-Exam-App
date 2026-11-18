import { createContext, useContext } from 'react';
import { Language, Subject } from './types/exam';

export const AppLanguage = createContext<Language>('en');

export function useAppLanguage() {
  return useContext(AppLanguage);
}

export function useTranslation() {
  const language = useAppLanguage();
  return (english: string, hindi: string) => language === 'hi' ? hindi : english;
}


const subjectLabels: Record<Subject, string> = {
  'Rajasthan GK': 'राजस्थान सामान्य ज्ञान',
  'World, India & Everyday Science': 'विश्व, भारत और दैनिक विज्ञान',
  'Reasoning & Mental Ability': 'तर्क और मानसिक योग्यता',
  'Hindi General': 'सामान्य हिंदी',
  'English General': 'सामान्य अंग्रेज़ी',
  Mathematics: 'गणित',
};

export function useSubjectLabel() {
  const t = useTranslation();
  return (subject: Subject) => t(subject, subjectLabels[subject]);
}
