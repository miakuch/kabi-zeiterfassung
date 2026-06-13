export type TaskPickerLabelInput = {
  customerName: string;
  projectCode: string | null;
  projectName: string;
  taskName: string;
};

export type TaskPickerLabels = {
  fullLabel: string;
  compactLabel: string;
  searchableText: string;
};

function normalizePart(value: string | null) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

export function normalizeTaskSearch(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("de-DE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function buildTaskPickerLabels({
  customerName,
  projectCode,
  projectName,
  taskName,
}: TaskPickerLabelInput): TaskPickerLabels {
  const code = normalizePart(projectCode);
  const project = code ? `${code} - ${projectName}` : projectName;
  const compactProject = code ?? projectName;
  const searchableText = normalizeTaskSearch(
    [customerName, projectCode, projectName, taskName].filter(Boolean).join(" "),
  );

  return {
    fullLabel: `${customerName} / ${project} / ${taskName}`,
    compactLabel: `${customerName} / ${compactProject} / ${taskName}`,
    searchableText,
  };
}

export function taskPickerItemMatchesSearch(
  item: TaskPickerLabelInput,
  query: string,
) {
  const normalizedQuery = normalizeTaskSearch(query);

  if (!normalizedQuery) {
    return true;
  }

  return buildTaskPickerLabels(item).searchableText.includes(normalizedQuery);
}
