import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import {
  parseTemplateExcelFiles,
  type TemplateCreditRecord,
  type TemplateStudentSummary,
} from "@/lib/excel-template";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

export const SUMMARY_CATEGORIES = [
  "班委学生会",
  "旷课",
  "晚归",
  "课堂纪律",
  "迟到",
  "请假",
  "内务",
  "违纪",
  "青年大学习减",
  "青年大学习加",
  "全勤",
  "个人提升",
  "志愿活动",
  "获奖比赛",
  "模范寝室",
] as const;

export type SummaryCategory = (typeof SUMMARY_CATEGORIES)[number];

export interface Department {
  id: number;
  name: string;
  created_at: string;
}

export interface ClassInfo {
  id: number;
  name: string;
  grade: string;
  department_id: number;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  password: string;
  name: string;
  role: string;
  avatar?: string;
  class_id?: number;
  password_changed: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreditRecord {
  id: number;
  student_id: number;
  teacher_id: number;
  category: string;
  reason: string;
  points: number;
  source?: string;
  created_at: string;
}

export interface CreditApplication {
  id: number;
  student_id: number;
  category: string;
  reason: string;
  points: number;
  proof?: string;
  status: string;
  reviewer_id?: number;
  review_note?: string;
  created_at: string;
  reviewed_at?: string;
}

export interface StudentProfile {
  student_id: number;
  base_score: number;
  major_program_bonus: number;
  category_scores: Record<SummaryCategory, number>;
  total_score: number;
  signature?: string;
  updated_at: string;
}

interface DbData {
  departments: Department[];
  classes: ClassInfo[];
  users: User[];
  teacher_classes: { teacher_id: number; class_id: number }[];
  credit_records: CreditRecord[];
  credit_applications: CreditApplication[];
  student_profiles: StudentProfile[];
  _nextId: { [table: string]: number };
}

export interface AdminCreditRecordRow extends CreditRecord {
  student_name: string;
  student_username: string;
  class_name: string;
  teacher_name: string;
}

export interface StudentSummaryRow {
  student_id: number;
  username: string;
  name: string;
  class_name: string;
  base_score: number;
  major_program_bonus: number;
  class_committee: number;
  truancy: number;
  late_return: number;
  class_discipline: number;
  late_arrival: number;
  leave: number;
  dormitory: number;
  discipline: number;
  youth_study_minus: number;
  youth_study_plus: number;
  full_attendance: number;
  self_improvement: number;
  volunteer: number;
  award_competition: number;
  model_dormitory: number;
  total_score: number;
  signature: string;
}

export interface ImportExcelOptions {
  addDetailsPath: string;
  minusDetailsPath: string;
  summaryPath: string;
  resetDatabase?: boolean;
}

export interface ImportExcelResult {
  importedClasses: number;
  importedStudents: number;
  importedRecords: number;
  importedProfiles: number;
  autoCreatedStudents: number;
  warnings: string[];
}

function now(): string {
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}

function emptyCategoryScores(): Record<SummaryCategory, number> {
  return {
    班委学生会: 0,
    旷课: 0,
    晚归: 0,
    课堂纪律: 0,
    迟到: 0,
    请假: 0,
    内务: 0,
    违纪: 0,
    青年大学习减: 0,
    青年大学习加: 0,
    全勤: 0,
    个人提升: 0,
    志愿活动: 0,
    获奖比赛: 0,
    模范寝室: 0,
  };
}

function sumScores(scores: Record<SummaryCategory, number>): number {
  return SUMMARY_CATEGORIES.reduce((sum, key) => sum + (scores[key] ?? 0), 0);
}

function normalizeName(text: string): string {
  return text.trim().replace(/\s+/g, "");
}

function normalizeClassName(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, "")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .toLowerCase();
}

function createDefaultDb(): DbData {
  return {
    departments: [],
    classes: [],
    users: [
      {
        id: 1,
        username: "admin",
        password: bcrypt.hashSync("admin123", 10),
        name: "系统管理员",
        role: "Admin",
        password_changed: true,
        created_at: now(),
        updated_at: now(),
      },
    ],
    teacher_classes: [],
    credit_records: [],
    credit_applications: [],
    student_profiles: [],
    _nextId: {
      departments: 1,
      classes: 1,
      users: 2,
      credit_records: 1,
      credit_applications: 1,
    },
  };
}

