"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../dashboard.module.css";

interface DashboardUser {
  id: number;
  username: string;
  name: string;
  role: string;
}

interface Stats {
  users: number;
  teachers: number;
  students: number;
  classes: number;
  departments: number;
  records: number;
  applications: number;
}

interface SummaryRow {
  student_id: number;
  username: string;
  name: string;
  class_name: string;
  total_score: number;
  base_score: number;
}

interface DetailRow {
  id: number;
  class_name: string;
  student_name: string;
  student_username: string;
  category: string;
  reason: string;
  points: number;
  source?: string;
  created_at: string;
}

interface ExcelImportResult {
  message: string;
  importedClasses: number;
  importedStudents: number;
  importedRecords: number;
  importedProfiles: number;
  autoCreatedStudents: number;
  warnings: string[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [stats, setStats] = useState<Stats>({
    users: 0,
    teachers: 0,
    students: 0,
    classes: 0,
    departments: 0,
    records: 0,
    applications: 0,
  });

  const [excelPaths, setExcelPaths] = useState({
    addDetailsPath: "data/template-files/add-details.xlsx",
    minusDetailsPath: "data/template-files/minus-details.xlsx",
    summaryPath: "data/template-files/summary.xlsx",
  });
  const [excelImporting, setExcelImporting] = useState(false);
  const [excelResult, setExcelResult] = useState<ExcelImportResult | null>(null);
  const [excelError, setExcelError] = useState("");

  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([]);
  const [detailRows, setDetailRows] = useState<DetailRow[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const fetchJson = async <T,>(url: string): Promise<T> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error("request_failed");
    return (await response.json()) as T;
  };

  const loadOverview = async () => {
    const data = await fetchJson<Stats>("/api/admin/stats");
    setStats(data);
  };

  const loadRecords = async () => {
    setRecordsLoading(true);
    try {
      const payload = await fetchJson<{ summary: SummaryRow[]; details: DetailRow[] }>(
        "/api/admin/records?mode=all"
      );
      setSummaryRows(payload.summary ?? []);
      setDetailRows(payload.details ?? []);
    } finally {
      setRecordsLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadOverview(), loadRecords()]);
  };

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/");
      return;
    }
    const current = JSON.parse(stored) as DashboardUser;
    if (current.role !== "Admin") {
      router.push("/");
      return;
    }
    setUser(current);
    refreshAll().catch(() => {
      // ignore on first paint
    });
  }, [router]);

  const handleExcelImport = async () => {
    setExcelImporting(true);
    setExcelResult(null);
    setExcelError("");
    try {
      const response = await fetch("/api/admin/import-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...excelPaths, resetDatabase: true }),
      });
      const data = (await response.json()) as ExcelImportResult | { error: string };
      if (!response.ok || "error" in data) {
        setExcelError("error" in data ? data.error : "导入失败");
        return;
      }
      setExcelResult(data);
      await refreshAll();
    } catch {
      setExcelError("模板导入失败，请检查文件路径");
    } finally {
      setExcelImporting(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  if (!user) return null;

  return (
    <div className={styles.dashboard}>
      <nav className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>素质学分平台</h2>
          <p>管理员控制台</p>
        </div>
        <button className={activeTab === "overview" ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab("overview")}>
          <span className={styles.navIcon}>📊</span> 数据概览
        </button>
        <button className={activeTab === "import" ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab("import")}>
          <span className={styles.navIcon}>📥</span> 模板导入
        </button>
        <button className={activeTab === "records" ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab("records")}>
          <span className={styles.navIcon}>📋</span> 学分记录
        </button>
        <button className={styles.logoutBtn} onClick={logout}>
          <span className={styles.navIcon}>🚪</span> 退出登录
        </button>
      </nav>

      <main className={styles.content}>
        {activeTab === "overview" && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard}><div className={styles.statLabel}>注册用户</div><div className={styles.statValue}>{stats.users}</div></div>
            <div className={styles.statCard}><div className={styles.statLabel}>学生人数</div><div className={styles.statValue}>{stats.students}</div></div>
            <div className={styles.statCard}><div className={styles.statLabel}>班级数量</div><div className={styles.statValue}>{stats.classes}</div></div>
            <div className={styles.statCard}><div className={styles.statLabel}>学分流水</div><div className={styles.statValue}>{stats.records}</div></div>
          </div>
        )}

        {activeTab === "import" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}><h2>按3个Excel模板导入</h2></div>
            <div className={styles.modalInputGroup}>
              <label>加分详情路径</label>
              <input className={styles.modalInput} value={excelPaths.addDetailsPath} onChange={(e) => setExcelPaths((p) => ({ ...p, addDetailsPath: e.target.value }))} />
            </div>
            <div className={styles.modalInputGroup}>
              <label>减分详情路径</label>
              <input className={styles.modalInput} value={excelPaths.minusDetailsPath} onChange={(e) => setExcelPaths((p) => ({ ...p, minusDetailsPath: e.target.value }))} />
            </div>
            <div className={styles.modalInputGroup}>
              <label>记录表路径</label>
              <input className={styles.modalInput} value={excelPaths.summaryPath} onChange={(e) => setExcelPaths((p) => ({ ...p, summaryPath: e.target.value }))} />
            </div>
            <div style={{ marginTop: "1rem" }}>
              <button className={styles.addBtn} onClick={handleExcelImport} disabled={excelImporting}>
                {excelImporting ? "导入中..." : "开始导入"}
              </button>
            </div>
            {excelError && <div className={styles.emptyState}>{excelError}</div>}
            {excelResult && (
              <div className={styles.section}>
                <div>新增班级：{excelResult.importedClasses}</div>
                <div>新增学生：{excelResult.importedStudents}</div>
                <div>导入流水：{excelResult.importedRecords}</div>
                <div>汇总档案：{excelResult.importedProfiles}</div>
                <div>自动建档：{excelResult.autoCreatedStudents}</div>
                {excelResult.warnings.length > 0 && <div>提示：{excelResult.warnings.join("；")}</div>}
              </div>
            )}
          </div>
        )}

        {activeTab === "records" && (
          <>
            <div className={styles.section}>
              <div className={styles.sectionHeader}><h2>记录表汇总</h2></div>
              {recordsLoading ? (
                <div className={styles.emptyState}>加载中...</div>
              ) : (
                <table className={styles.table}>
                  <thead><tr><th>姓名</th><th>学号</th><th>班级</th><th>基础分</th><th>总分</th></tr></thead>
                  <tbody>
                    {summaryRows.map((row) => (
                      <tr key={row.student_id}>
                        <td>{row.name}</td>
                        <td>{row.username}</td>
                        <td>{row.class_name}</td>
                        <td>{row.base_score}</td>
                        <td>{row.total_score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}><h2>加减分明细</h2></div>
              {recordsLoading ? (
                <div className={styles.emptyState}>加载中...</div>
              ) : (
                <table className={styles.table}>
                  <thead><tr><th>班级</th><th>姓名</th><th>学号</th><th>分类</th><th>原因</th><th>分值</th><th>来源</th><th>时间</th></tr></thead>
                  <tbody>
                    {detailRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.class_name}</td>
                        <td>{row.student_name}</td>
                        <td>{row.student_username}</td>
                        <td>{row.category}</td>
                        <td>{row.reason}</td>
                        <td className={row.points >= 0 ? styles.pointsPositive : styles.pointsNegative}>{row.points > 0 ? `+${row.points}` : row.points}</td>
                        <td>{row.source || "-"}</td>
                        <td>{row.created_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
