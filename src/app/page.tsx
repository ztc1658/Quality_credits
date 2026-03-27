"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // 登录表单
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // 修改密码弹窗
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else if (!data.user.password_changed) {
        // 首次登录，需要修改密码
        setPendingUser(data.user);
        setShowChangePwd(true);
      } else {
        // 正常登录
        localStorage.setItem("user", JSON.stringify(data.user));
        setSuccess("登录成功！正在跳转...");
        setTimeout(() => {
          const routes: Record<string, string> = { Admin: "/dashboard/admin", Teacher: "/dashboard/teacher", Student: "/dashboard/student" };
          router.push(routes[data.user.role] || "/dashboard");
        }, 600);
      }
    } catch { setError("网络连接失败，请稍后重试"); }
    finally { setLoading(false); }
  };

  const handleChangePassword = async () => {
    setPwdError("");
    if (newPwd.length < 6) { setPwdError("密码长度不能少于6位"); return; }
    if (newPwd !== confirmPwd) { setPwdError("两次输入的密码不一致"); return; }
    if (newPwd === "123456") { setPwdError("新密码不能与初始密码相同"); return; }

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: pendingUser.id, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) { setPwdError(data.error); return; }

      // 密码修改成功，自动登录
      const updatedUser = { ...pendingUser, password_changed: true };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setShowChangePwd(false);
      setSuccess("密码修改成功！正在跳转...");
      setTimeout(() => {
        const routes: Record<string, string> = { Admin: "/dashboard/admin", Teacher: "/dashboard/teacher", Student: "/dashboard/student" };
        router.push(routes[updatedUser.role] || "/dashboard");
      }, 600);
    } catch { setPwdError("网络连接失败"); }
  };

  return (
    <div className={styles.container}>
      <div className={styles.bgBlob1} />
      <div className={styles.bgBlob2} />

      <header className={styles.header}>
        <div className="glass-panel" style={{ padding: "2rem 3rem" }}>
          <h1 className={styles.title}>大学素质学分平台</h1>
          <p className={styles.subtitle}>学生综合能力追踪与量化系统</p>
        </div>
      </header>

      <main className={styles.main}>
        <div className={`glass-panel ${styles.loginCard}`}>
          <h2>系统登录</h2>

          {error && <div className={styles.errorMsg}>{error}</div>}
          {success && <div className={styles.successMsg}>{success}</div>}

          <form className={styles.form} onSubmit={handleLogin}>
            <div className={styles.inputGroup}>
              <label>账号 (学号/教工号)</label>
              <input type="text" placeholder="请输入您的账号" className={styles.input} value={username} onChange={e => { setUsername(e.target.value); setError(""); }} />
            </div>
            <div className={styles.inputGroup}>
              <label>密码</label>
              <input type="password" placeholder="请输入密码" className={styles.input} value={password} onChange={e => { setPassword(e.target.value); setError(""); }} />
            </div>
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? "处理中..." : "登 录"}
            </button>
          </form>

          <div className={styles.defaultAccount}>
            <p>管理员：admin / admin123</p>
            <p>初始密码：123456（首次登录需修改）</p>
          </div>
        </div>
      </main>

      {/* 首次登录强制修改密码弹窗 */}
      {showChangePwd && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>⚠️ 首次登录，请修改初始密码</h3>
            <p style={{ fontSize: "0.85rem", opacity: 0.7, marginBottom: "1rem" }}>
              您好 <strong>{pendingUser?.name}</strong>，为了账号安全，请设置新密码后继续使用。
            </p>
            {pwdError && <div className={styles.errorMsg}>{pwdError}</div>}
            <div className={styles.modalForm}>
              <div className={styles.modalInputGroup}>
                <label>新密码 (至少6位)</label>
                <input type="password" className={styles.modalInput} placeholder="请输入新密码" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
              </div>
              <div className={styles.modalInputGroup}>
                <label>确认新密码</label>
                <input type="password" className={styles.modalInput} placeholder="请再次输入新密码" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
              </div>
              <div className={styles.modalActions}>
                <button className={styles.submitBtn} onClick={handleChangePassword} style={{ width: "100%" }}>确认修改并登录</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
