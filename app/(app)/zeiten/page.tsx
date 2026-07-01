import { requireEmployeeSession } from "@/lib/auth/require-session";
import { TimeEntriesList } from "@/features/time-entries/list/time-entries-list";
import {
  getOwnTimeEntryList,
  parseTimeEntriesPage,
} from "@/features/time-entries/list/queries";
import { getCurrentTimerDraft } from "@/features/timer/queries";
import { TimeEntryBar } from "@/features/time-entry-bar/time-entry-bar";
import {
  getTimeEntryPreferences,
  getTodayInBerlin,
} from "@/features/time-entry-bar/queries";
import { getTaskPickerItems } from "@/features/tasks/task-picker/queries";
import { getActiveEmployeeOptions } from "@/features/employees/queries";
import { resolveSelectedTimeEntryEmployeeId } from "@/features/time-entry-bar/employee-selection";

type TimesPageProps = {
  searchParams: Promise<{
    error?: string;
    employee?: string;
    page?: string;
    selectedTask?: string;
    success?: string;
  }>;
};

export default async function TimesPage({ searchParams }: TimesPageProps) {
  const employeePromise = requireEmployeeSession();

  const [employee, params] = await Promise.all([
    employeePromise,
    searchParams,
  ]);
  const employeeOptions =
    employee.role === "admin" ? await getActiveEmployeeOptions() : [];
  const selectedEmployeeId = resolveSelectedTimeEntryEmployeeId({
    currentEmployeeId: employee.id,
    employeeOptions,
    isAdmin: employee.role === "admin",
    requestedEmployeeId: params.employee,
  });
  const [preferences, timerDraft, taskItems] = await Promise.all([
    getTimeEntryPreferences(employee.id),
    getCurrentTimerDraft(selectedEmployeeId),
    getTaskPickerItems({
      employeeId: selectedEmployeeId,
      query: "",
      limit: 500,
    }),
  ]);
  const timeEntries = await getOwnTimeEntryList({
    employeeId: employee.id,
    page: parseTimeEntriesPage(params.page),
    pageSize: preferences.timeEntriesPageSize,
  });
  const successMessages: Record<string, string> = {
    "zeit-aktualisiert": "Zeit wurde aktualisiert.",
    "zeit-dupliziert": "Eintrag wurde dupliziert.",
    "zeit-geloescht": "Eintrag wurde gelöscht.",
    "zeit-gespeichert": "Zeit wurde gespeichert.",
    "timer-aktualisiert": "Timer wurde aktualisiert.",
    "timer-gestartet": "Timer wurde gestartet.",
    "timer-gestoppt": "Timer wurde gestoppt.",
    "timer-gespeichert": "Timer wurde als Zeiteintrag gespeichert.",
    "timer-verworfen": "Timer wurde verworfen.",
  };
  const errorMessages: Record<string, string> = {
    "timer-speichern": "Timer konnte nicht aktualisiert werden.",
    "timer-stoppen": "Timer konnte nicht gestoppt werden.",
    "timer-ungueltig": "Timer-Entwurf ist ungültig.",
    "timer-verwerfen": "Timer konnte nicht verworfen werden.",
    "timer-besteht": "Es gibt bereits einen Timer-Entwurf.",
    "timer-starten": "Timer konnte nicht gestartet werden.",
    "timer-aufgabe": "Diese Aufgabe ist für diese:n Mitarbeitende:n nicht freigegeben.",
    "zeit-loeschen": "Eintrag konnte nicht gelöscht werden.",
    "zeit-speichern": "Eintrag konnte nicht gespeichert werden.",
    "zeit-ungueltig": "Eintrag ist ungültig.",
  };
  const successMessage = params.success
    ? successMessages[params.success]
    : undefined;
  const errorMessage = params.error ? errorMessages[params.error] : undefined;
  const timerDraftKey = timerDraft
    ? `${selectedEmployeeId}:${timerDraft.id}:${timerDraft.status}:${timerDraft.stoppedAtUtc ?? "running"}`
    : `${selectedEmployeeId}:no-timer`;

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Arbeitsbereich
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Zeiten</h1>
      </div>

      <TimeEntryBar
        currentEmployeeId={employee.id}
        employeeOptions={employeeOptions}
        initialTaskId={params.selectedTask}
        initialEntryMode={preferences.lastEntryMode}
        initialManualMode={preferences.lastManualMode}
        key={timerDraftKey}
        pageErrorMessage={errorMessage}
        selectedEmployeeId={selectedEmployeeId}
        successMessage={successMessage}
        tasks={taskItems}
        today={getTodayInBerlin()}
        timerDraft={timerDraft}
      />

      <TimeEntriesList result={timeEntries} tasks={taskItems} />
    </section>
  );
}
