import {selfChecked} from './progress.js';

export const normalizeTerm = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[\s_–—\-·.()（）]/g, '');
export const atomRecordId = atom => atom.recordId || 'atom-' + atom.id;
export const atomAvailable = (atom, depth = 'A') => Boolean(atom?.status?.[{A:'quick',B:'technical',C:'theory'}[depth]]);
export const atomMastered = (atom, state, depth = 'A') => atomAvailable(atom, depth) && selfChecked(state.records[atomRecordId(atom)], depth);

export function searchAtoms(items, query = '', options = {}) {
  const q = normalizeTerm(query), words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return items.map(atom => {
    const names = [atom.name, atom.nameEn, ...(atom.aliases || [])].filter(Boolean).map(normalizeTerm);
    const related = (atom.searchTerms || []).map(normalizeTerm);
    const text = normalizeTerm([atom.summary, atom.why, atom.what, atom.distinction, atom.research, atom.failure].filter(Boolean).join(' '));
    let score = !q ? 1 : names.includes(q) ? 100 : names.some(x => x.includes(q)) ? 70 : related.some(x=>x.includes(q)) ? 55 : text.includes(q) ? 20 : words.length > 1 && words.every(w => [...names, ...related, text].some(t => t.includes(normalizeTerm(w)))) ? 10 : 0;
    if (options.priority && options.priority !== 'all' && atom.priority !== options.priority) score = 0;
    if (options.group && !atom.groups?.includes(options.group) && atom.module !== options.group) score = 0;
    if (options.mechanism && !atom.mechanisms?.includes(options.mechanism)) score = 0;
    if (options.problem && !atom.problems?.includes(options.problem)) score = 0;
    if (options.content === 'ready' && !atomAvailable(atom)) score = 0;
    if (options.content === 'planned' && atomAvailable(atom)) score = 0;
    if (options.state) {
      const r = options.state.records[atomRecordId(atom)];
      if (options.learning === 'unmastered' && (!atomAvailable(atom) || atomMastered(atom, options.state))) score = 0;
      if (options.learning === 'mastered' && !atomMastered(atom, options.state)) score = 0;
      if (options.learning === 'star' && !r?.star) score = 0;
      if (options.learning === 'review' && !r?.review) score = 0;
    }
    return {atom, score};
  }).filter(x => x.score > 0).sort((a,b) => b.score-a.score || Number(atomAvailable(b.atom))-Number(atomAvailable(a.atom)) || a.atom.priority.localeCompare(b.atom.priority) || a.atom.name.localeCompare(b.atom.name,'zh-CN')).map(x => x.atom);
}

// An empty selector means select nothing; it must never silently become a whole course.
export function selectSourceSection(lesson, ref) {
  const section = lesson.sections.find(s => s.id === ref.sectionId);
  if (!section) throw new Error('未知来源段落：' + lesson.id + '/' + ref.sectionId);
  const pick = (indices, values, kind) => (indices || []).map(i => {
    if (!Number.isInteger(i) || i < 0 || i >= values.length) throw new Error('来源索引越界：' + lesson.id + '/' + ref.sectionId + '/' + kind + '/' + i);
    return values[i];
  });
  return {paragraphs:pick(ref.paragraphs,section.paragraphs || [],'paragraphs'), equations:pick(ref.equations,section.equations || [],'equations'), table:ref.tableRows?.length ? {headers:section.table?.headers || [],rows:pick(ref.tableRows,section.table?.rows || [],'tableRows')} : null};
}
