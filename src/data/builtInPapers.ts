import samplePaper from './sample_paper_01.json';
import { Paper } from '../types/exam';

const paperModules = import.meta.glob('./papers/*.json', { eager: true }) as Record<string, { default: Paper }>;

export function loadBuiltInPapers(): Paper[] {
  const sample = { ...(samplePaper as unknown as Paper), category: 'Full Mock' as const, difficulty: 'Medium' as const };
  const bundled = Object.entries(paperModules)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, mod]) => {
      const p = mod.default;
      return {
        ...p,
        category: p.category ?? ('Full Mock' as const),
        difficulty: p.difficulty ?? ('Hard' as const),
      };
    });

  const unique = new Map<string, Paper>();
  unique.set(sample.paperId, sample);
  for (const item of bundled) {
    if (!unique.has(item.paperId)) unique.set(item.paperId, item);
  }
  return Array.from(unique.values());
}