function normalizeDb(data: Partial<DbData>): DbData {
  return {
    departments: data.departments ?? [],
    classes: data.classes ?? [],
    users: data.users ?? [],
    teacher_classes: data.teacher_classes ?? [],
    credit_records: data.credit_records ?? [],
    credit_applications: data.credit_applications ?? [],
    student_profiles: data.student_profiles ?? [],
    _nextId: {
      departments: data._nextId?.departments ?? 1,
      classes: data._nextId?.classes ?? 1,
      users: data._nextId?.users ?? 1,
      credit_records: data._nextId?.credit_records ?? 1,
      credit_applications: data._nextId?.credit_applications ?? 1,
    },
  };
}

function loadDb(): DbData {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(DB_PATH)) {
    const initial = createDefaultDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  }

  const raw = JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) as Partial<DbData>;
  return normalizeDb(raw);
}

function saveDb(data: DbData): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function toSafeUser(user: User, classes: ClassInfo[]) {
  const { password: _password, ...rest } = user;
  void _password;
  return {
    ...rest,
    class_name: rest.class_id ? classes.find((c) => c.id === rest.class_id)?.name : undefined,
  };
}

function createUserInDb(
  db: DbData,
  data: {
    username: string;
    password: string;
    name: string;
    role: string;
    class_id?: number;
    password_changed?: boolean;
  }
): User {
  const id = db._nextId.users++;
  const record: User = {
    id,
    username: data.username,
    password: data.password,
    name: data.name,
    role: data.role,
    class_id: data.class_id,
    password_changed: data.password_changed ?? false,
    created_at: now(),
    updated_at: now(),
  };
  db.users.push(record);
  return record;
}

function ensureDepartmentInDb(db: DbData, name: string): Department {
  const existing = db.departments.find((item) => item.name === name);
  if (existing) return existing;

  const department: Department = {
    id: db._nextId.departments++,
    name,
    created_at: now(),
  };
  db.departments.push(department);
  return department;
}

function ensureClassInDb(db: DbData, name: string, departmentId: number): ClassInfo {
  const existing = db.classes.find((item) => item.name === name);
  if (existing) return existing;

  const classInfo: ClassInfo = {
    id: db._nextId.classes++,
    name,
    grade: "未知",
    department_id: departmentId,
    created_at: now(),
  };
  db.classes.push(classInfo);
  return classInfo;
}

function buildClassAlias(name: string): string[] {
  const normalized = normalizeClassName(name);
  const aliases = new Set<string>([normalized]);

  if (normalized.endsWith("班")) {
    aliases.add(normalized.slice(0, -1));
  }

  const digit = name.match(/\d+/)?.[0];
  if (digit) {
    if (name.includes("新能源")) aliases.add(`新${digit}`);
    if (name.includes("英语")) aliases.add(`英${digit}`);
    if (name.includes("计算机")) aliases.add(`计${digit}`);
    if (name.includes("软件")) aliases.add(`软${digit}`);
    if (name.includes("电子")) aliases.add(`电${digit}`);
  }

  return Array.from(aliases);
}

function classifySummaryCategory(reason: string, points: number): SummaryCategory {
  const text = reason.replace(/\s+/g, "");

  if (/青年大学习/.test(text)) {
    return points >= 0 ? "青年大学习加" : "青年大学习减";
  }
  if (/班委|学生会/.test(text)) return "班委学生会";
  if (/旷课/.test(text)) return "旷课";
  if (/晚归|晚点到/.test(text)) return "晚归";
  if (/课堂|纪律/.test(text)) return "课堂纪律";
  if (/迟到/.test(text)) return "迟到";
  if (/请假/.test(text)) return "请假";
  if (/内务|卫生|寝室/.test(text)) {
    return points >= 0 ? "模范寝室" : "内务";
  }
  if (/违纪|违规|吸烟/.test(text)) return "违纪";
  if (/全勤/.test(text)) return "全勤";
  if (/志愿/.test(text)) return "志愿活动";
  if (/获奖|比赛|竞赛/.test(text)) return "获奖比赛";

  return points >= 0 ? "个人提升" : "违纪";
}

