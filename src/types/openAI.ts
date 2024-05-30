export interface Review {
  lineNumber: number;
  reviewComment: string;
}

export interface TokenCount {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  total_price: number;
}
