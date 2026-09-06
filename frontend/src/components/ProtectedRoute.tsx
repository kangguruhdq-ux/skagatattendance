import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types";

export default function ProtectedRoute({
  allow, children,
}: {
  allow: Role[];
  children: React.ReactNode;
}) {
  const { token, role } = useAuth();

  if (!token || !role) {
    return <Navigate to="/login" replace />;
  }
  if (!allow.includes(role)) {
    return <Navigate to={`/${role}`} replace />;
  }
  return <>{children}</>;
}