function buildProfileFromSummary(studentId: number, row: TemplateStudentSummary): StudentProfile {
  const scores = emptyCategoryScores();
  scores.班委学生会 = row.classCommittee;
  scores.旷课 = row.truancy;
  scores.晚归 = row.lateReturn;
  scores.课堂纪律 = row.classDiscipline;
  scores.迟到 = row.lateArrival;
  scores.请假 = row.leave;
  scores.内务 = row.dormitory;
  scores.违纪 = row.discipline;
  scores.青年大学习减 = row.youthStudyMinus;
  scores.青年大学习加 = row.youthStudyPlus;
  scores.全勤 = row.fullAttendance;
  scores.个人提升 = row.selfImprovement;
  scores.志愿活动 = row.volunteer;
  scores.获奖比赛 = row.awardCompetition;
  scores.模范寝室 = row.modelDormitory;

  const fallbackTotal = row.baseScore + row.majorProgramBonus + sumScores(scores);
  return {
    student_id: studentId,
    base_score: row.baseScore,
    major_program_bonus: row.majorProgramBonus,
    category_scores: scores,
    total_score: row.totalScore || fallbackTotal,
    signature: row.signature,
    updated_at: now(),
  };
}

function buildProfileFromRecords(studentId: number, records: CreditRecord[]): StudentProfile {
  const scores = emptyCategoryScores();
  for (const record of records) {
    const category = classifySummaryCategory(record.reason, record.points);
    scores[category] += record.points;
  }
  const base = 60;
  return {
    student_id: studentId,
    base_score: base,
    major_program_bonus: 0,
    category_scores: scores,
    total_score: base + sumScores(scores),
    updated_at: now(),
  };
}

function findOrCreateStudentByRecord(
  db: DbData,
  classInfo: ClassInfo,
  studentName: string,
  defaultPasswordHash: string,
  keyMap: Map<string, User>,
  nameMap: Map<string, User[]>,
  stats: { autoCreated: number }
): User {
  const classKey = normalizeClassName(classInfo.name);
  const nameKey = normalizeName(studentName);
  const key = `${classKey}|${nameKey}`;

  const exact = keyMap.get(key);
  if (exact) return exact;

  const byName = nameMap.get(nameKey) ?? [];
  if (byName.length === 1) return byName[0];

  let username = `IMP${String(db._nextId.users).padStart(6, "0")}`;
  while (db.users.some((item) => item.username === username)) {
    username = `IMP${String(db._nextId.users + 1).padStart(6, "0")}`;
  }

  const user = createUserInDb(db, {
    username,
    password: defaultPasswordHash,
    name: studentName,
    role: "Student",
    class_id: classInfo.id,
    password_changed: false,
  });
  stats.autoCreated += 1;

  keyMap.set(key, user);
  const group = nameMap.get(nameKey) ?? [];
  group.push(user);
  nameMap.set(nameKey, group);
  return user;
}

function importRecordRows(
  db: DbData,
  importer: User,
  detailRows: TemplateCreditRecord[],
  classAliasMap: Map<string, ClassInfo>,
  keyMap: Map<string, User>,
  nameMap: Map<string, User[]>,
  defaultPasswordHash: string,
  stats: { autoCreated: number }
): number {
  let count = 0;
  const defaultDepartment = ensureDepartmentInDb(db, "Excel导入");

  const findClassByAlias = (rawClassName: string): ClassInfo => {
    const normalized = normalizeClassName(rawClassName);
    const aliasHit = classAliasMap.get(normalized);
    if (aliasHit) return aliasHit;

    const fuzzyHit = db.classes.find((item) => {
      const classNorm = normalizeClassName(item.name);
      return classNorm.includes(normalized) || normalized.includes(classNorm);
    });
    if (fuzzyHit) return fuzzyHit;

    const classInfo = ensureClassInDb(db, rawClassName, defaultDepartment.id);
    for (const alias of buildClassAlias(classInfo.name)) {
      classAliasMap.set(alias, classInfo);
    }
    return classInfo;
  };

  for (const row of detailRows) {
    const classInfo = findClassByAlias(row.className);
    const student = findOrCreateStudentByRecord(
      db,
      classInfo,
      row.studentName,
      defaultPasswordHash,
      keyMap,
      nameMap,
      stats
    );

    db.credit_records.push({
      id: db._nextId.credit_records++,
      student_id: student.id,
      teacher_id: importer.id,
      category: classifySummaryCategory(row.reason, row.points),
      reason: row.reason,
      points: row.points,
      source: row.source === "add" ? "加分详情导入" : "减分详情导入",
      created_at: now(),
    });
    count += 1;
  }

  return count;
}

