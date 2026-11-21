import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  FileImage,
  Film,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  type StorageReference,
} from "firebase/storage";
import { auth, db, firebaseReady, firebaseStorageEnabled, storage } from "./firebase";
import { useAuth } from "./auth";
import { StorageUnavailableError, uploadStudentMedia } from "./storage";
import type { StudentProfile, StudentStatus, UploadedMedia } from "./types";
import { EmptyState, Loading, Notice, Toast } from "./ui";

const imageTypes = ["image/jpeg", "image/png", "image/webp"];
const videoTypes = ["video/mp4", "video/quicktime", "video/webm"];
const maxImageBytes = 10 * 1024 * 1024;
const maxVideoBytes = 50 * 1024 * 1024;

function ConfigScreen() {
  return (
    <main className="config-screen">
      <div className="brand-mark"><GraduationCap size={24} /></div>
      <span className="eyebrow">One setup step</span>
      <h1>Connect your Firebase project</h1>
      <p>Add the Firebase web app values to a local <code>.env</code> file. The portal stays read-only until configuration is complete.</p>
      <pre>{`VITE_FIREBASE_API_KEY=...\nVITE_FIREBASE_AUTH_DOMAIN=...\nVITE_FIREBASE_PROJECT_ID=...\nVITE_FIREBASE_MESSAGING_SENDER_ID=...\nVITE_FIREBASE_APP_ID=...\n# Optional until Firebase Storage is activated\nVITE_FIREBASE_STORAGE_BUCKET=...\nVITE_FIREBASE_STORAGE_ENABLED=false`}</pre>
    </main>
  );
}

function App() {
  if (!firebaseReady) return <><ConfigScreen /><SiteCredit /></>;

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage mode="student" />} />
        <Route path="/admin/login" element={<LoginPage mode="admin" />} />
        <Route path="/student" element={<StudentGate><StudentDashboard /></StudentGate>} />
        <Route path="/admin" element={<AdminGate><AdminDashboard /></AdminGate>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <SiteCredit />
    </>
  );
}

function SiteCredit() {
  return (
    <aside className="site-credit" aria-label="Website development credit">
      <span>Developed &amp; Maintained by</span>
      <strong>TechGajana Pvt. Ltd.</strong>
    </aside>
  );
}

