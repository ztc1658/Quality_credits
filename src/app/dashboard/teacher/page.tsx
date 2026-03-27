"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../dashboard.module.css";

const CATEGORIES = ["学术竞赛", "社团活动", "志愿服务", "文体活动", "纪律扣分", "其他"];

export default function TeacherDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("students");

  const [students, setStudents] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);

  const [keyword, setKeyword] = useState("");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");

  const [baseClassId, setBaseClassId] = useState("");
  const [baseScore, setBaseScore] = useState("60");

  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditForm, setCreditForm] = useState({
    studentId: "",
    category: CATEGORIES[0],
    reason: "",
    points: "",
  });

  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [tip, setTip] = useState("");
  const [err, setErr] = useState("");

  const classOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const student of students) {
      if (student.class_id && student.class_name) {
        map.set(student.class_id, student.class_name);
      }
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [students]);

  const loadStudents = async (teacherId: number) => {
    const search = new URLSearchParams();
    search.set("teacherId", String(teacherId));
    if (keyword.trim()) search.set("keyword", keyword.trim());
    if (minScore.trim()) search.set("minScore", minScore.trim());
    if (maxScore.trim()) search.set("maxScore", maxScore.trim());
    const res = await fetch(`/api/teacher/students?${search.toString()}`);
    if (res.ok) setStudents(await res.json());
  };

  const loadRecords = async (teacherId: number) => {
    const res = await fetch(`/api/teacher/records?teacherId=${teacherId}`);
    if (res.ok) setRecords(await res.json());
  };

  const loadApplications = async (teacherId: number) => {
    const res = await fetch(`/api/teacher/applications?teacherId=${teacherId}`);
    if (res.ok) setApplications(await res.json());
  };

  const loadAll = async (teacherId: number) => {
    await Promise.all([loadStudents(teacherId), loadRecords(teacherId), loadApplications(teacherId)]);
  };

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/");
      return;
    }
    const u = JSON.parse(stored);
    if (u.role !== "Teacher") {
      router.push("/");
      return;
    }
    setUser(u);
    loadAll(u.id).catch(() => setErr("初始化加载失败"));
  }, [router]);

  const resetTip = () => {
    setTip("");
    setErr("");
  };

  const handleSearch = async () => {
    if (!user) return;
    await loadStudents(user.id);
  };

  const handleSetBaseScore = async () => {
    resetTip();
    if (!user || !baseClassId || !baseScore) return;
    const res = await fetch("/api/teacher/base-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacherId: user.id,
        classId: Number(baseClassId),
        baseScore: Number(baseScore),
      }),
    });
    const data = await res.json();
    if (!res.ok) return setErr(data.error || "设置失败");
    setTip(`基础分设置成功，更新 ${data.updated} 人`);
    await loadStudents(user.id);
  };

  const handleAddCredit = async () => {
    resetTip();
    if (!user || !creditForm.studentId || !creditForm.reason || !creditForm.points) return;
    const res = await fetch("/api/teacher/credit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: Number(creditForm.studentId),
        teacherId: user.id,
        category: creditForm.category,
        reason: creditForm.reason,
        points: Number(creditForm.points),
      }),
    });
    const data = await res.json();
    if (!res.ok) return setErr(data.error || "提交失败");
    setTip("学分操作成功");
    setShowCreditModal(false);
    setCreditForm({ studentId: "", category: CATEGORIES[0], reason: "", points: "" });
    await loadAll(user.id);
  };

  const handleReview = async (applicationId: number, status: "Approved" | "Rejected") => {
    resetTip();
    if (!user) return;
    const note = reviewNotes[String(applicationId)] ?? "";
    const res = await fetch("/api/teacher/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId,
        status,
        reviewerId: user.id,
        reviewNote: note,
      }),
    });
    const data = await res.json();
    if (!res.ok) return setErr(data.error || "审核失败");
    setTip(status === "Approved" ? "已通过申请" : "已驳回申请");
    await loadAll(user.id);
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
          <p>教师工作台</p>
        </div>
        <button className={activeTab === "students" ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab("students")}>👨‍🎓 学生管理</button>
        <button className={activeTab === "credit" ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab("credit")}>✏️ 学分操作</button>
        <button className={activeTab === "review" ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab("review")}>📝 申请审批</button>
        <button className={styles.logoutBtn} onClick={logout}>🚪 退出登录</button>
      </nav>

      <main className={styles.content}>
        {tip && <div className={styles.statusApproved} style={{ display: "inline-block", marginBottom: "1rem" }}>{tip}</div>}
        {err && <div className={styles.statusRejected} style={{ display: "inline-block", marginBottom: "1rem" }}>{err}</div>}

        {activeTab === "students" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}><h2>学生筛选与基础分设置</h2></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(120px,1fr))", gap: "0.8rem", marginBottom: "1rem" }}>
              <input className={styles.modalInput} placeholder="学号/姓名关键字" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
              <input className={styles.modalInput} placeholder="最低总分" value={minScore} onChange={(e) => setMinScore(e.target.value)} />
              <input className={styles.modalInput} placeholder="最高总分" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
              <button className={styles.addBtn} onClick={handleSearch}>筛选</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "0.8rem", marginBottom: "1.2rem" }}>
              <select className={styles.modalInput} value={baseClassId} onChange={(e) => setBaseClassId(e.target.value)}>
                <option value="">--选择班级设置基础分--</option>
                {classOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input className={styles.modalInput} value={baseScore} onChange={(e) => setBaseScore(e.target.value)} />
              <div />
              <button className={styles.addBtn} onClick={handleSetBaseScore}>批量设置基础分</button>
            </div>

            <table className={styles.table}>
              <thead><tr><th>学号</th><th>姓名</th><th>班级</th><th>基础分</th><th>变动分</th><th>当前总分</th></tr></thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td>{s.username}</td>
                    <td>{s.name}</td>
                    <td>{s.class_name}</td>
                    <td>{s.base_score}</td>
                    <td className={s.ledger_delta >= 0 ? styles.pointsPositive : styles.pointsNegative}>
                      {s.ledger_delta >= 0 ? `+${s.ledger_delta}` : s.ledger_delta}
                    </td>
                    <td>{s.total_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "credit" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>加减分操作（理由必填，流水不可篡改）</h2>
              <button className={styles.addBtn} onClick={() => setShowCreditModal(true)}>+ 新增操作</button>
            </div>
            <table className={styles.table}>
              <thead><tr><th>学生</th><th>分类</th><th>理由</th><th>分值</th><th>时间</th></tr></thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>{r.student_name}</td>
                    <td>{r.category}</td>
                    <td>{r.reason}</td>
                    <td className={r.points >= 0 ? styles.pointsPositive : styles.pointsNegative}>{r.points > 0 ? `+${r.points}` : r.points}</td>
                    <td>{r.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "review" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}><h2>学生加分申请审批</h2></div>
            <table className={styles.table}>
              <thead><tr><th>学生</th><th>班级</th><th>申请内容</th><th>申请分值</th><th>证明</th><th>状态</th><th>审批备注</th><th>操作</th></tr></thead>
              <tbody>
                {applications.map((a) => (
                  <tr key={a.id}>
                    <td>{a.student_name} ({a.student_username})</td>
                    <td>{a.class_name}</td>
                    <td>{a.reason}</td>
                    <td>{a.points}</td>
                    <td>{a.proof ? <a href={a.proof} target="_blank" rel="noreferrer">查看证明</a> : "-"}</td>
                    <td>
                      <span className={a.status === "Pending" ? styles.statusPending : a.status === "Approved" ? styles.statusApproved : styles.statusRejected}>
                        {a.status}
                      </span>
                    </td>
                    <td>
                      <input
                        className={styles.modalInput}
                        value={reviewNotes[String(a.id)] ?? ""}
                        onChange={(e) => setReviewNotes((prev) => ({ ...prev, [String(a.id)]: e.target.value }))}
                        placeholder="可选备注"
                      />
                    </td>
                    <td>
                      {a.status === "Pending" && (
                        <>
                          <button className={styles.actionBtn} onClick={() => handleReview(a.id, "Approved")}>通过</button>
                          <button className={styles.actionBtn} onClick={() => handleReview(a.id, "Rejected")}>驳回</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showCreditModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreditModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>新增加减分记录</h3>
            <div className={styles.modalForm}>
              <div className={styles.modalInputGroup}>
                <label>选择学生</label>
                <select className={styles.modalInput} value={creditForm.studentId} onChange={(e) => setCreditForm((prev) => ({ ...prev, studentId: e.target.value }))}>
                  <option value="">--请选择学生--</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.username})</option>)}
                </select>
              </div>
              <div className={styles.modalInputGroup}>
                <label>分类</label>
                <select className={styles.modalInput} value={creditForm.category} onChange={(e) => setCreditForm((prev) => ({ ...prev, category: e.target.value }))}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className={styles.modalInputGroup}>
                <label>理由（必填）</label>
                <input className={styles.modalInput} value={creditForm.reason} onChange={(e) => setCreditForm((prev) => ({ ...prev, reason: e.target.value }))} />
              </div>
              <div className={styles.modalInputGroup}>
                <label>分值（正数加分，负数减分）</label>
                <input className={styles.modalInput} type="number" step="0.5" value={creditForm.points} onChange={(e) => setCreditForm((prev) => ({ ...prev, points: e.target.value }))} />
              </div>
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={() => setShowCreditModal(false)}>取消</button>
                <button className={styles.submitBtn} onClick={handleAddCredit}>提交</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
