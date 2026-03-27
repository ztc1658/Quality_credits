"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../dashboard.module.css";

type UserLite = { id: number; username: string; name: string; role: string; class_name?: string };
type Stats = {
  users: number;
  teachers: number;
  students: number;
  classes: number;
  departments: number;
  records: number;
  applications: number;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
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
  const [users, setUsers] = useState<UserLite[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [summaryRows, setSummaryRows] = useState<any[]>([]);
  const [detailRows, setDetailRows] = useState<any[]>([]);

  const [deptName, setDeptName] = useState("");
  const [newClass, setNewClass] = useState({ name: "", grade: "", department_id: "" });
  const [assignForm, setAssignForm] = useState({ teacher_id: "", class_id: "" });
  const [batchDeptText, setBatchDeptText] = useState("");
  const [batchClassText, setBatchClassText] = useState("");
  const [batchAssignText, setBatchAssignText] = useState("");

  const [importRole, setImportRole] = useState("Student");
  const [importClassId, setImportClassId] = useState("");
  const [importText, setImportText] = useState("");
  const [importExcelFile, setImportExcelFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const clearTips = () => {
    setMessage("");
    setError("");
  };

  const refreshAll = useCallback(async () => {
    const [statsRes, usersRes, classesRes, teachersRes, departmentsRes, recordsRes] =
      await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/users"),
        fetch("/api/admin/classes"),
        fetch("/api/admin/classes?type=teachers"),
        fetch("/api/admin/classes?type=departments"),
        fetch("/api/admin/records?mode=all"),
      ]);

    if (statsRes.ok) setStats(await statsRes.json());
    if (usersRes.ok) setUsers(await usersRes.json());
    if (classesRes.ok) setClasses(await classesRes.json());
    if (teachersRes.ok) setTeachers(await teachersRes.json());
    if (departmentsRes.ok) setDepartments(await departmentsRes.json());
    if (recordsRes.ok) {
      const data = await recordsRes.json();
      setSummaryRows(data.summary ?? []);
      setDetailRows(data.details ?? []);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/");
      return;
    }
    const user = JSON.parse(stored);
    if (user.role !== "Admin") {
      router.push("/");
      return;
    }
    setCurrentUser(user);
    refreshAll().catch(() => setError("初始化数据失败"));
  }, [refreshAll, router]);

  const classOptions = useMemo(
    () => classes.map((item) => ({ value: String(item.id), label: item.name })),
    [classes]
  );

  const handleCreateDepartment = async () => {
    clearTips();
    if (!deptName.trim()) return;
    const res = await fetch("/api/admin/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "createDepartment", name: deptName.trim() }),
    });
    if (!res.ok) return setError("新增院系失败");
    setDeptName("");
    setMessage("新增院系成功");
    await refreshAll();
  };

  const handleBatchDepartmentImport = async () => {
    clearTips();
    const names = batchDeptText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    const res = await fetch("/api/admin/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "batchImportDepartments", names }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "院系批量导入失败");
    setMessage(`院系批量导入完成：新增 ${data.imported}，跳过 ${data.skipped?.length || 0}`);
    await refreshAll();
  };

  const handleCreateClass = async () => {
    clearTips();
    if (!newClass.name || !newClass.department_id) return;
    const res = await fetch("/api/admin/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "createClass",
        name: newClass.name.trim(),
        grade: newClass.grade.trim() || "未知",
        department_id: Number(newClass.department_id),
      }),
    });
    if (!res.ok) return setError("新增班级失败");
    setNewClass({ name: "", grade: "", department_id: "" });
    setMessage("新增班级成功");
    await refreshAll();
  };

  const handleBatchClassImport = async () => {
    clearTips();
    const rows = batchClassText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[,，\t]/).map((v) => v.trim());
        return {
          name: parts[0] || "",
          grade: parts[1] || "未知",
          department_name: parts[2] || "",
        };
      })
      .filter((item) => item.name && item.department_name);
    if (rows.length === 0) return;

    const res = await fetch("/api/admin/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "batchImportClasses", classes: rows }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "班级批量导入失败");
    setMessage(`班级批量导入完成：新增 ${data.imported}，跳过 ${data.skipped?.length || 0}`);
    await refreshAll();
  };

  const handleAssignTeacher = async () => {
    clearTips();
    if (!assignForm.teacher_id || !assignForm.class_id) return;
    const res = await fetch("/api/admin/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "assignTeacher",
        teacher_id: Number(assignForm.teacher_id),
        class_id: Number(assignForm.class_id),
      }),
    });
    if (!res.ok) return setError("分配失败");
    setAssignForm({ teacher_id: "", class_id: "" });
    setMessage("教师分配成功");
    await refreshAll();
  };

  const handleBatchAssignTeacher = async () => {
    clearTips();
    const items = batchAssignText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[,，\t]/).map((v) => v.trim());
        return {
          teacher_username: parts[0] || "",
          class_name: parts[1] || "",
        };
      })
      .filter((item) => item.teacher_username && item.class_name);

    if (items.length === 0) return;
    const res = await fetch("/api/admin/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "batchAssignTeachers", items }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "批量分配失败");
    setMessage(`批量分配完成：成功 ${data.assigned}，跳过 ${data.skipped?.length || 0}`);
    await refreshAll();
  };

  const handleImportFromText = async () => {
    clearTips();
    const lines = importText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    const usersPayload = lines.map((line) => {
      const parts = line.split(/[,，\t]/).map((v) => v.trim());
      return {
        username: parts[0],
        name: parts[1] || parts[0],
        role: importRole,
        class_id: importRole === "Student" && importClassId ? Number(importClassId) : undefined,
      };
    });
    const res = await fetch("/api/admin/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ users: usersPayload }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "导入失败");
    setMessage(data.message || "导入成功");
    await refreshAll();
  };

  const handleImportFromExcel = async () => {
    clearTips();
    if (!importExcelFile) return setError("请先选择Excel文件");
    const formData = new FormData();
    formData.append("file", importExcelFile);
    formData.append("role", importRole);
    if (importRole === "Student" && importClassId) formData.append("classId", importClassId);

    const res = await fetch("/api/admin/import", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Excel导入失败");
    setMessage(data.message || "Excel导入成功");
    setImportExcelFile(null);
    await refreshAll();
  };

  const logout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  if (!currentUser) return null;

  return (
    <div className={styles.dashboard}>
      <nav className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>素质学分平台</h2>
          <p>超级管理员</p>
        </div>
        <button className={activeTab === "overview" ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab("overview")}>📊 数据概览</button>
        <button className={activeTab === "accounts" ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab("accounts")}>👥 账号管理</button>
        <button className={activeTab === "classes" ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab("classes")}>🏫 班级与分配</button>
        <button className={activeTab === "records" ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab("records")}>📋 学分总览</button>
        <button className={styles.logoutBtn} onClick={logout}>🚪 退出登录</button>
      </nav>

      <main className={styles.content}>
        {message && <div className={styles.statusApproved} style={{ marginBottom: "1rem", display: "inline-block" }}>{message}</div>}
        {error && <div className={styles.statusRejected} style={{ marginBottom: "1rem", display: "inline-block" }}>{error}</div>}

        {activeTab === "overview" && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard}><div className={styles.statLabel}>总用户</div><div className={styles.statValue}>{stats.users}</div></div>
            <div className={styles.statCard}><div className={styles.statLabel}>教师</div><div className={styles.statValue}>{stats.teachers}</div></div>
            <div className={styles.statCard}><div className={styles.statLabel}>学生</div><div className={styles.statValue}>{stats.students}</div></div>
            <div className={styles.statCard}><div className={styles.statLabel}>班级</div><div className={styles.statValue}>{stats.classes}</div></div>
          </div>
        )}

        {activeTab === "accounts" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}><h2>批量导入账号（默认密码 123456，首次登录强制改密）</h2></div>
            <div className={styles.modalInputGroup}>
              <label>导入角色</label>
              <select className={styles.modalInput} value={importRole} onChange={(e) => setImportRole(e.target.value)}>
                <option value="Student">学生</option>
                <option value="Teacher">教师</option>
              </select>
            </div>
            {importRole === "Student" && (
              <div className={styles.modalInputGroup}>
                <label>学生默认班级</label>
                <select className={styles.modalInput} value={importClassId} onChange={(e) => setImportClassId(e.target.value)}>
                  <option value="">--请选择班级--</option>
                  {classOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
            )}
            <div className={styles.modalInputGroup}>
              <label>文本导入（每行：学号/工号,姓名）</label>
              <textarea className={styles.modalInput} style={{ minHeight: 140 }} value={importText} onChange={(e) => setImportText(e.target.value)} />
              <button className={styles.addBtn} onClick={handleImportFromText}>文本导入</button>
            </div>
            <div className={styles.modalInputGroup}>
              <label>Excel导入（前两列：账号、姓名）</label>
              <input className={styles.modalInput} type="file" accept=".xlsx,.xls" onChange={(e) => setImportExcelFile(e.target.files?.[0] ?? null)} />
              <button className={styles.addBtn} onClick={handleImportFromExcel}>Excel导入</button>
            </div>

            <div className={styles.sectionHeader}><h2>账号列表（最近100条）</h2></div>
            <table className={styles.table}>
              <thead><tr><th>账号</th><th>姓名</th><th>角色</th><th>班级</th></tr></thead>
              <tbody>
                {users.slice(0, 100).map((u) => (
                  <tr key={u.id}><td>{u.username}</td><td>{u.name}</td><td>{u.role}</td><td>{u.class_name || "-"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "classes" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}><h2>院系与班级</h2></div>
            <div className={styles.modalInputGroup}>
              <label>新增院系</label>
              <input className={styles.modalInput} value={deptName} onChange={(e) => setDeptName(e.target.value)} />
              <button className={styles.addBtn} onClick={handleCreateDepartment}>新增院系</button>
            </div>
            <div className={styles.modalInputGroup}>
              <label>批量导入院系（每行一个名称）</label>
              <textarea
                className={styles.modalInput}
                style={{ minHeight: 110 }}
                value={batchDeptText}
                onChange={(e) => setBatchDeptText(e.target.value)}
                placeholder={"示例：\n计算机学院\n外国语学院\n新能源学院"}
              />
              <button className={styles.addBtn} onClick={handleBatchDepartmentImport}>批量导入院系</button>
            </div>

            <div className={styles.modalInputGroup}>
              <label>新增班级</label>
              <select className={styles.modalInput} value={newClass.department_id} onChange={(e) => setNewClass((prev) => ({ ...prev, department_id: e.target.value }))}>
                <option value="">--请选择院系--</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <input className={styles.modalInput} placeholder="班级名" value={newClass.name} onChange={(e) => setNewClass((prev) => ({ ...prev, name: e.target.value }))} />
              <input className={styles.modalInput} placeholder="年级" value={newClass.grade} onChange={(e) => setNewClass((prev) => ({ ...prev, grade: e.target.value }))} />
              <button className={styles.addBtn} onClick={handleCreateClass}>新增班级</button>
            </div>
            <div className={styles.modalInputGroup}>
              <label>批量导入班级（每行：班级名,年级,院系名）</label>
              <textarea
                className={styles.modalInput}
                style={{ minHeight: 110 }}
                value={batchClassText}
                onChange={(e) => setBatchClassText(e.target.value)}
                placeholder={"示例：\n软件工程1班,2024,计算机学院\n软件工程2班,2024,计算机学院"}
              />
              <button className={styles.addBtn} onClick={handleBatchClassImport}>批量导入班级</button>
            </div>

            <div className={styles.modalInputGroup}>
              <label>分配教师到班级</label>
              <select className={styles.modalInput} value={assignForm.teacher_id} onChange={(e) => setAssignForm((prev) => ({ ...prev, teacher_id: e.target.value }))}>
                <option value="">--请选择教师--</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}({t.username})</option>)}
              </select>
              <select className={styles.modalInput} value={assignForm.class_id} onChange={(e) => setAssignForm((prev) => ({ ...prev, class_id: e.target.value }))}>
                <option value="">--请选择班级--</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button className={styles.addBtn} onClick={handleAssignTeacher}>确认分配</button>
            </div>
            <div className={styles.modalInputGroup}>
              <label>批量分配教师（每行：教师账号,班级名）</label>
              <textarea
                className={styles.modalInput}
                style={{ minHeight: 110 }}
                value={batchAssignText}
                onChange={(e) => setBatchAssignText(e.target.value)}
                placeholder={"示例：\n20249999,软件工程1班\n20249998,软件工程2班"}
              />
              <button className={styles.addBtn} onClick={handleBatchAssignTeacher}>批量分配教师</button>
            </div>

            <table className={styles.table}>
              <thead><tr><th>班级</th><th>院系</th><th>学生数</th><th>教师</th></tr></thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.department_name}</td>
                    <td>{c.student_count}</td>
                    <td>{(c.teachers || []).map((t: any) => t.name).join("、") || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "records" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}><h2>学生学分总览</h2></div>
            <table className={styles.table}>
              <thead><tr><th>姓名</th><th>学号</th><th>班级</th><th>基础分</th><th>总分</th></tr></thead>
              <tbody>
                {summaryRows.map((row) => (
                  <tr key={row.student_id}><td>{row.name}</td><td>{row.username}</td><td>{row.class_name}</td><td>{row.base_score}</td><td>{row.total_score}</td></tr>
                ))}
              </tbody>
            </table>
            <div className={styles.sectionHeader} style={{ marginTop: "1.5rem" }}><h2>不可篡改流水</h2></div>
            <table className={styles.table}>
              <thead><tr><th>班级</th><th>姓名</th><th>分类</th><th>理由</th><th>分值</th><th>时间</th></tr></thead>
              <tbody>
                {detailRows.slice(0, 200).map((row) => (
                  <tr key={row.id}><td>{row.class_name}</td><td>{row.student_name}</td><td>{row.category}</td><td>{row.reason}</td><td>{row.points}</td><td>{row.created_at}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
