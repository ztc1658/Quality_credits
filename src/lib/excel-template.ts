import * as fs from "fs";
import * as XLSX from "xlsx";

const xlsxWithFs = XLSX as typeof XLSX & { set_fs?: (fileSystem: typeof fs) => void };
xlsxWithFs.set_fs?.(fs);

export type TemplateRecordSource = "add" | "minus";

export interface TemplateStudentSummary {
  name: string;
  studentNo: string;
  className: string;
  baseScore: number;
  majorProgramBonus: number;
  classCommittee: number;
  truancy: number;
  lateReturn: number;
  classDiscipline: number;
  lateArrival: number;
  leave: number;
  dormitory: number;
  discipline: number;
  youthStudyMinus: number;
  youthStudyPlus: number;
  fullAttendance: number;
  selfImprovement: number;
  volunteer: number;
  awardCompetition: number;
  modelDormitory: number;
  totalScore: number;
  signature: string;
}

export interface TemplateCreditRecord {
  className: string;
  studentName: string;
  reason: string;
  points: number;
  source: TemplateRecordSource;
}

export interface ParsedTemplateData {
  students: TemplateStudentSummary[];
  addRecords: TemplateCreditRecord[];
  minusRecords: TemplateCreditRecord[];
}

interface ParsePaths {
  addDetailsPath: string;
  minusDetailsPath: string;
  summaryPath: string;
}

type RowValue = string | number | boolean | Date | null;

function assertReadableFile(filePath: string): void {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }
}

function loadFirstSheetRows(filePath: string): RowValue[][] {
  assertReadableFile(filePath);
  const workbook = XLSX.readFile(filePath, { cellDates: true, raw: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return [];
  }
  const worksheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as RowValue[][];
}

function cleanText(value: RowValue): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\r/g, "").replace(/\n+/g, " ").trim();
}

function mergeText(values: RowValue[]): string {
  return values
    .map(cleanText)
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value: RowValue, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const normalized = String(value).replace(/[,，\s]/g, "");
  const parsed = Number.parseFloat(normalized);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
}

function isHeaderOrBlank(className: string, studentName: string): boolean {
  if (!className && !studentName) return true;
  if (className === "班级" || studentName === "姓名") return true;
  return false;
}

function parseAddDetails(filePath: string): TemplateCreditRecord[] {
  const rows = loadFirstSheetRows(filePath);
  const records: TemplateCreditRecord[] = [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const className = cleanText(row[0]);
    const studentName = cleanText(row[1]);
    const reason = mergeText([row[2], row[3]]);
    const points = parseNumber(row[4]);

    if (isHeaderOrBlank(className, studentName)) continue;
    if (!reason || points === 0) continue;

    records.push({
      className,
      studentName,
      reason,
      points: Math.abs(points),
      source: "add",
    });
  }

  return records;
}

function parseMinusCandidate(
  row: RowValue[],
  classIndex: number,
  studentIndex: number,
  reasonIndexes: number[],
  scoreIndex: number
): TemplateCreditRecord | null {
  const className = cleanText(row[classIndex]);
  const studentName = cleanText(row[studentIndex]);
  const reason = mergeText(reasonIndexes.map((index) => row[index]));
  const points = parseNumber(row[scoreIndex]);

  if (isHeaderOrBlank(className, studentName)) return null;
  if (!reason || points === 0) return null;

  return {
    className,
    studentName,
    reason,
    points: points > 0 ? -points : points,
    source: "minus",
  };
}

function parseMinusDetails(filePath: string): TemplateCreditRecord[] {
  const rows = loadFirstSheetRows(filePath);
  const records: TemplateCreditRecord[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const left = parseMinusCandidate(row, 0, 1, [2, 3], 4);
    if (left) records.push(left);

    const right = parseMinusCandidate(row, 5, 6, [7, 8, 9, 10, 11, 12, 13], 14);
    if (right) records.push(right);
  }

  return records;
}

function parseSummary(filePath: string): TemplateStudentSummary[] {
  const rows = loadFirstSheetRows(filePath);
  const result: TemplateStudentSummary[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const name = cleanText(row[1]);
    const studentNo = cleanText(row[2]);
    const className = cleanText(row[3]);

    if (!name || !className) continue;
    if (name === "姓名" || className === "班级") continue;

    const serial = cleanText(row[0]);
    const looksLikeDataRow =
      /^[\d]+$/.test(serial) || /^[\d]+$/.test(studentNo) || studentNo.length >= 8;
    if (!looksLikeDataRow) continue;

    const baseScoreRaw = cleanText(row[4]);
    const baseScore = baseScoreRaw ? parseNumber(row[4]) : 60;
    const majorProgramBonus = parseNumber(row[5]);
    const classCommittee = parseNumber(row[6]);
    const truancy = parseNumber(row[7]);
    const lateReturn = parseNumber(row[8]);
    const classDiscipline = parseNumber(row[9]);
    const lateArrival = parseNumber(row[10]);
    const leave = parseNumber(row[11]);
    const dormitory = parseNumber(row[12]);
    const discipline = parseNumber(row[13]);
    const youthStudyMinus = parseNumber(row[14]);
    const youthStudyPlus = parseNumber(row[15]);
    const fullAttendance = parseNumber(row[16]);
    const selfImprovement = parseNumber(row[17]);
    const volunteer = parseNumber(row[18]);
    const awardCompetition = parseNumber(row[19]);
    const modelDormitory = parseNumber(row[20]);
    const totalScoreRaw = cleanText(row[21]);

    const computedTotal =
      baseScore +
      majorProgramBonus +
      classCommittee +
      truancy +
      lateReturn +
      classDiscipline +
      lateArrival +
      leave +
      dormitory +
      discipline +
      youthStudyMinus +
      youthStudyPlus +
      fullAttendance +
      selfImprovement +
      volunteer +
      awardCompetition +
      modelDormitory;

    result.push({
      name,
      studentNo,
      className,
      baseScore,
      majorProgramBonus,
      classCommittee,
      truancy,
      lateReturn,
      classDiscipline,
      lateArrival,
      leave,
      dormitory,
      discipline,
      youthStudyMinus,
      youthStudyPlus,
      fullAttendance,
      selfImprovement,
      volunteer,
      awardCompetition,
      modelDormitory,
      totalScore: totalScoreRaw ? parseNumber(row[21]) : computedTotal,
      signature: cleanText(row[22]),
    });
  }

  return result;
}

export function parseTemplateExcelFiles(paths: ParsePaths): ParsedTemplateData {
  return {
    students: parseSummary(paths.summaryPath),
    addRecords: parseAddDetails(paths.addDetailsPath),
    minusRecords: parseMinusDetails(paths.minusDetailsPath),
  };
}
