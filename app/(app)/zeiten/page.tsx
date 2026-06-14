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
import { TaskPicker } from "@/features/tasks/task-picker/task-picker";
import { getTaskPickerItems } from "@/features/tasks/task-picker/queries";

type TimesPageProps = {
  searchParams: Promise<{
    error?: string;
    page?: string;
    selectedTask?: string;
    task?: string;
    success?: string;
  }>;
};

export default async function TimesPage({ searchParams }: TimesPageProps) {
  const employee = await requireEmployeeSession();

  const params = await searchParams;
  const taskQuery = params.task ?? "";
  const [taskItems, pickerTaskItems, preferences, timerDraft] = await Promise.all([
    getTaskPickerItems({ query: "", limit: 500 }),
    getTaskPickerItems({ query: taskQuery, limit: 100 }),
    getTimeEntryPreferences(employee.id),
    getCurrentTimerDraft(employee.id),
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
    "zeit-loeschen": "Eintrag konnte nicht gelöscht werden.",
    "zeit-speichern": "Eintrag konnte nicht gespeichert werden.",
    "zeit-ungueltig": "Eintrag ist ungültig.",
  };
  const successMessage = params.success
    ? successMessages[params.success]
    : undefined;
  const errorMessage = params.error ? errorMessages[params.error] : undefined;

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Arbeitsbereich
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Zeiten</h1>
      </div>

      <TimeEntryBar
        initialTaskId={params.selectedTask}
        initialEntryMode={preferences.lastEntryMode}
        initialManualMode={preferences.lastManualMode}
        pageErrorMessage={errorMessage}
        successMessage={successMessage}
        tasks={taskItems}
        today={getTodayInBerlin()}
        timerDraft={timerDraft}
      />

      <TimeEntriesList result={timeEntries} tasks={taskItems} />

      <TaskPicker
        query={taskQuery}
        items={pickerTaskItems}
        selectedTaskId={params.selectedTask}
      />
    </section>
  );
}
