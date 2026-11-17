import samplePaper from './sample_paper_01.json';
import { Paper } from '../types/exam';

export function loadBuiltInPapers(): Paper[] {
  return [{ ...(samplePaper as Paper), category: 'Full Mock', difficulty: 'Medium' }];
}
