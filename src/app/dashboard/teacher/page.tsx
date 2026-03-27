"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../dashboard.module.css";

interface User {
  id: number; username: string; name: string; role: string;
}

const CATEGORIES = ["学术竞赛", "社团活动", "志愿服务", "文体活动", "违纪扣分", "其他"];

export default function TeacherDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [students, setStudents] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [creditForm, setCreditForm] = useState({ studentId: "", category: CATEGORIES[0], reason: "", points: "" });

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/"); return; }
    const u = JSON.parse(stored);
    if (u.role !== "Teacher") { router.push("/"); return; }
    setUser(u);
    loadData(u.id);
  }, [router]);

  const loadData = async (teacherId: number) => {
    try {
      const [sRes, rRes, aRes] = await Promise.all([
        fetch("/api/teacher/students?teacherId=" + teacherId),
        fetch("/api/teacher/records?teacherId=" + teacherId),
        fetch("/api/teacher/applications?teacherId=" + teacherId),
      ]);
      if (sRes.ok) setStudents(await sRes.json());
      if (rRes.ok) setRecords(await rRes.json());
      if (aRes.ok) setApplications(await aRes.json());
    } catch {}
  };

  const handleAddCredit = async () => {
    if (!creditForm.studentId || !creditForm.reason || !creditForm.points) return;
    try {
      const res = await fetch("/api/teacher/credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...creditForm, teacherId: user?.id, points: parseFloat(creditForm.points) }),
      });
      if (res.ok) {
        setShowModal(false);
        setCreditForm({ studentId: "", category: CATEGORIES[0], reason: "", points: "" });
        if (user) loadData(user.id);
      }
    } catch {}
  };

  const handleReview = async (appId: number, status: string) => {
    try {
      await fetch("/api/teacher/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId, status, reviewerId: user?.id }),
      });
      if (user) loadData(user.id);
    } catch {}
  };

  const logout = () => { localStorage.removeItem("user"); router.push("/"); };

  if (!user) return null;

  return (
    <div className={styles.dashboard}>
      <nav className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>素质学分平台</h2>
          <p>教师工作台</p>
        </div>
        <button className={activeTab === "overview" ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab("overview")}>
          <span className={styles.navIcon}>📊</span> 数据概览
        </button>
        <button className={activeTab === "credit" ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab("credit")}>
          <span className={styles.navIcon}>✏️</span> 学分操作
        </button>
        <button className={activeTab === "review" ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab("review")}>
          <span className={styles.navIcon}>📝</span> 申报审核
        </button>
        <button className={styles.logoutBtn} onClick={logout}>
          <span className={styles.navIcon}>🚪</span> 退出登录
        </button>
      </nav>

      <main className={styles.content}>
        <div className={styles.topBar}>
          <h1>{activeTab === "overview" ? "数据概览" : activeTab === "credit" ? "学分操作" : "申报审核"}</h1>
          <div className={styles.userBadge}>
            <span>{user.name}</span>
            <span className={styles.roleBadge}>教师</span>
          </div>
        </div>

        {activeTab === "overview" && (
          <>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>管理学生数</div>
                <div className={styles.statValue}>{students.length}<span className={styles.statSuffix}>人</span></div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>已操作学分记录</div>
                <div className={styles.statValue}>{records.length}<span className={styles.statSuffix}>条</span></div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>待审核申报</div>
                <div className={styles.statValue}>{applications.filter((a: any) => a.status === "Pending").length}<span className={styles.statSuffix}>条</span></div>
              </div>
            </div>

            {records.length > 0 && (
              <div className={styles.section}>
                <h2 style={{marginBottom:"1rem"}}>最近学分记录</h2>
                <table className={styles.table}>
                  <thead><tr><th>学生</th><th>分类</th><th>事由</th><th>分数</th><th>时间</th></tr></thead>
                  <tbody>
                    {records.slice(0, 10).map((r: any) => (
                      <tr key={r.id}>
                        <td>{r.student_name}</td>
                        <td>{r.category}</td>
                        <td>{r.reason}</td>
                        <td className={r.points > 0 ? styles.pointsPositive : styles.pointsNegative}>{r.points > 0 ? "+" : ""}{r.points}</td>
                        <td>{r.created_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === "credit" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>学分加减操作</h2>
              <button className={styles.addBtn} onClick={() => setShowModal(true)}>+ 新增记录</button>
            </div>
            {records.length > 0 ? (
              <table className={styles.table}>
                <thead><tr><th>学生</th><th>分类</th><th>事由</th><th>分数</th><th>时间</th></tr></thead>
                <tbody>
                  {records.map((r: any) => (
                    <tr key={r.id}>
                      <td>{r.student_name}</td>
                      <td>{r.category}</td>
                      <td>{r.reason}</td>
                      <td className={r.points > 0 ? styles.pointsPositive : styles.pointsNegative}>{r.points > 0 ? "+" : ""}{r.points}</td>
                      <td>{r.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.emptyState}>暂无学分记录，点击"新增记录"开始操作</div>
            )}
          </div>
        )}

        {activeTab === "review" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}><h2>学生申报审核</h2></div>
            {applications.length > 0 ? (
              <table className={styles.table}>
                <thead><tr><th>学生</th><th>分类</th><th>事由</th><th>申请学分</th><th>状态</th><th>操作</th></tr></thead>
                <tbody>
                  {applications.map((a: any) => (
                    <tr key={a.id}>
                      <td>{a.student_name}</td>
                      <td>{a.category}</td>
                      <td>{a.reason}</td>
                      <td>{a.points}</td>
                      <td>
                        <span className={a.status === "Pending" ? styles.statusPending : a.status === "Approved" ? styles.statusApproved : styles.statusRejected}>
                          {a.status === "Pending" ? "待审核" : a.status === "Approved" ? "已通过" : "已驳回"}
                        </span>
                      </td>
                      <td>
                        {a.status === "Pending" && (
                          <>
                            <button className={styles.actionBtn} onClick={() => handleReview(a.id, "Approved")}>✅ 通过</button>
                            <button className={styles.actionBtn} onClick={() => handleReview(a.id, "Rejected")}>❌ 驳回</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.emptyState}>暂无待审核的申报</div>
            )}
          </div>
        )}
      </main>

      {/* 新增学分记录模态框 */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>新增学分记录</h3>
            <div className={styles.modalForm}>
              <div className={styles.modalInputGroup}>
                <label>选择学生</label>
                <select className={styles.modalInput} value={creditForm.studentId} onChange={(e) => setCreditForm({ ...creditForm, studentId: e.target.value })}>
                  <option value="">-- 请选择学生 --</option>
                  {students.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.username})</option>)}
                </select>
              </div>
              <div className={styles.modalInputGroup}>
                <label>分类</label>
                <select className={styles.modalInput} value={creditForm.category} onChange={(e) => setCreditForm({ ...creditForm, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className={styles.modalInputGroup}>
                <label>事由</label>
                <input className={styles.modalInput} placeholder="请输入加/减分事由" value={creditForm.reason} onChange={(e) => setCreditForm({ ...creditForm, reason: e.target.value })} />
              </div>
              <div className={styles.modalInputGroup}>
                <label>分数 (正数加分, 负数减分)</label>
                <input className={styles.modalInput} type="number" step="0.5" placeholder="如 2 或 -1" value={creditForm.points} onChange={(e) => setCreditForm({ ...creditForm, points: e.target.value })} />
              </div>
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>取消</button>
                <button className={styles.submitBtn} onClick={handleAddCredit}>确认提交</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
