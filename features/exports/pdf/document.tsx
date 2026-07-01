import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import path from "node:path";
import {
  formatExportDate,
  formatExportDecimalHours,
  minutesToDecimalHours,
  type ProjectMonthExportData,
  type ExportTimeEntry,
} from "../domain/export-data";
import { formatExportMonthValue } from "../preview/domain";

const brandColor = "#2498ac";
const darkTextColor = "#162434";
const borderColor = "#d8e2e8";
const logoPath = path.join(process.cwd(), "public", "logo-kabi.png");

function safeFilePart(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  return normalized || "KUNDE";
}

export function buildProjectMonthPdfFileName(data: ProjectMonthExportData) {
  const month = formatExportMonthValue(data.month).replace("-", "_");

  return `${safeFilePart(data.project.customerName)}_KABI_Zeitnachweis_${month}.pdf`;
}

type ProjectMonthPdfRow = {
  key: string;
  workDate: string;
  description: string;
  employeeName: string;
  durationDecimalHours: number;
};

export function buildProjectMonthPdfRows(
  entries: ExportTimeEntry[],
): ProjectMonthPdfRow[] {
  const rows = new Map<
    string,
    {
      workDate: string;
      employeeName: string;
      descriptions: string[];
      durationMinutes: number;
      firstStartTime: string;
    }
  >();

  for (const entry of entries) {
    const key = `${entry.workDate}:${entry.employeeName}`;
    const row = rows.get(key);

    if (row) {
      row.descriptions.push(entry.description);
      row.durationMinutes += entry.durationMinutes;
      row.firstStartTime =
        entry.startTime < row.firstStartTime ? entry.startTime : row.firstStartTime;
      continue;
    }

    rows.set(key, {
      workDate: entry.workDate,
      employeeName: entry.employeeName,
      descriptions: [entry.description],
      durationMinutes: entry.durationMinutes,
      firstStartTime: entry.startTime,
    });
  }

  return [...rows.entries()]
    .map(([key, row]) => ({
      key,
      workDate: row.workDate,
      description: row.descriptions.join("; "),
      employeeName: row.employeeName,
      durationDecimalHours: minutesToDecimalHours(row.durationMinutes),
      firstStartTime: row.firstStartTime,
    }))
    .sort((a, b) => {
      const dateCompare = a.workDate.localeCompare(b.workDate);

      if (dateCompare !== 0) {
        return dateCompare;
      }

      const timeCompare = a.firstStartTime.localeCompare(b.firstStartTime);

      if (timeCompare !== 0) {
        return timeCompare;
      }

      return a.employeeName.localeCompare(b.employeeName, "de");
    })
    .map((row) => ({
      key: row.key,
      workDate: row.workDate,
      description: row.description,
      employeeName: row.employeeName,
      durationDecimalHours: row.durationDecimalHours,
    }));
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingRight: 34,
    paddingBottom: 42,
    paddingLeft: 34,
    fontFamily: "Helvetica",
    color: darkTextColor,
    fontSize: 9,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  title: {
    fontSize: 21,
    fontWeight: 700,
    letterSpacing: 0,
  },
  subtitle: {
    marginTop: 5,
    fontSize: 9,
    color: "#607384",
  },
  logo: {
    width: 122,
    height: 48,
    objectFit: "contain",
  },
  metaGrid: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: borderColor,
    borderBottomWidth: 1,
    borderBottomColor: borderColor,
    paddingTop: 10,
    paddingBottom: 10,
    marginBottom: 18,
  },
  metaColumn: {
    width: "33.333%",
    paddingRight: 12,
  },
  metaLabel: {
    fontSize: 7,
    color: "#607384",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 10,
    fontWeight: 700,
  },
  table: {
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: brandColor,
    color: "#ffffff",
    minHeight: 24,
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: borderColor,
    minHeight: 25,
    alignItems: "stretch",
  },
  cell: {
    paddingTop: 6,
    paddingRight: 6,
    paddingBottom: 6,
    paddingLeft: 6,
  },
  dateCell: {
    width: "13%",
  },
  descriptionCell: {
    width: "57%",
  },
  nameCell: {
    width: "20%",
  },
  hoursCell: {
    width: "10%",
    textAlign: "right",
  },
  headerText: {
    fontWeight: 700,
  },
  muted: {
    color: "#607384",
  },
  emptyState: {
    paddingTop: 18,
    paddingBottom: 18,
    textAlign: "center",
    color: "#607384",
    borderBottomWidth: 1,
    borderBottomColor: borderColor,
  },
  footer: {
    position: "absolute",
    left: 34,
    right: 34,
    bottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#607384",
    fontSize: 8,
  },
});

function projectLabel(data: ProjectMonthExportData) {
  return data.project.projectCode
    ? `${data.project.projectCode} - ${data.project.projectName}`
    : data.project.projectName;
}

function TableHeader() {
  return (
    <View fixed style={styles.tableHeader}>
      <Text style={[styles.cell, styles.dateCell, styles.headerText]}>Datum</Text>
      <Text style={[styles.cell, styles.descriptionCell, styles.headerText]}>
        Beschreibung
      </Text>
      <Text style={[styles.cell, styles.nameCell, styles.headerText]}>Name</Text>
      <Text style={[styles.cell, styles.hoursCell, styles.headerText]}>
        Stunden
      </Text>
    </View>
  );
}

export function ProjectMonthPdfDocument({
  data,
}: {
  data: ProjectMonthExportData;
}) {
  const rows = buildProjectMonthPdfRows(data.entries);

  return (
    <Document
      author="KABI Zeiterfassung"
      creator="KABI Zeiterfassung"
      language="de-DE"
      subject="Zeitnachweis"
      title={`Zeitnachweis ${projectLabel(data)} ${formatExportMonthValue(data.month)}`}
    >
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.title}>ZEITNACHWEIS</Text>
            <Text style={styles.subtitle}>KABI Zeiterfassung</Text>
          </View>
          {/* React PDF images do not expose browser alt text semantics. */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={logoPath} style={styles.logo} />
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaColumn}>
            <Text style={styles.metaLabel}>Projekt</Text>
            <Text style={styles.metaValue}>{projectLabel(data)}</Text>
            <Text style={styles.muted}>{data.project.customerName}</Text>
          </View>
          <View style={styles.metaColumn}>
            <Text style={styles.metaLabel}>Zeitraum</Text>
            <Text style={styles.metaValue}>
              {formatExportDate(data.startDate)} bis {formatExportDate(data.endDate)}
            </Text>
          </View>
          <View style={styles.metaColumn}>
            <Text style={styles.metaLabel}>Monatsstunden</Text>
            <Text style={styles.metaValue}>
              {formatExportDecimalHours(data.totalDecimalHours)}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <TableHeader />
          {rows.length > 0 ? (
            rows.map((row) => (
              <View key={row.key} style={styles.tableRow} wrap={false}>
                <Text style={[styles.cell, styles.dateCell]}>
                  {formatExportDate(row.workDate)}
                </Text>
                <Text style={[styles.cell, styles.descriptionCell]}>
                  {row.description}
                </Text>
                <Text style={[styles.cell, styles.nameCell]}>
                  {row.employeeName}
                </Text>
                <Text style={[styles.cell, styles.hoursCell]}>
                  {formatExportDecimalHours(row.durationDecimalHours)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyState}>Keine abrechenbaren Einträge.</Text>
          )}
        </View>

        <View fixed style={styles.footer}>
          <Text>KABI Consulting</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Seite ${pageNumber} von ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
