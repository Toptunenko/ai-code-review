export interface PRDetails {
  owner: string;
  repo: string;
  pullNumber: number;
  title: string;
  description: string;
  baseBranch?: string;
  headBranch?: string;
}

export interface Comment {
  body: string;
  path: string;
  line: number;
}