function PortalFrame({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <main className="auth-layout">
      <section className="auth-panel">
        <div className="auth-brand"><Brand /></div>
        <div className="auth-content">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          {children}
        </div>
        <div className="auth-footer">© {new Date().getFullYear()} AISF Student Portal</div>
      </section>
      <aside className="auth-aside">
        <div className="aside-glow" />
        <div className="aside-content">
          <span className="aside-label"><ShieldCheck size={16} /> A better campus experience</span>
          <h2>Everything you need to move forward.</h2>
          <p>One secure place for student registration, approvals, and the work you share with your school.</p>
          <div className="aside-points">
            <div><CheckCircle2 size={18} /><span>Private, student-only media uploads</span></div>
            <div><CheckCircle2 size={18} /><span>Clear registration and approval status</span></div>
            <div><CheckCircle2 size={18} /><span>Secure access built on Firebase</span></div>
          </div>
        </div>
        <div className="aside-bottom">A focused space for learning and collaboration</div>
      </aside>
    </main>
  );
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark"><Star size={22} fill="currentColor" /></span>
      <span><strong>AISF</strong><small>STUDENT PORTAL</small></span>
    </div>
  );
}

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({
    name: "", email: "", mobile: "", password: "", confirmPassword: "", aadhaarLast4: "", address: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = (key: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((current) => ({ ...current, [key]: event.target.value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (values.password.length < 8) return setError("Use a password with at least 8 characters.");
    if (values.password !== values.confirmPassword) return setError("Your passwords do not match.");
    if (!/^\d{10}$/.test(values.mobile.trim())) return setError("Enter a valid 10-digit mobile number.");
    if (!/^\d{4}$/.test(values.aadhaarLast4)) return setError("Enter only the last 4 digits of your Aadhaar.");
    setSubmitting(true);
    try {
      await register(values);
      setSubmitted(true);
    } catch (reason) {
      logFirebaseFailure("student.registration", reason);
      setError(firebaseError(reason, "Student registration"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalFrame eyebrow="Student registration" title={submitted ? "Application received" : "Create your account"}>
      {submitted ? (
        <div className="success-panel">
          <span className="success-badge"><Check size={22} /></span>
          <h2>Registration submitted successfully.</h2>
          <p>Waiting for admin approval. You can sign in to check your application status.</p>
          <button className="button button-primary button-wide" onClick={() => navigate("/login")}>Go to student login <ArrowRight size={17} /></button>
        </div>
      ) : (
        <>
          <p className="form-intro">Fill in your details to request access to the student portal.</p>
          {error && <Notice>{error}</Notice>}
          <form className="form-stack registration-form" onSubmit={submit}>
            <label>Full name<input required autoComplete="name" value={values.name} onChange={update("name")} placeholder="Your full name" maxLength={100} /></label>
            <label>Email address<input required type="email" autoComplete="email" value={values.email} onChange={update("email")} placeholder="you@school.edu" maxLength={254} /></label>
            <div className="form-grid">
              <label>Mobile number<input required inputMode="numeric" value={values.mobile} onChange={update("mobile")} placeholder="10-digit number" maxLength={10} /></label>
              <label>Aadhaar last 4 digits<input required inputMode="numeric" value={values.aadhaarLast4} onChange={update("aadhaarLast4")} placeholder="••••" maxLength={4} /></label>
            </div>
            <label>Address<textarea required rows={2} value={values.address} onChange={update("address")} placeholder="Street, city, state" maxLength={500} /></label>
            <div className="form-grid">
              <label>Password<input required type="password" autoComplete="new-password" value={values.password} onChange={update("password")} placeholder="At least 8 characters" minLength={8} /></label>
              <label>Confirm password<input required type="password" autoComplete="new-password" value={values.confirmPassword} onChange={update("confirmPassword")} placeholder="Re-enter password" minLength={8} /></label>
            </div>
            <button className="button button-primary button-wide" disabled={submitting}>{submitting ? "Submitting…" : "Submit registration"} {!submitting && <ArrowRight size={17} />}</button>
          </form>
          <p className="form-switch">Already registered? <NavLink to="/login">Sign in</NavLink></p>
        </>
      )}
    </PortalFrame>
  );
}

function LoginPage({ mode }: { mode: "student" | "admin" }) {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      const current = auth?.currentUser;
      const result = await current?.getIdTokenResult(true);
      if (mode === "admin") {
        if (result?.claims.admin !== true) {
          await logout();
          throw new Error("This account does not have administrator access.");
        }
        navigate("/admin", { replace: true });
      } else {
        if (result?.claims.admin === true) {
          navigate("/admin", { replace: true });
          return;
        }
        navigate("/student", { replace: true });
      }
    } catch (reason) {
      logFirebaseFailure(`${mode}.login`, reason);
      setError(firebaseError(reason, `${mode === "admin" ? "Admin" : "Student"} sign-in`));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalFrame eyebrow={mode === "admin" ? "Administrator access" : "Welcome back"} title={mode === "admin" ? "Admin sign in" : "Sign in to your account"}>
      <p className="form-intro">{mode === "admin" ? "Sign in with an administrator account provisioned by your organization." : "Use your registered email and password to continue."}</p>
      {mode === "admin" && <div className="admin-note"><ShieldCheck size={17} /> Admin access is provisioned securely. Public admin signup is disabled.</div>}
      {error && <Notice>{error}</Notice>}
      <form className="form-stack" onSubmit={submit}>
        <label>Email address<input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@school.edu" /></label>
        <label>Password<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /></label>
        <button className="button button-primary button-wide" disabled={submitting}>{submitting ? "Signing in…" : mode === "admin" ? "Sign in as admin" : "Sign in"} {!submitting && <ArrowRight size={17} />}</button>
      </form>
      {mode === "student" ? <p className="form-switch">New to the portal? <NavLink to="/register">Register as a student</NavLink></p> : <p className="form-switch"><NavLink to="/login">Student login</NavLink></p>}
      {mode === "student" && <p className="admin-link">Administrator? <NavLink to="/admin/login">Use admin sign in</NavLink></p>}
    </PortalFrame>
  );
}

function StudentGate({ children }: { children: ReactNode }) {
  const { user, profile, isAdmin, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (!profile) return <AccessMessage title="Profile unavailable" message="We couldn't find a student registration for this account. Contact your administrator for help." />;
  if (profile.status === "pending") return <AccessMessage icon={<Clock3 size={22} />} title="Your account is waiting for admin approval." message="You'll be able to access the student dashboard as soon as your registration is approved." />;
  if (profile.status === "rejected") return <AccessMessage icon={<X size={22} />} title="Your registration has been rejected. Contact admin." message="If you believe this is a mistake, contact your school administrator." />;
  return children;
}

function AdminGate({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!isAdmin) return <AccessMessage title="Administrator access required" message="This account is not authorized to access the admin workspace." />;
  return children;
}

function AccessMessage({ title, message, icon }: { title: string; message: string; icon?: ReactNode }) {
  const { logout } = useAuth();
  return (
    <main className="access-screen">
      <div className="access-card">
        <Brand />
        <span className="status-icon">{icon || <Clock3 size={22} />}</span>
        <h1>{title}</h1><p>{message}</p>
        <button className="button button-secondary" onClick={() => void logout()}><LogOut size={16} /> Sign out</button>
      </div>
    </main>
  );
}

function StudentDashboard() {
  const { profile, logout } = useAuth();
  const [uploads, setUploads] = useState<UploadedMedia[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(true);
  const [loadError, setLoadError] = useState("");

  const reload = async () => {
    if (!db || !profile) return;
    setLoadingUploads(true);
    setLoadError("");
    try {
      const result = await getDocs(query(collection(db, "uploads"), where("uid", "==", profile.uid)));
      setUploads(result.docs.map((item) => ({ ...item.data(), id: item.id }) as UploadedMedia).sort(byDateDesc));
    } catch (error) {
      console.error("Unable to load student uploads", error);
      logFirebaseFailure("student.uploads.list", error);
      setLoadError(firebaseError(error, "Loading your uploads"));
    } finally {
      setLoadingUploads(false);
    }
  };

  useEffect(() => { void reload(); }, [profile?.uid]);
  if (!profile) return null;

  return (
    <div className="student-page">
      <header className="student-header"><Brand /><div className="header-user"><span className="user-avatar">{initials(profile.name)}</span><span className="user-name">{profile.name}<small>Student account</small></span><button className="icon-button" aria-label="Sign out" onClick={() => void logout()}><LogOut size={18} /></button></div></header>
      <main className="student-main">
        <div className="welcome-row"><div><span className="eyebrow">Student workspace</span><h1>Welcome back, {profile.name.split(" ")[0]} <span className="wave">✦</span></h1><p>Your personal space to share and manage your work.</p></div><span className="status-pill status-approved"><CheckCircle2 size={15} /> Approved account</span></div>
        <section className="upload-card">
          <div className="upload-card-copy"><span className="eyebrow">Share your work</span><h2>Upload anything you’re working on.</h2><p>Keep your images and videos together in one private, organized place.</p><div className="file-hints"><span><FileImage size={15} /> JPG, PNG, WEBP · up to 10 MB</span><span><Film size={15} /> MP4, MOV, WEBM · up to 50 MB</span></div></div>
          <UploadBox profile={profile} onUploaded={reload} />
        </section>
        <section className="section-block"><div className="section-heading"><div><span className="eyebrow">Your library</span><h2>My uploaded files <span className="count-chip">{uploads.length}</span></h2></div><button className="button button-quiet" onClick={() => void reload()}><Activity size={16} /> Refresh</button></div>
          {loadError && <Notice>{loadError}</Notice>}
          {loadingUploads ? <Loading label="Loading your files" /> : uploads.length ? <MediaGrid items={uploads} /> : <EmptyState title="Your library is ready"><span>Your successful uploads will appear here.</span></EmptyState>}
        </section>
      </main>
      <footer className="page-footer">Your uploads are private to you and authorized administrators.</footer>
    </div>
  );
}

function UploadBox({ profile, onUploaded }: { profile: StudentProfile; onUploaded: () => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [storageNotice, setStorageNotice] = useState(false);

  useEffect(() => {
    if (!storageNotice) return;
    const timer = window.setTimeout(() => setStorageNotice(false), 3800);
    return () => window.clearTimeout(timer);
  }, [storageNotice]);

  const upload = async (file?: File) => {
    setError("");
    setSuccess("");
    if (!firebaseStorageEnabled || !storage) {
      setStorageNotice(true);
      return;
    }
    if (!file || !db) return;
    const typeAllowed = [...imageTypes, ...videoTypes].includes(file.type);
    const isImage = imageTypes.includes(file.type);
    const limit = isImage ? maxImageBytes : maxVideoBytes;
    if (!typeAllowed) return setError("Choose a JPG, PNG, WEBP, MP4, MOV, or WEBM file.");
    if (file.size > limit) return setError(`This file is too large. ${isImage ? "Images" : "Videos"} must be ${isImage ? "10" : "50"} MB or smaller.`);
    if (file.size === 0) return setError("This file is empty and cannot be uploaded.");

    setBusy(true);
    setProgress(0);
    let completedUpload: StorageReference | null = null;
    let operation = "Uploading file to Firebase Storage";
    try {
      const safeName = file.name.replace(/[^\w.-]/g, "_").slice(0, 120);
      const storagePath = `studentUploads/${profile.uid}/${crypto.randomUUID()}_${safeName}`;
      const task = uploadStudentMedia(storagePath, file);
      const snapshot = await new Promise<import("firebase/storage").UploadTaskSnapshot>((resolve, reject) => {
        task.on("state_changed", (state) => {
          setProgress(Math.round((state.bytesTransferred / state.totalBytes) * 100));
        }, reject, () => resolve(task.snapshot));
      });
      completedUpload = snapshot.ref;
      operation = "Getting the uploaded file URL";
      const downloadUrl = await getDownloadURL(snapshot.ref);
      const metadataRef = doc(collection(db, "uploads"));
      operation = "Creating the upload metadata in Firestore";
      await setDoc(metadataRef, {
        uid: profile.uid,
        studentName: profile.name,
        fileName: file.name,
        fileType: file.type,
        downloadUrl,
        storagePath,
        uploadedAt: serverTimestamp(),
      });
      completedUpload = null;
      setSuccess(`${file.name} uploaded successfully.`);
      await onUploaded();
    } catch (reason) {
      if (reason instanceof StorageUnavailableError) {
        setStorageNotice(true);
        return;
      }
      logFirebaseFailure("student.upload", reason, { operation });
      if (completedUpload) {
        try {
          await deleteObject(completedUpload);
        } catch (cleanupError) {
          logFirebaseFailure("student.upload.cleanup", cleanupError);
          setError(`${firebaseError(reason, operation)} The uploaded file could not be cleaned up; contact an administrator.`);
          return;
        }
      }
      setError(firebaseError(reason, operation));
    } finally {
      setBusy(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="upload-widget">
      <button className={`drop-zone ${busy ? "drop-zone-busy" : ""}`} onClick={() => { if (!busy) void uploadControl(); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (!busy) void upload(event.dataTransfer.files[0]); }} disabled={busy}>
        <span className="upload-icon"><UploadCloud size={24} /></span>
        <strong>{busy ? "Uploading your file…" : "Drop a file here or browse"}</strong>
        <span>Images and videos supported</span>
        {!busy && <span className="browse-link">Browse files <ArrowRight size={14} /></span>}
        {busy && <span className="progress-track"><i style={{ width: `${progress ?? 0}%` }} /></span>}
        {busy && <small>{progress ?? 0}% uploaded</small>}
      </button>
      <input ref={inputRef} className="visually-hidden" type="file" accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.webm,image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" onChange={(event) => void upload(event.target.files?.[0])} />
      {error && <Notice>{error}</Notice>}
      {success && <Notice kind="success">{success}</Notice>}
      {storageNotice && <Toast title="Storage Not Available" kind="error">Storage is not available yet. Image and video uploads will be enabled once Firebase Storage is activated. Please try again later.</Toast>}
    </div>
  );

  async function uploadControl() {
    if (!firebaseStorageEnabled || !storage) {
      setStorageNotice(true);
      return;
    }
    inputRef.current?.click();
  }
}

function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, isAdmin } = useAuth();
  const [section, setSection] = useState(location.hash === "#media" ? "media" : "students");
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [uploads, setUploads] = useState<UploadedMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<StudentProfile | null>(null);
  const [queryText, setQueryText] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [workingUid, setWorkingUid] = useState("");
  const [workingUpload, setWorkingUpload] = useState("");
  const [toast, setToast] = useState("");

  const reload = async () => {
    if (!db) return;
    setLoading(true);
    setError("");
    try {
      const [studentResult, uploadResult] = await Promise.allSettled([
        getDocs(collection(db, "students")),
        getDocs(collection(db, "uploads")),
      ]);
      const failures: string[] = [];
      if (studentResult.status === "fulfilled") {
        setStudents(studentResult.value.docs.map((item) => item.data() as StudentProfile).sort(byDateDesc));
      } else {
        logFirebaseFailure("admin.students.list", studentResult.reason, { adminClaimPresent: isAdmin });
        failures.push(firebaseError(studentResult.reason, "Loading student records"));
      }
      if (uploadResult.status === "fulfilled") {
        setUploads(uploadResult.value.docs.map((item) => ({ ...item.data(), id: item.id }) as UploadedMedia).sort(byDateDesc));
      } else {
        logFirebaseFailure("admin.uploads.list", uploadResult.reason, { adminClaimPresent: isAdmin });
        failures.push(firebaseError(uploadResult.reason, "Loading uploaded media"));
      }
      if (failures.length) setError(failures.join(" "));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const stats = useMemo(() => ({
    total: students.length,
    pending: students.filter((student) => student.status === "pending").length,
    approved: students.filter((student) => student.status === "approved").length,
    rejected: students.filter((student) => student.status === "rejected").length,
  }), [students]);
  const filteredStudents = students
    .filter((student) => [student.name, student.email, student.mobile].some((value) => value.toLowerCase().includes(queryText.toLowerCase())))
    .sort((first, second) => Number(second.status === "pending") - Number(first.status === "pending"));

  const setStatus = async (student: StudentProfile, status: StudentStatus) => {
    if (!db) return;
    setWorkingUid(student.uid);
    setError("");
    try {
      await updateDoc(doc(db, "students", student.uid), { status });
      setStudents((current) => current.map((item) => item.uid === student.uid ? { ...item, status } : item));
      setSelected((current) => current?.uid === student.uid ? { ...current, status } : current);
      setToast(`${student.name} marked ${status}.`);
    } catch (reason) {
      logFirebaseFailure("admin.student.status.update", reason, { adminClaimPresent: isAdmin });
      setError(firebaseError(reason, "Updating student approval status"));
    } finally {
      setWorkingUid("");
    }
  };

  const removeUpload = async (item: UploadedMedia) => {
    if (!db || !storage || !window.confirm(`Permanently delete "${item.fileName}"?`)) return;
    setWorkingUpload(item.id);
    setError("");
    let operation = "Deleting the file from Firebase Storage";
    try {
      await deleteObject(ref(storage, item.storagePath));
      operation = "Deleting upload metadata from Firestore";
      await deleteDoc(doc(db, "uploads", item.id));
      setUploads((current) => current.filter((upload) => upload.id !== item.id));
      setToast("Upload deleted.");
    } catch (reason) {
      logFirebaseFailure("admin.upload.delete", reason, { operation, adminClaimPresent: isAdmin });
      setError(firebaseError(reason, operation));
    } finally {
      setWorkingUpload("");
    }
  };

  const switchSection = (next: string) => {
    setSection(next);
    navigate(next === "media" ? "/admin#media" : "/admin", { replace: true });
    setMobileMenu(false);
  };

  return (
    <div className="admin-layout">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <Brand />
        <div className="sidebar-label">WORKSPACE</div>
        <button className={`side-link ${section === "students" ? "side-active" : ""}`} onClick={() => switchSection("students")}><LayoutDashboard size={18} /> Dashboard</button>
        <button className={`side-link ${section === "media" ? "side-active" : ""}`} onClick={() => switchSection("media")}><FileImage size={18} /> Uploaded media <span className="side-count">{uploads.length}</span></button>
        <div className="sidebar-bottom"><div className="admin-user"><span className="user-avatar admin-avatar"><ShieldCheck size={16} /></span><span>Administrator<small>Secure workspace</small></span></div><button className="side-link side-signout" onClick={() => void logout()}><LogOut size={17} /> Sign out</button></div>
      </aside>
      {mobileMenu && <button className="sidebar-scrim" aria-label="Close menu" onClick={() => setMobileMenu(false)} />}
      <main className="admin-main">
        <header className="admin-topbar"><button className="mobile-menu-button icon-button" aria-label="Open menu" onClick={() => setMobileMenu(true)}><Menu size={20} /></button><div className="breadcrumbs">AISF <span>/</span> {section === "media" ? "Uploaded media" : "Dashboard"}</div><div className="topbar-actions"><span className="live-indicator"><i /> Live workspace</span><button className="icon-button" aria-label="Refresh dashboard" onClick={() => void reload()}><Activity size={18} /></button></div></header>
        <div className="admin-content">
          <div className="admin-title-row"><div><span className="eyebrow">OVERVIEW</span><h1>{section === "media" ? "Uploaded media" : "Student dashboard"}</h1><p>{section === "media" ? "Review and manage media shared by students." : "Manage registrations, approvals, and student uploads."}</p></div><div className="date-chip">{new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div></div>
          {error && <Notice>{error}</Notice>}
          {section === "students" && <>
            <div className="stats-grid">
              <StatCard label="Total students" value={stats.total} icon={<Users size={19} />} tone="blue" />
              <StatCard label="Pending review" value={stats.pending} icon={<Clock3 size={19} />} tone="amber" hint="Needs your attention" />
              <StatCard label="Approved" value={stats.approved} icon={<CheckCircle2 size={19} />} tone="green" />
              <StatCard label="Rejected" value={stats.rejected} icon={<X size={19} />} tone="rose" />
              <StatCard label="Uploaded files" value={uploads.length} icon={<FileImage size={19} />} tone="violet" />
            </div>
            <section className="admin-panel">
              <div className="panel-heading"><div><h2>Student management</h2><p>Review and manage all student registrations.</p></div><div className="table-tools"><span className="table-count">{stats.pending} pending</span><label className="search-field"><Search size={16} /><input value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder="Search students" /></label></div></div>
              {loading ? <Loading label="Loading student records" /> : filteredStudents.length ? <StudentTable students={filteredStudents} workingUid={workingUid} onView={setSelected} onStatus={setStatus} /> : <EmptyState title={queryText ? "No students found" : "No registrations yet"}>{queryText ? "Try a different search." : "Student registrations will appear here."}</EmptyState>}
            </section>
            {!loading && stats.pending > 0 && <section className="pending-callout"><span className="pending-icon"><Clock3 size={19} /></span><div><strong>{stats.pending} student{stats.pending === 1 ? "" : "s"} waiting for review</strong><p>Pending registrations are at the top of the list.</p></div><ArrowDownToLine size={17} /></section>}
          </>}
          {section === "media" && <section className="admin-panel media-panel"><div className="panel-heading"><div><h2>Student uploads</h2><p>All media submitted by approved students.</p></div><span className="table-count">{uploads.length} files</span></div>{loading ? <Loading label="Loading uploaded media" /> : uploads.length ? <MediaGrid items={uploads} admin onDelete={removeUpload} workingUpload={workingUpload} /> : <EmptyState title="No media uploaded yet">Student files will show up here once shared.</EmptyState>}</section>}
          <div className="admin-footer">AISF Student Portal <span>·</span> Admin workspace</div>
        </div>
      </main>
      {selected && <StudentModal student={selected} working={workingUid === selected.uid} onClose={() => setSelected(null)} onStatus={setStatus} />}
      {toast && <Toast>{toast}</Toast>}
    </div>
  );
}

function StatCard({ label, value, icon, tone, hint }: { label: string; value: number; icon: ReactNode; tone: string; hint?: string }) {
  return <div className="stat-card"><span className={`stat-icon stat-${tone}`}>{icon}</span><span className="stat-label">{label}</span><strong>{value}</strong><span className="stat-hint">{hint || "Current total"}</span></div>;
}

function StudentTable({ students, workingUid, onView, onStatus }: { students: StudentProfile[]; workingUid: string; onView: (student: StudentProfile) => void; onStatus: (student: StudentProfile, status: StudentStatus) => Promise<void> }) {
  return (
    <div className="table-scroll"><table className="student-table"><thead><tr><th>Student</th><th>Mobile</th><th>Registered</th><th>Status</th><th className="actions-heading">Actions</th></tr></thead><tbody>
      {students.map((student) => <tr key={student.uid} className={student.status === "pending" ? "pending-row" : ""}>
        <td><div className="student-cell"><span className={`user-avatar table-avatar avatar-${colorFor(student.name)}`}>{initials(student.name)}</span><span><strong>{student.name}</strong><small>{student.email}</small></span></div></td>
        <td className="muted-cell">{student.mobile}</td><td className="muted-cell">{formatDate(student.createdAt)}</td>
        <td><StatusBadge status={student.status} /></td>
        <td><div className="row-actions"><button className="text-button" onClick={() => onView(student)}>View</button>{student.status === "pending" ? <><button className="mini-action mini-approve" disabled={workingUid === student.uid} title="Approve student" aria-label={`Approve ${student.name}`} onClick={() => void onStatus(student, "approved")}><Check size={16} /></button><button className="mini-action mini-reject" disabled={workingUid === student.uid} title="Reject student" aria-label={`Reject ${student.name}`} onClick={() => void onStatus(student, "rejected")}><X size={16} /></button></> : student.status === "approved" ? <button className="mini-action mini-reject" disabled={workingUid === student.uid} title="Reject student" aria-label={`Reject ${student.name}`} onClick={() => void onStatus(student, "rejected")}><X size={16} /></button> : <button className="mini-action mini-approve" disabled={workingUid === student.uid} title="Approve student" aria-label={`Approve ${student.name}`} onClick={() => void onStatus(student, "approved")}><Check size={16} /></button>}</div></td>
      </tr>)}
    </tbody></table></div>
  );
}

function StatusBadge({ status }: { status: StudentStatus }) {
  const Icon = status === "approved" ? CheckCircle2 : status === "rejected" ? X : Clock3;
  return <span className={`status-pill status-${status}`}><Icon size={14} />{status[0].toUpperCase() + status.slice(1)}</span>;
}

function StudentModal({ student, working, onClose, onStatus }: { student: StudentProfile; working: boolean; onClose: () => void; onStatus: (student: StudentProfile, status: StudentStatus) => Promise<void> }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="student-modal" role="dialog" aria-modal="true" aria-labelledby="student-details-title"><div className="modal-top"><span className="eyebrow">STUDENT PROFILE</span><button className="icon-button" aria-label="Close details" onClick={onClose}><X size={19} /></button></div><div className="modal-person"><span className={`user-avatar modal-avatar avatar-${colorFor(student.name)}`}>{initials(student.name)}</span><div><h2 id="student-details-title">{student.name}</h2><span>{student.email}</span></div></div><StatusBadge status={student.status} /><div className="detail-list"><Detail label="Mobile number" value={student.mobile} /><Detail label="Registered on" value={formatDate(student.createdAt)} /><Detail label="Aadhaar (last 4)" value={`•••• ${student.aadhaarLast4}`} /><Detail label="Address" value={student.address} /></div>{student.status !== "approved" && <button className="button button-primary button-wide" disabled={working} onClick={() => void onStatus(student, "approved")}><Check size={17} /> Approve student</button>}{student.status === "approved" && <button className="button button-danger button-wide" disabled={working} onClick={() => void onStatus(student, "rejected")}><X size={17} /> Reject student</button>}</section></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="detail-item"><span>{label}</span><strong>{value || "—"}</strong></div>;
}

function MediaGrid({ items, admin = false, onDelete, workingUpload }: { items: UploadedMedia[]; admin?: boolean; onDelete?: (item: UploadedMedia) => Promise<void>; workingUpload?: string }) {
  return <div className="media-grid">{items.map((item) => <article className="media-card" key={item.id}><div className="media-preview">{imageTypes.includes(item.fileType) ? <img src={item.downloadUrl} alt={item.fileName} loading="lazy" /> : <video src={item.downloadUrl} controls preload="metadata" aria-label={item.fileName} />}{admin && <button className="delete-media" disabled={workingUpload === item.id} title="Delete upload" aria-label={`Delete ${item.fileName}`} onClick={() => onDelete && void onDelete(item)}><Trash2 size={16} /></button>}</div><div className="media-info"><div className="media-file-icon">{imageTypes.includes(item.fileType) ? <FileImage size={16} /> : <Film size={16} />}<strong title={item.fileName}>{item.fileName}</strong></div><span>{admin ? `${item.studentName} · ` : ""}{formatDate(item.uploadedAt)}</span></div></article>)}</div>;
}

function NotFound() {
  return <main className="access-screen"><div className="access-card"><Brand /><h1>Page not found</h1><p>The page you requested doesn't exist.</p><NavLink className="button button-primary" to="/login">Back to sign in</NavLink></div></main>;
}

function firebaseError(error: unknown, operation?: string) {
  if (error instanceof Error && error.message === "This account does not have administrator access.") return error.message;
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  const messages: Record<string, string> = {
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/weak-password": "Choose a stronger password with at least 8 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "storage/unauthorized": "You don't have permission to access this file.",
    "storage/canceled": "The upload was canceled.",
  };
  if (code === "permission-denied") {
    const detail = error instanceof Error ? error.message : "Missing or insufficient permissions.";
    return `${operation ? `${operation}: ` : ""}Firebase returned permission-denied. ${detail}`;
  }
  if (messages[code]) return messages[code];
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

function logFirebaseFailure(operation: string, error: unknown, context: Record<string, unknown> = {}) {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "unknown";
  const message = error instanceof Error ? error.message : "Unknown Firebase error";
  console.error("Firebase operation failed", { operation, code, message, ...context });
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "S";
}

function colorFor(name: string) {
  return (name.charCodeAt(0) % 4) + 1;
}

function formatDate(value: StudentProfile["createdAt"] | UploadedMedia["uploadedAt"]) {
  if (!value) return "Just now";
  return value.toDate().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function byDateDesc(first: { createdAt?: StudentProfile["createdAt"]; uploadedAt?: UploadedMedia["uploadedAt"] }, second: { createdAt?: StudentProfile["createdAt"]; uploadedAt?: UploadedMedia["uploadedAt"] }) {
  const firstDate = first.uploadedAt?.toMillis() ?? first.createdAt?.toMillis() ?? 0;
  const secondDate = second.uploadedAt?.toMillis() ?? second.createdAt?.toMillis() ?? 0;
  return secondDate - firstDate;
}

export default App;
