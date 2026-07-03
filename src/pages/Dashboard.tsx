import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLogistica from "./DashboardLogistica";
import DashboardArmazem from "./DashboardArmazem";

// Dispatcher: cada perfil tem seu próprio dashboard.
// Cliente e representante ainda não têm dashboard dedicado — enquanto isso,
// são redirecionados para sua rota padrão atual.
const Dashboard = () => {
  const { userRole, getDefaultRouteForRole } = useAuth();

  if (userRole === "admin" || userRole === "logistica") {
    return <DashboardLogistica />;
  }

  if (userRole === "armazem") {
    return <DashboardArmazem />;
  }

  return <Navigate to={getDefaultRouteForRole(userRole)} replace />;
};

export default Dashboard;
