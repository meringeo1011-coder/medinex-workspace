import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PatientDashboard from './PatientDashboard';
import DoctorDashboard from './DoctorDashboard';
import HospitalDashboard from './HospitalDashboard'; 
import PharmacistDashboard from './PharmacistDashboard';
import AdminDashboard from './AdminDashboard'; // 1. Import the Admin Dashboard component

function Dashboard() {
  const navigate = useNavigate();
  
  // Grab the user's role and token from local storage
  const role = localStorage.getItem('role');
  const token = localStorage.getItem('token');

  // If they aren't logged in, kick them back to the login page
  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  // The "Traffic Cop" logic: Render the correct component based on role
  if (role === 'Patient') {
    return <PatientDashboard />;
  }
  
  if (role === 'Doctor') {
    return <DoctorDashboard />;
  }

  if (role === 'Pharmacist') {
    return <PharmacistDashboard />;
  }

  if (role === 'Hospital') {
    return <HospitalDashboard />;
  }

  // 2. Added routing logic for the Admin!
  if (role === 'Admin') {
    return <AdminDashboard />;
  }

  // Fallback for any other future roles
  return (
    <div className="container mt-5 text-center">
      <div className="card shadow-sm border-0 p-5 rounded-4 bg-light">
        <h2 className="text-primary fw-bold">Welcome to Medinex</h2>
        <p className="text-muted">You are logged in as a <strong>{role}</strong>.</p>
        <p className="text-muted small">Your dedicated dashboard is currently under construction.</p>
      </div>
    </div>
  );
}

export default Dashboard;