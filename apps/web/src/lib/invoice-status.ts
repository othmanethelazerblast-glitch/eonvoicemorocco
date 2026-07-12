export const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  issued: "Emise",
  submitted: "Soumise",
  cleared: "Validee (DGI)",
  rejected: "Rejetee",
  void: "Annulee",
};

export const STATUS_TONES: Record<string, "slate" | "blue" | "green" | "red" | "amber"> = {
  draft: "slate",
  issued: "blue",
  submitted: "amber",
  cleared: "green",
  rejected: "red",
  void: "slate",
};
