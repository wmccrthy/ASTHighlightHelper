// Helper functions

export const isSearchable = (term: string): boolean => {
  // Basic validation - minimum length or other criteria
  return term.trim().length >= 1;
};
