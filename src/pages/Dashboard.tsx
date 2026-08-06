import DashboardLogistica from "./DashboardLogistica";
import DashboardArmazem from "./DashboardArmazem";
import DashboardCliente from "./DashboardCliente";
import { useAuth } from "@/contexts/AuthContext";

// Dispatcher: cada perfil tem seu próprio dashboard.
const Dashboard = () => {
  const { userRole } = useAuth();

  if (userRole === "admin" || userRole === "logistica") {
    return <DashboardLogistica />;
  }

  if (userRole === "armazem") {
    return <DashboardArmazem />;
  }

  if (userRole === "cliente" || userRole === "representante") {
    return <DashboardCliente />;
  }

  return null;
};

export default Dashboard;