function resetForTemplateImport(db: DbData): void {
  const admins = db.users.filter((user) => user.role === "Admin");
  if (admins.length === 0) {
    db.users = [
      {
        id: 1,
        username: "admin",
        password: bcrypt.hashSync("admin123", 10),
        name: "系统管理员",
        role: "Admin",
        password_changed: true,
        created_at: now(),
        updated_at: now(),
      },
    ];
  } else {
    db.users = admins;
  }

  const maxAdminId = db.users.reduce((maxId, user) => Math.max(maxId, user.id), 0);
  db.departments = [];
  db.classes = [];
  db.teacher_classes = [];
  db.credit_records = [];
  db.credit_applications = [];
  db.student_profiles = [];
  db._nextId = {
    departments: 1,
    classes: 1,
    users: maxAdminId + 1,
    credit_records: 1,
    credit_applications: 1,
  };
}

// =============== 用户操作 ===============

export function getDb(): DbData {
  return loadDb();
}

export function getAllUsers() {
  const db = loadDb();
  return db.users.map((user) => toSafeUser(user, db.classes));
}

export function findUserByUsername(username: string): User | undefined {
  return loadDb().users.find((item) => item.username === username);
}

export function createUser(data: {
  username: string;
  password: string;
  name: string;
  role: string;
  class_id?: number;
  password_changed?: boolean;
}): User {
  const db = loadDb();
  const user = createUserInDb(db, data);
  saveDb(db);
  return user;
}

export function batchImportUsers(list: {
  username: string;
  name: string;
  role: string;
  class_id?: number;
}[]): { imported: number; skipped: string[] } {
  const db = loadDb();
  const defaultPassword = bcrypt.hashSync("123456", 10);
  const skipped: string[] = [];
  let imported = 0;

  for (const item of list) {
    if (!item.username) continue;
    const exists = db.users.find((user) => user.username === item.username);
    if (exists) {
      skipped.push(item.username);
      continue;
    }
    createUserInDb(db, {
      username: item.username,
      password: defaultPassword,
      name: item.name || item.username,
      role: item.role,
      class_id: item.class_id,
      password_changed: false,
    });
    imported += 1;
  }

  saveDb(db);
  return { imported, skipped };
}

export function changePassword(userId: number, newPassword: string): boolean {
  const db = loadDb();
  const user = db.users.find((item) => item.id === userId);
  if (!user) return false;

  user.password = bcrypt.hashSync(newPassword, 10);
  user.password_changed = true;
  user.updated_at = now();
  saveDb(db);
  return true;
}

export function getStats() {
  const db = loadDb();
  return {
    users: db.users.length,
    teachers: db.users.filter((user) => user.role === "Teacher").length,
    students: db.users.filter((user) => user.role === "Student").length,
    classes: db.classes.length,
    departments: db.departments.length,
    records: db.credit_records.length,
    applications: db.credit_applications.length,
  };
}

// =============== 院系与班级管理 ===============

export function getAllDepartments() {
  return loadDb().departments;
}

export function createDepartment(name: string): Department {
  const db = loadDb();
  const result = ensureDepartmentInDb(db, name);
  saveDb(db);
  return result;
}

export function batchImportDepartments(names: string[]): { imported: number; skipped: string[] } {
  const db = loadDb();
  const skipped: string[] = [];
  let imported = 0;

  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const exists = db.departments.some((item) => item.name === trimmed);
    if (exists) {
      skipped.push(trimmed);
      continue;
    }
    ensureDepartmentInDb(db, trimmed);
    imported += 1;
  }

  saveDb(db);
  return { imported, skipped };
}

export function batchImportClasses(list: {
  name: string;
  grade: string;
  department_name: string;
}[]): { imported: number; skipped: string[] } {
  const db = loadDb();
  const skipped: string[] = [];
  let imported = 0;

  for (const item of list) {
    const department = db.departments.find((dept) => dept.name === item.department_name);
    if (!department) {
      skipped.push(`${item.name}(院系不存在:${item.department_name})`);
      continue;
    }
    const exists = db.classes.find(
      (classInfo) => classInfo.name === item.name && classInfo.department_id === department.id
    );
    if (exists) {
      skipped.push(item.name);
      continue;
    }
    db.classes.push({
      id: db._nextId.classes++,
      name: item.name,
      grade: item.grade || "未知",
      department_id: department.id,
      created_at: now(),
    });
    imported += 1;
  }

  saveDb(db);
  return { imported, skipped };
}

