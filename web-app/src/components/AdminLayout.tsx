import { useEffect, useState, useRef } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { LuMenu } from "react-icons/lu";
import Sidebar from "./Sidebar";
import { supabase } from "../utils/supabase";
import { getAdminReports } from "../utils/reports";
import { ILOCOS_SUR_MUNICIPALITIES } from "../utils/municipalities";
import { accountNotificationPath, reportNotificationPath } from "../utils/notificationTargets";

export interface Report {
  id: number;
  user_id: string | null;
  accident_type: string;
  emergency_type?: string;
  description?: string | null;
  accident_level?: string;
  backup_requested_at?: string | null;
  backup_note?: string | null;
  latitude: number | null;
  longitude: number | null;
  municipality?: string | null;
  province?: string | null;
  status: string;
  created_at: string;
  image_path?: string | null;
  reporter_name: string;
  contact_number?: string | null;
  email?: string | null;
  assigned_responder_id?: string | null;
}

export default function AdminLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [reports, setReports] = useState<Report[]>([]);
  const lastReportIdRef = useRef<number | null>(null);
  const backupAlertedRef = useRef<Set<number> | null>(null);


  useEffect(() => {
    let active = true;
    let sessionVersion = 0;
    const syncSession = async (
      user: { id: string; email?: string } | null,
    ) => {
      const version = ++sessionVersion;
      if (!user) {
        setIsAuthenticated(false);
        setUserRole(null);
        setIsAuthReady(true);
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, role, status")
        .eq("id", user.id)
        .maybeSingle();
      if (!active || version !== sessionVersion) return;
      if (error) {
        console.error("Could not verify the administrator profile:", error);
        setIsAuthenticated(false);
        setIsAuthReady(true);
        return;
      }

      const role = profile?.role?.toLowerCase().trim();
      if (
        !profile ||
        profile.status?.toLowerCase() !== "active" ||
        (role !== "admin" && role !== "superadmin")
      ) {
        const { error: signOutError } = await supabase.auth.signOut({
          scope: "local",
        });
        if (signOutError) {
          console.error("Could not clear an unauthorized session:", signOutError);
        }
        setIsAuthenticated(false);
        setUserRole(null);
        setIsAuthReady(true);
        return;
      }

      const { data: assurance, error: assuranceError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!active || version !== sessionVersion) return;
      if (assuranceError) {
        console.error("Could not verify the administrator MFA session:", assuranceError);
        setIsAuthenticated(false);
        setIsAuthReady(true);
        return;
      }
      if (assurance.currentLevel !== "aal2") {
        setIsAuthenticated(false);
        setUserRole(null);
        setIsAuthReady(true);
        return;
      }

      setIsAuthenticated(true);
      setUserRole(role);
      localStorage.setItem("userId", profile.id);
      localStorage.setItem("userRole", role);
      if (user.email) localStorage.setItem("userEmail", user.email);
      setIsAuthReady(true);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        if (active) void syncSession(session?.user ?? null);
      }, 0);
    });

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        if (active) void syncSession(data.session?.user ?? null);
      })
      .catch((error: unknown) => {
        console.error("Could not restore the Supabase dashboard session:", error);
        if (active) setIsAuthReady(true);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let stopped = false;
    let inFlight = false;
    let timeout: number | null = null;
    const isDocumentVisible = () => document.visibilityState === "visible";

    const fetchReports = async () => {
      try {
        const fetchedReports = (await getAdminReports()).map((report) => ({
          id: report.id,
          user_id: report.user_id,
          accident_type: report.emergency_type || "Incident",
          emergency_type: report.emergency_type || "Incident",
          description: report.description,
          accident_level: report.accident_level || "",
          reporter_name: report.reporter_name || "Anonymous",
          latitude: report.latitude,
          longitude: report.longitude,
          municipality: report.municipality,
          province: report.province,
          status: report.status,
          created_at: report.created_at,
          image_path: report.image_path,
          contact_number: report.contact_number,
          assigned_responder_id: report.assigned_responder_id,
          backup_requested_at: report.backup_requested_at,
          backup_note: report.backup_note,
        }));
        const backupIds = new Set(
          fetchedReports
            .filter((report) => report.backup_requested_at)
            .map((report) => report.id),
        );
        if (backupAlertedRef.current) {
          for (const report of fetchedReports) {
            if (
              backupIds.has(report.id) &&
              !backupAlertedRef.current.has(report.id)
            ) {
              toast.error(
                (notification) => (
                  <button type="button" className="text-left" onClick={() => {
                    toast.dismiss(notification.id);
                    navigate(reportNotificationPath(report.id));
                  }}>
                    BACKUP REQUESTED: {report.accident_type} (#{report.id}) needs more responders. View report
                  </button>
                ),
                { duration: 10000 },
              );
              if (
                localStorage.getItem("pushNotifications") === "true" &&
                typeof Notification !== "undefined" &&
                Notification.permission === "granted"
              ) {
                try {
                  const notification = new Notification("Backup requested", {
                    body: `${report.accident_type} (#${report.id}) needs more responders.${
                      report.backup_note ? ` ${report.backup_note}` : ""
                    }`,
                    icon: "/favicon.ico",
                    tag: `backup-${report.id}`,
                  });
                  notification.onclick = () => {
                    window.focus();
                    navigate(reportNotificationPath(report.id));
                    notification.close();
                  };
                } catch (error) {
                  console.error("Error displaying browser notification:", error);
                }
              }
              if (localStorage.getItem("soundAlerts") === "true") {
                new Audio("/alert.mp3").play().catch((error) => {
                  console.error("Error playing audio:", error);
                });
              }
            }
          }
        }
        backupAlertedRef.current = backupIds;
        {
          const latestReport = fetchedReports[0];
          const latestId = latestReport ? Number(latestReport.id) : null;

          if (
            latestReport &&
            latestId !== null &&
            lastReportIdRef.current !== null &&
            latestId > lastReportIdRef.current
          ) {
            toast.error(
              (notification) => (
                <button type="button" className="text-left" onClick={() => {
                  toast.dismiss(notification.id);
                  navigate(reportNotificationPath(latestReport.id));
                }}>
                  NEW EMERGENCY: {latestReport.accident_type} reported by {latestReport.reporter_name}! View report
                </button>
              ),
              {
                duration: 8000,
                style: { minWidth: '350px', fontWeight: 'bold', fontSize: '16px' },
              }
            );

          if (
            localStorage.getItem("pushNotifications") === "true" &&
            typeof Notification !== "undefined" &&
            Notification.permission === "granted"
          ) {
            try {
              const notification = new Notification("New emergency report", {
                body: `${latestReport.accident_type} reported by ${latestReport.reporter_name}.`,
                icon: "/favicon.ico",
                tag: `report-${latestReport.id}`,
              });
              notification.onclick = () => {
                window.focus();
                navigate(reportNotificationPath(latestReport.id));
                notification.close();
              };
            } catch (error) {
              console.error("Error displaying browser notification:", error);
            }
          }

          const soundEnabled = localStorage.getItem("soundAlerts") === "true";

          if (soundEnabled) {
            const alertAudio = new Audio("/alert.mp3");
            alertAudio.play().catch((error) => {
              console.error("Error playing audio:", error);
            });
          }
          }

          setReports(fetchedReports);
          if (latestId !== null) lastReportIdRef.current = latestId;
        }
      } catch (err) {
        console.error("Global Fetch Error:", err);
      }
    };

    const pollReports = async () => {
      if (stopped || inFlight || !isDocumentVisible()) return;

      inFlight = true;
      try {
        await fetchReports();
      } finally {
        inFlight = false;
        if (!stopped && isDocumentVisible()) {
          timeout = window.setTimeout(() => {
            timeout = null;
            void pollReports();
          }, 5000);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (!isDocumentVisible()) {
        if (timeout !== null) window.clearTimeout(timeout);
        timeout = null;
      } else {
        void pollReports();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    void pollReports();

    return () => {
      stopped = true;
      if (timeout !== null) window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated || userRole !== "superadmin") return;
    const handlePushMessage = (event: MessageEvent) => {
      if (event.data?.type !== "account_approval_requested") return;
      const target = accountNotificationPath(
        typeof event.data.accountId === "string" ? event.data.accountId : "",
      );
      toast((notification) => (
        <button type="button" className="text-left" onClick={() => {
          toast.dismiss(notification.id);
          navigate(target);
        }}>
          Account approval needed. Review application
        </button>
      ), { duration: 10000 });
    };
    navigator.serviceWorker?.addEventListener("message", handlePushMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", handlePushMessage);
  }, [isAuthenticated, userRole, navigate]);

  if (!isAuthReady) return null;
  if (!isAuthenticated) {
    return <Navigate to="/admin" replace state={{ from: location.pathname + location.search }} />;
  }


  if (userRole === "superadmin") {
    const adminOnlyPaths = ["/dashboard", "/personnel"];
    if (adminOnlyPaths.includes(location.pathname.toLowerCase())) {
      return <Navigate to="/superadmin" replace />;
    }
  }


  if (userRole === "admin") {
    if (location.pathname.toLowerCase() === "/superadmin") {
      return <Navigate to="/dashboard" replace />;
    }
  }
  


  return (
    <div className="admin-layout">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <main className="admin-main">
        <div className="mobile-topbar">
          <button
            type="button"
            className="mobile-menu-button"
            aria-label="Open navigation menu"
            aria-expanded={mobileSidebarOpen}
            aria-controls="primary-navigation"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <LuMenu size={21} />
          </button>
          <span>BantayBayan</span>
        </div>
        <div key={location.pathname} className="route-tab-enter">
          <Outlet
            context={{
              setReports,
              reports,
              municipalities: ILOCOS_SUR_MUNICIPALITIES,
            }}
          />
        </div>
      </main>
    </div>
  );
}