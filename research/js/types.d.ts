export type Depth = 'A' | 'B' | 'C';
export type Checks = {read: boolean; compute: boolean; explain: boolean};
export type LearningRecord = {
  checks: Record<Depth, Checks>;
  note: string;
  star: boolean;
  review: boolean;
  updatedAt: number;
};
export type QuizRecord = {selected: number; attempts: number; updatedAt: number};
export type Progress = {
  format: 'e3-research-progress';
  version: 1;
  updatedAt: number;
  depth: Depth;
  records: Record<string, LearningRecord>;
  answers: Record<string, QuizRecord>;
};
export type StorageLike = {getItem(key: string): string | null; setItem(key: string, value: string): void};
export type ContentStatus = {eli5:boolean;example:boolean;definition:boolean;derivation:boolean;code:boolean;interactive:boolean;literature:boolean;audit:boolean};
export type Source = {id:string;title:string;authors:string;year:number|string;url:string;checkedOn:string;status:'verified'|'pending';scope:string};
export type Section = {
  id: string; title:string; depth:Depth; paragraphs:string[];
  equations?: {tex:string;explanation:string}[];
  steps?:string[];
  table?:{headers:string[];rows:(string|number)[][]};
  code?:{language:'r'|'python';source:string;environment:string;verified:boolean;file?:string};
};
export type Question = {id:string;type:string;prompt:string;options:string[];answer:number;explanation:string;depth:Depth};
export type Lesson = {
  id:string; name:string; nameEn:string; module:string; priority:'P0'|'P1'|'P2';
  summary:string; prerequisites:string[]; related:string[]; minutes:Record<Depth,number>;
  sections:Section[]; extension:{status:string;topics:string[]};
  references:string[]; questions:Question[]; lab?:string|null; status:ContentStatus;
  catalogTopics?:string[];
};