export function getAllClasses() {
  const db = loadDb();
  return db.classes.map((classInfo) => ({
    ...classInfo,
    department_name:
      db.departments.find((dept) => dept.id === classInfo.department_id)?.name || "未知",
    student_count: db.users.filter(
      (user) => user.role === "Student" && user.class_id === classInfo.id
    ).length,
    teachers: db.teacher_classes
      .filter((relation) => relation.class_id === classInfo.id)
      .map((relation) => {
        const teacher = db.users.find((user) => user.id === relation.teacher_id);
        if (!teacher) return null;
        return { id: teacher.id, name: teacher.name };
      })
      .filter(Boolean),
  }));
}

export function createClass(data: {
  name: string;
  grade: string;
  department_id: number;
}): ClassInfo {
  const db = loadDb();
  const classInfo: ClassInfo = {
    id: db._nextId.classes++,
    name: data.name,
    grade: data.grade,
    department_id: data.department_id,
    created_at: now(),
  };
  db.classes.push(classInfo);
  saveDb(db);
  return classInfo;
}

export function assignTeacherToClass(teacherId: number, classId: number) {
  const db = loadDb();
  const exists = db.teacher_classes.some(
    (relation) => relation.teacher_id === teacherId && relation.class_id === classId
  );
  if (!exists) {
    db.teacher_classes.push({ teacher_id: teacherId, class_id: classId });
    saveDb(db);
  }
}

export function removeTeacherFromClass(teacherId: number, classId: number) {
  const db = loadDb();
  db.teacher_classes = db.teacher_classes.filter(
    (relation) => !(relation.teacher_id === teacherId && relation.class_id === classId)
  );
  saveDb(db);
}

export function getTeacherList() {
  const db = loadDb();
  return db.users
    .filter((user) => user.role === "Teacher")
    .map((teacher) => {
      const { password: _password, ...rest } = teacher;
      void _password;
      return rest;
    });
}

// =============== 教师 -> 学生 (通过班级) ===============

export function getStudentsByTeacher(teacherId: number) {
  const db = loadDb();
  const classIds = db.teacher_classes
    .filter((relation) => relation.teacher_id === teacherId)
    .map((relation) => relation.class_id);

  return db.users
    .filter((user) => user.role === "Student" && user.class_id && classIds.includes(user.class_id))
    .map((student) => {
      const { password: _password, ...rest } = student;
      void _password;
      return {
        ...rest,
        class_name: db.classes.find((classInfo) => classInfo.id === rest.class_id)?.name || "未知",
      };
    });
}

export function getStudentList() {
  const db = loadDb();
  return db.users
    .filter((user) => user.role === "Student")
    .map((student) => {
      const { password: _password, ...rest } = student;
      void _password;
      return {
        ...rest,
        class_name: db.classes.find((classInfo) => classInfo.id === rest.class_id)?.name || "未分配",
      };
    });
}

// =============== 学分记录 ===============

export function addCreditRecord(data: {
  student_id: number;
  teacher_id: number;
  category: string;
  reason: string;
  points: number;
}): CreditRecord {
  const db = loadDb();
  const record: CreditRecord = {
    id: db._nextId.credit_records++,
    student_id: data.student_id,
    teacher_id: data.teacher_id,
    category: data.category,
    reason: data.reason,
    points: data.points,
    created_at: now(),
  };
  db.credit_records.push(record);
  saveDb(db);
  return record;
}

