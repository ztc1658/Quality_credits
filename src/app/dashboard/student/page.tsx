"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./student.module.css";

const CATEGORIES = ["学术竞赛", "社团活动", "志愿服务", "文体活动", "其他"];

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [overview, setOverview] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyForm, setApplyForm] = useState({
    category: CATEGORIES[0],
    reason: "",
    points: "",
    proof: null as File | null,
  });
  const [tip, setTip] = useState("");
  const [err, setErr] = useState("");

  const resetTip = () => {
    setTip("");
    setErr("");
  };

  const loadData = async (studentId: number) => {
    const [oRes, rRes, aRes] = await Promise.all([
      fetch(`/api/student/overview?studentId=${studentId}`),
      fetch(`/api/student/records?studentId=${studentId}`),
      fetch(`/api/student/applications?studentId=${studentId}`),
    ]);
    if (oRes.ok) setOverview(await oRes.json());
    if (rRes.ok) setRecords(await rRes.json());
    if (aRes.ok) setApplications(await aRes.json());
  };

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/");
      return;
    }
    const u = JSON.parse(stored);
    if (u.role !== "Student") {
      router.push("/");
      return;
    }
    setUser(u);
    loadData(u.id).catch(() => setErr("数据加载失败"));
  }, [router]);

  const handleSubmitApplication = async () => {
    resetTip();
    if (!user || !applyForm.reason || !applyForm.points) return;
    const points = Number(applyForm.points);
    if (!Number.isFinite(points) || points <= 0) {
      return setErr("申请分值必须大于0");
    }

    const formData = new FormData();
    formData.append("studentId", String(user.id));
    formData.append("category", applyForm.category);
    formData.append("reason", applyForm.reason);
    formData.append("points", String(points));
    if (applyForm.proof) formData.append("proof", applyForm.proof);

    const res = await fetch("/api/student/apply", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) return setErr(data.error || "提交失败");

    setTip("申请已提交，等待老师审批");
    setShowApplyModal(false);
    setApplyForm({ category: CATEGORIES[0], reason: "", points: "", proof: null });
    await loadData(user.id);
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
          <p>学生中心</p>
        </div>
        <button className={activeTab === "overview" ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab("overview")}>📊 我的总览</button>
        <button className={activeTab === "records" ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab("records")}>📋 学分明细</button>
        <button className={activeTab === "apply" ? styles.navItemActive : styles.navItem} onClick={() => setActiveTab("apply")}>📝 加分申请</button>
        <button className={styles.logoutBtn} onClick={logout}>🚪 退出登录</button>
      </nav>

      <main className={styles.content}>
        {tip && <div className={styles.statusApproved} style={{ display: "inline-block", marginBottom: "1rem" }}>{tip}</div>}
        {err && <div className={styles.statusRejected} style={{ display: "inline-block", marginBottom: "1rem" }}>{err}</div>}

        {activeTab === "overview" && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>基础分</div>
              <div className={styles.statValue}>{overview?.base_score ?? 0}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>变动分</div>
              <div className={styles.statValue}>{overview?.ledger_delta ?? 0}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>当前总分</div>
              <div className={styles.statValue}>{overview?.total_score ?? 0}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>待审核申请</div>
              <div className={styles.statValue}>{overview?.pending_applications ?? 0}</div>
            </div>
          </div>
        )}

        {activeTab === "records" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}><h2>学分流水（不可篡改）</h2></div>
            <table className={styles.table}>
              <thead><tr><th>分类</th><th>理由</th><th>分值</th><th>操作老师</th><th>来源</th><th>时间</th></tr></thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>{r.category}</td>
                    <td>{r.reason}</td>
                    <td className={r.points >= 0 ? styles.pointsPositive : styles.pointsNegative}>{r.points > 0 ? `+${r.points}` : r.points}</td>
                    <td>{r.teacher_name}</td>
                    <td>{r.source || "-"}</td>
                    <td>{r.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "apply" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>我的加分申请</h2>
              <button className={styles.addBtn} onClick={() => setShowApplyModal(true)}>+ 发起申请</button>
            </div>
            <table className={styles.table}>
              <thead><tr><th>分类</th><th>理由</th><th>分值</th><th>证明</th><th>状态</th><th>审批备注</th><th>时间</th></tr></thead>
              <tbody>
                {applications.map((a) => (
                  <tr key={a.id}>
                    <td>{a.category}</td>
                    <td>{a.reason}</td>
                    <td>{a.points}</td>
                    <td>{a.proof ? <a href={a.proof} target="_blank" rel="noreferrer">查看</a> : "-"}</td>
                    <td>
                      <span className={a.status === "Pending" ? styles.statusPending : a.status === "Approved" ? styles.statusApproved : styles.statusRejected}>
                        {a.status}
                      </span>
                    </td>
                    <td>{a.review_note || "-"}</td>
                    <td>{a.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showApplyModal && (
        <div className={styles.modalOverlay} onClick={() => setShowApplyModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>提交加分申请</h3>
            <div className={styles.modalForm}>
              <div className={styles.modalInputGroup}>
                <label>分类</label>
                <select className={styles.modalInput} value={applyForm.category} onChange={(e) => setApplyForm((prev) => ({ ...prev, category: e.target.value }))}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className={styles.modalInputGroup}>
                <label>申请理由</label>
                <input className={styles.modalInput} value={applyForm.reason} onChange={(e) => setApplyForm((prev) => ({ ...prev, reason: e.target.value }))} />
              </div>
              <div className={styles.modalInputGroup}>
                <label>申请分值（必须大于0）</label>
                <input className={styles.modalInput} type="number" step="0.5" value={applyForm.points} onChange={(e) => setApplyForm((prev) => ({ ...prev, points: e.target.value }))} />
              </div>
              <div className={styles.modalInputGroup}>
                <label>证明截图（可选）</label>
                <input className={styles.modalInput} type="file" accept=".png,.jpg,.jpeg,.webp,.gif" onChange={(e) => setApplyForm((prev) => ({ ...prev, proof: e.target.files?.[0] ?? null }))} />
              </div>
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={() => setShowApplyModal(false)}>取消</button>
                <button className={styles.submitBtn} onClick={handleSubmitApplication}>提交</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
