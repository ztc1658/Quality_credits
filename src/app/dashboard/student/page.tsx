"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./student.module.css";

interface User {
  id: number; username: string; name: string; role: string;
}

const CATEGORIES = ["学术竞赛", "社团活动", "志愿服务", "文体活动", "其他"];

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [records, setRecords] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [applyForm, setApplyForm] = useState({ category: CATEGORIES[0], reason: "", points: "" });
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/"); return; }
    const u = JSON.parse(stored);
    if (u.role !== "Student") { router.push("/"); return; }
    setUser(u);
    loadData(u.id);
  }, [router]);

  const loadData = async (studentId: number) => {
    try {
      const [rRes, aRes] = await Promise.all([
        fetch("/api/student/records?studentId=" + studentId),
        fetch("/api/student/applications?studentId=" + studentId),
      ]);
      if (rRes.ok) {
        const r = await rRes.json();
        setRecords(r);
        setTotalPoints(r.reduce((sum: number, item: any) => sum + item.points, 0));
      }
      if (aRes.ok) setApplications(await aRes.json());
    } catch {}
  };

  const handleApply = async () => {
    if (!applyForm.reason || !applyForm.points) return;
    try {
      const res = await fetch("/api/student/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...applyForm, studentId: user?.id, points: parseFloat(applyForm.points) }),
      });
      if (res.ok) {
        setShowModal(false);
        setApplyForm({ category: CATEGORIES[0], reason: "", points: "" });
        if (user) loadData(user.id);
      }
    } catch {}
  };

  const logout = () => { localStorage.removeItem("user"); router.push("/"); };

  if (!user) return null;

  // 按分类统计
  const categoryStats = CATEGORIES.map(cat => ({
    name: cat,
    points: records.filter((r: any) => r.category === cat).reduce((s: number, r: any) => s + r.points, 0),
  }));

  return (
    <div className={styles.dashboard}>
      <nav className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>素质学分平台</h2>
          <p>学生个人中心</p>
        </div>
        <button className={activeTab === "overview" ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab("overview")}>
          <span className={styles.navIcon}>📊</span> 我的概览
        </button>
        <button className={activeTab === "records" ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab("records")}>
          <span className={styles.navIcon}>📋</span> 学分明细
        </button>
        <button className={activeTab === "apply" ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab("apply")}>
          <span className={styles.navIcon}>📝</span> 学分申报
        </button>
        <button className={styles.logoutBtn} onClick={logout}>
          <span className={styles.navIcon}>🚪</span> 退出登录
        </button>
      </nav>

      <main className={styles.content}>
        <div className={styles.topBar}>
          <h1>
            {activeTab === "overview" ? "我的概览" : activeTab === "records" ? "学分明细" : "学分申报"}
          </h1>
          <div className={styles.userBadge}>
            <span>{user.name}</span>
            <span className={styles.roleBadge}>学生</span>
          </div>
        </div>

        {activeTab === "overview" && (
          <>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>总学分</div>
                <div className={styles.statValue} style={{ color: totalPoints >= 0 ? "var(--success)" : "var(--danger)" }}>
                  {totalPoints.toFixed(1)}<span className={styles.statSuffix}>分</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>记录总数</div>
                <div className={styles.statValue}>{records.length}<span className={styles.statSuffix}>条</span></div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>待审核申报</div>
                <div className={styles.statValue}>{applications.filter((a: any) => a.status === "Pending").length}<span className={styles.statSuffix}>条</span></div>
              </div>
            </div>

            {/* 分类得分一览 */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}><h2>各维度学分统计</h2></div>
              <div className={styles.statsGrid}>
                {categoryStats.map(cat => (
                  <div className={styles.statCard} key={cat.name}>
                    <div className={styles.statLabel}>{cat.name}</div>
                    <div className={styles.statValue} style={{ fontSize: "2rem", color: cat.points > 0 ? "var(--success)" : cat.points < 0 ? "var(--danger)" : "var(--primary)" }}>
                      {cat.points > 0 ? "+" : ""}{cat.points.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === "records" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}><h2>学分流水记录</h2></div>
            {records.length > 0 ? (
              <table className={styles.table}>
                <thead><tr><th>分类</th><th>事由</th><th>分数</th><th>操作教师</th><th>时间</th></tr></thead>
                <tbody>
                  {records.map((r: any) => (
                    <tr key={r.id}>
                      <td>{r.category}</td>
                      <td>{r.reason}</td>
                      <td className={r.points > 0 ? styles.pointsPositive : styles.pointsNegative}>{r.points > 0 ? "+" : ""}{r.points}</td>
                      <td>{r.teacher_name}</td>
                      <td>{r.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.emptyState}>暂无学分记录</div>
            )}
          </div>
        )}

        {activeTab === "apply" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>我的申报</h2>
              <button className={styles.addBtn} onClick={() => setShowModal(true)}>+ 发起申报</button>
            </div>
            {applications.length > 0 ? (
              <table className={styles.table}>
                <thead><tr><th>分类</th><th>事由</th><th>申请学分</th><th>状态</th><th>提交时间</th></tr></thead>
                <tbody>
                  {applications.map((a: any) => (
                    <tr key={a.id}>
                      <td>{a.category}</td>
                      <td>{a.reason}</td>
                      <td>{a.points}</td>
                      <td>
                        <span className={a.status === "Pending" ? styles.statusPending : a.status === "Approved" ? styles.statusApproved : styles.statusRejected}>
                          {a.status === "Pending" ? "待审核" : a.status === "Approved" ? "已通过" : "已驳回"}
                        </span>
                      </td>
                      <td>{a.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.emptyState}>暂无申报记录，点击"发起申报"提交学分申请</div>
            )}
          </div>
        )}
      </main>

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>发起学分申报</h3>
            <div className={styles.modalForm}>
              <div className={styles.modalInputGroup}>
                <label>分类</label>
                <select className={styles.modalInput} value={applyForm.category} onChange={(e) => setApplyForm({ ...applyForm, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className={styles.modalInputGroup}>
                <label>申报事由</label>
                <input className={styles.modalInput} placeholder="如：获得XX比赛一等奖" value={applyForm.reason} onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })} />
              </div>
              <div className={styles.modalInputGroup}>
                <label>申请学分</label>
                <input className={styles.modalInput} type="number" step="0.5" placeholder="如 2" value={applyForm.points} onChange={(e) => setApplyForm({ ...applyForm, points: e.target.value })} />
              </div>
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>取消</button>
                <button className={styles.submitBtn} onClick={handleApply}>提交申报</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