export function getRecordsByTeacher(teacherId: number) {
  const db = loadDb();
  return db.credit_records
    .filter((record) => record.teacher_id === teacherId)
    .map((record) => ({
      ...record,
      student_name: db.users.find((user) => user.id === record.student_id)?.name || "未知",
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getRecordsByStudent(studentId: number) {
  const db = loadDb();
  return db.credit_records
    .filter((record) => record.student_id === studentId)
    .map((record) => ({
      ...record,
      teacher_name: db.users.find((user) => user.id === record.teacher_id)?.name || "未知",
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getAllCreditRecords(): AdminCreditRecordRow[] {
  const db = loadDb();
  return db.credit_records
    .map((record) => {
      const student = db.users.find((item) => item.id === record.student_id);
      const teacher = db.users.find((item) => item.id === record.teacher_id);
      const className = student?.class_id
        ? db.classes.find((item) => item.id === student.class_id)?.name || "未分配"
        : "未分配";
      return {
        ...record,
        student_name: student?.name || "未知",
        student_username: student?.username || "-",
        class_name: className,
        teacher_name: teacher?.name || "系统",
      };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getStudentSummaryRows(): StudentSummaryRow[] {
  const db = loadDb();
  const recordsByStudent = new Map<number, CreditRecord[]>();
  for (const record of db.credit_records) {
    const list = recordsByStudent.get(record.student_id) ?? [];
    list.push(record);
    recordsByStudent.set(record.student_id, list);
  }

  const profileMap = new Map<number, StudentProfile>();
  for (const profile of db.student_profiles) {
    profileMap.set(profile.student_id, profile);
  }

  const students = db.users
    .filter((user) => user.role === "Student")
    .sort((a, b) => {
      const classA = db.classes.find((item) => item.id === a.class_id)?.name ?? "";
      const classB = db.classes.find((item) => item.id === b.class_id)?.name ?? "";
      if (classA !== classB) return classA.localeCompare(classB, "zh-Hans-CN");
      return a.name.localeCompare(b.name, "zh-Hans-CN");
    });

  return students.map((student) => {
    const className =
      db.classes.find((classInfo) => classInfo.id === student.class_id)?.name || "未分配";

    const profile =
      profileMap.get(student.id) ??
      buildProfileFromRecords(student.id, recordsByStudent.get(student.id) ?? []);

    return {
      student_id: student.id,
      username: student.username,
      name: student.name,
      class_name: className,
      base_score: profile.base_score,
      major_program_bonus: profile.major_program_bonus,
      class_committee: profile.category_scores.班委学生会,
      truancy: profile.category_scores.旷课,
      late_return: profile.category_scores.晚归,
      class_discipline: profile.category_scores.课堂纪律,
      late_arrival: profile.category_scores.迟到,
      leave: profile.category_scores.请假,
      dormitory: profile.category_scores.内务,
      discipline: profile.category_scores.违纪,
      youth_study_minus: profile.category_scores.青年大学习减,
      youth_study_plus: profile.category_scores.青年大学习加,
      full_attendance: profile.category_scores.全勤,
      self_improvement: profile.category_scores.个人提升,
      volunteer: profile.category_scores.志愿活动,
      award_competition: profile.category_scores.获奖比赛,
      model_dormitory: profile.category_scores.模范寝室,
      total_score: profile.total_score,
      signature: profile.signature ?? "",
    };
  });
}

// =============== 学分申报 ===============

export function createApplication(data: {
  student_id: number;
  category: string;
  reason: string;
  points: number;
}): CreditApplication {
  const db = loadDb();
  const app: CreditApplication = {
    id: db._nextId.credit_applications++,
    student_id: data.student_id,
    category: data.category,
    reason: data.reason,
    points: data.points,
    status: "Pending",
    created_at: now(),
  };
  db.credit_applications.push(app);
  saveDb(db);
  return app;
}

export function getAllApplications() {
  const db = loadDb();
  return db.credit_applications
    .map((item) => ({
      ...item,
      student_name: db.users.find((user) => user.id === item.student_id)?.name || "未知",
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getApplicationsByStudent(studentId: number) {
  return loadDb()
    .credit_applications.filter((item) => item.student_id === studentId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function reviewApplication(appId: number, status: string, reviewerId: number) {
  const db = loadDb();
  const app = db.credit_applications.find((item) => item.id === appId);
  if (!app) return null;

  app.status = status;
  app.reviewer_id = reviewerId;
  app.reviewed_at = now();

  if (status === "Approved") {
    db.credit_records.push({
      id: db._nextId.credit_records++,
      student_id: app.student_id,
      teacher_id: reviewerId,
      category: app.category,
      reason: app.reason,
      points: app.points,
      source: "申报通过",
      created_at: now(),
    });
  }

  saveDb(db);
  return app;
}

// =============== 模板导入 ===============

export function importFromExcelTemplates(options: ImportExcelOptions): ImportExcelResult {
  const parsed = parseTemplateExcelFiles({
    addDetailsPath: options.addDetailsPath,
    minusDetailsPath: options.minusDetailsPath,
    summaryPath: options.summaryPath,
  });

  const db = loadDb();
  if (options.resetDatabase ?? true) {
    resetForTemplateImport(db);
  }

  const warnings: string[] = [];
  if (parsed.students.length === 0) warnings.push("记录表未解析到学生行");
  if (parsed.addRecords.length === 0) warnings.push("加分详情未解析到记录");
  if (parsed.minusRecords.length === 0) warnings.push("减分详情未解析到记录");

  const department = ensureDepartmentInDb(db, "Excel导入");
  const defaultPasswordHash = bcrypt.hashSync("123456", 10);

  let importer = db.users.find((user) => user.username === "excel_importer");
  if (!importer) {
    importer = createUserInDb(db, {
      username: "excel_importer",
      password: bcrypt.hashSync("excel123", 10),
      name: "Excel导入教师",
      role: "Teacher",
      password_changed: true,
    });
  }

  const classAliasMap = new Map<string, ClassInfo>();
  const ensureClassByName = (className: string): ClassInfo => {
    const normalized = normalizeClassName(className);
    const aliasHit = classAliasMap.get(normalized);
    if (aliasHit) return aliasHit;

    const existed = db.classes.find(
      (item) =>
        normalizeClassName(item.name) === normalized ||
        normalizeClassName(item.name).includes(normalized) ||
        normalized.includes(normalizeClassName(item.name))
    );
    const classInfo = existed ?? ensureClassInDb(db, className, department.id);

    for (const alias of buildClassAlias(classInfo.name)) {
      classAliasMap.set(alias, classInfo);
    }
    return classInfo;
  };

  for (const classInfo of db.classes) {
    for (const alias of buildClassAlias(classInfo.name)) {
      classAliasMap.set(alias, classInfo);
    }
  }

  const studentKeyMap = new Map<string, User>();
  const studentNameMap = new Map<string, User[]>();
  const registerStudentLookup = (student: User): void => {
    if (student.role !== "Student" || !student.class_id) return;
    const className = db.classes.find((classInfo) => classInfo.id === student.class_id)?.name;
    if (!className) return;

    const key = `${normalizeClassName(className)}|${normalizeName(student.name)}`;
    studentKeyMap.set(key, student);
    const nameKey = normalizeName(student.name);
    const list = studentNameMap.get(nameKey) ?? [];
    list.push(student);
    studentNameMap.set(nameKey, list);
  };

  for (const user of db.users) registerStudentLookup(user);

  let importedStudents = 0;
  const importedClassesBefore = db.classes.length;

  for (const row of parsed.students) {
    const classInfo = ensureClassByName(row.className);
    const key = `${normalizeClassName(classInfo.name)}|${normalizeName(row.name)}`;
    let student = studentKeyMap.get(key);

    if (!student) {
      let username = row.studentNo || `STU${String(db._nextId.users).padStart(6, "0")}`;
      while (db.users.some((item) => item.username === username)) {
        username = `STU${String(db._nextId.users + 1).padStart(6, "0")}`;
      }

      student = createUserInDb(db, {
        username,
        password: defaultPasswordHash,
        name: row.name,
        role: "Student",
        class_id: classInfo.id,
        password_changed: false,
      });
      importedStudents += 1;
    }

    registerStudentLookup(student);
    const profile = buildProfileFromSummary(student.id, row);
    db.student_profiles = db.student_profiles.filter((item) => item.student_id !== student.id);
    db.student_profiles.push(profile);
  }

  const autoCreateStats = { autoCreated: 0 };
  const importedRecords = importRecordRows(
    db,
    importer,
    [...parsed.addRecords, ...parsed.minusRecords],
    classAliasMap,
    studentKeyMap,
    studentNameMap,
    defaultPasswordHash,
    autoCreateStats
  );

  const profileStudentIds = new Set(db.student_profiles.map((item) => item.student_id));
  const recordsByStudent = new Map<number, CreditRecord[]>();
  for (const record of db.credit_records) {
    const list = recordsByStudent.get(record.student_id) ?? [];
    list.push(record);
    recordsByStudent.set(record.student_id, list);
  }

  for (const student of db.users.filter((item) => item.role === "Student")) {
    if (profileStudentIds.has(student.id)) continue;
    const fallback = buildProfileFromRecords(student.id, recordsByStudent.get(student.id) ?? []);
    db.student_profiles.push(fallback);
  }

  saveDb(db);

  return {
    importedClasses: db.classes.length - importedClassesBefore,
    importedStudents,
    importedRecords,
    importedProfiles: db.student_profiles.length,
    autoCreatedStudents: autoCreateStats.autoCreated,
    warnings,
  };
}
