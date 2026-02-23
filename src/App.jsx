
import React, { useState, useCallback, useMemo, useEffect } from 'react';

// Centralized Role-Based Access Control (RBAC) Configuration
const ROLES_CONFIG = {
    'Hospital Admin': {
        canView: ['DASHBOARD', 'PATIENTS_LIST', 'APPOINTMENTS_LIST', 'DOCTORS_LIST', 'NURSES_LIST', 'TREATMENTS_LIST', 'MEDICAL_RECORDS_LIST', 'AUDIT_LOGS', 'SETTINGS'],
        canEdit: ['PATIENT', 'APPOINTMENT', 'DOCTOR', 'NURSE', 'TREATMENT', 'MEDICAL_RECORD'],
        canCreate: ['PATIENT', 'APPOINTMENT', 'DOCTOR', 'NURSE', 'TREATMENT', 'MEDICAL_RECORD'],
        canDelete: ['PATIENT', 'APPOINTMENT', 'DOCTOR', 'NURSE', 'TREATMENT', 'MEDICAL_RECORD'],
        canApprove: true,
        canViewLogs: true,
    },
    'Doctor': {
        canView: ['DASHBOARD', 'PATIENTS_LIST', 'APPOINTMENTS_LIST', 'MEDICAL_RECORDS_LIST', 'TREATMENTS_LIST'],
        canEdit: ['PATIENT', 'APPOINTMENT', 'TREATMENT', 'MEDICAL_RECORD'], // Field-level security implied for specific fields
        canCreate: ['TREATMENT', 'MEDICAL_RECORD'],
        canDelete: [],
        canApprove: true, // For treatment plans, etc.
        canViewLogs: false,
    },
    'Nurse': {
        canView: ['DASHBOARD', 'PATIENTS_LIST', 'APPOINTMENTS_LIST', 'MEDICAL_RECORDS_LIST'],
        canEdit: ['PATIENT', 'MEDICAL_RECORD'],
        canCreate: ['MEDICAL_RECORD'],
        canDelete: [],
        canApprove: false,
        canViewLogs: false,
    },
    'Receptionist': {
        canView: ['DASHBOARD', 'PATIENTS_LIST', 'APPOINTMENTS_LIST'],
        canEdit: ['PATIENT', 'APPOINTMENT'],
        canCreate: ['PATIENT', 'APPOINTMENT'],
        canDelete: ['APPOINTMENT'],
        canApprove: false,
        canViewLogs: false,
    },
    'Patient': {
        canView: ['DASHBOARD', 'MY_APPOINTMENTS', 'MY_MEDICAL_RECORDS', 'MY_PROFILE'], // Mapped to list screens but with user-specific data
        canEdit: ['MY_PROFILE'], // Specific profile fields
        canCreate: ['APPOINTMENT_REQUEST'],
        canDelete: [],
        canApprove: false,
        canViewLogs: false,
    },
};

// Standardized Status Keys and UI Labels
const STATUS_MAPS = {
    APPOINTMENT: {
        SCHEDULED: { label: 'Scheduled', className: 'status-scheduled' },
        CONFIRMED: { label: 'Confirmed', className: 'status-confirmed' },
        COMPLETED: { label: 'Completed', className: 'status-completed' },
        CANCELLED: { label: 'Cancelled', className: 'status-cancelled' },
        PENDING_RESCHEDULE: { label: 'Pending Reschedule', className: 'status-pending' },
    },
    PATIENT: {
        ACTIVE: { label: 'Active', className: 'status-active' },
        INACTIVE: { label: 'Inactive', className: 'status-inactive' },
        PENDING_REGISTRATION: { label: 'Pending Registration', className: 'status-pending' },
        DISCHARGED: { label: 'Discharged', className: 'status-discharged' },
    },
    STAFF: { // For Doctors and Nurses
        ACTIVE: { label: 'Active', className: 'status-active' },
        ON_LEAVE: { label: 'On Leave', className: 'status-on_leave' },
        INACTIVE: { label: 'Inactive', className: 'status-inactive' },
    },
    TREATMENT: {
        PENDING: { label: 'Pending Approval', className: 'status-pending' },
        APPROVED: { label: 'Approved', className: 'status-approved' },
        IN_PROGRESS: { label: 'In Progress', className: 'status-in_progress' },
        COMPLETED: { label: 'Completed', className: 'status-completed' },
        REJECTED: { label: 'Rejected', className: 'status-rejected' },
    }
};

// --- Dummy Data ---
const dummyPatients = [
    { id: 'pat1', name: 'Alice Smith', dob: '1985-04-12', contact: '555-0101', status: 'ACTIVE', medicalHistorySummary: 'History of seasonal allergies, recent flu vaccine.', admittedDate: '2022-01-15' },
    { id: 'pat2', name: 'Bob Johnson', dob: '1970-11-23', contact: '555-0102', status: 'INACTIVE', medicalHistorySummary: 'Hypertension, on daily medication.', admittedDate: '2021-03-01' },
    { id: 'pat3', name: 'Charlie Brown', dob: '1992-07-01', contact: '555-0103', status: 'PENDING_REGISTRATION', medicalHistorySummary: 'No significant history, scheduled for initial check-up.', admittedDate: '2023-09-20' },
    { id: 'pat4', name: 'Diana Miller', dob: '1960-02-29', contact: '555-0104', status: 'ACTIVE', medicalHistorySummary: 'Type 2 Diabetes, regular endocrinology visits.', admittedDate: '2020-05-10' },
    { id: 'pat5', name: 'Eve Davis', dob: '2001-09-18', contact: '555-0105', status: 'DISCHARGED', medicalHistorySummary: 'Appendectomy in 2023, fully recovered.', admittedDate: '2023-01-20' },
    { id: 'pat6', name: 'Frank White', dob: '1978-06-05', contact: '555-0106', status: 'ACTIVE', medicalHistorySummary: 'Annual check-up scheduled, no major concerns.', admittedDate: '2023-04-01' },
    { id: 'pat7', name: 'Grace Taylor', dob: '1995-12-30', contact: '555-0107', status: 'ACTIVE', medicalHistorySummary: 'Asthma, uses inhaler as needed.', admittedDate: '2022-08-01' },
];

const dummyDoctors = [
    { id: 'doc1', name: 'Dr. Emily Chen', specialty: 'Cardiology', contact: '555-0201', status: 'ACTIVE', email: 'emily.chen@hospital.com' },
    { id: 'doc2', name: 'Dr. John Adams', specialty: 'Pediatrics', contact: '555-0202', status: 'ACTIVE', email: 'john.adams@hospital.com' },
    { id: 'doc3', name: 'Dr. Sarah Lee', specialty: 'General Practice', contact: '555-0203', status: 'ON_LEAVE', email: 'sarah.lee@hospital.com' },
    { id: 'doc4', name: 'Dr. Michael Green', specialty: 'Orthopedics', contact: '555-0204', status: 'ACTIVE', email: 'michael.green@hospital.com' },
    { id: 'doc5', name: 'Dr. Laura King', specialty: 'Neurology', contact: '555-0205', status: 'INACTIVE', email: 'laura.king@hospital.com' },
];

const dummyNurses = [
    { id: 'nur1', name: 'Nurse Jessica', department: 'ER', contact: '555-0301', status: 'ACTIVE', email: 'jessica.r@hospital.com' },
    { id: 'nur2', name: 'Nurse David', department: 'Pediatrics', contact: '555-0302', status: 'ON_LEAVE', email: 'david.s@hospital.com' },
    { id: 'nur3', name: 'Nurse Maria', department: 'ICU', contact: '555-0303', status: 'ACTIVE', email: 'maria.g@hospital.com' },
];

const dummyAppointments = [
    { id: 'app1', patientId: 'pat1', doctorId: 'doc1', date: '2024-03-25', time: '10:00 AM', status: 'CONFIRMED', type: 'Follow-up', notes: 'Patient to bring latest blood test results.' },
    { id: 'app2', patientId: 'pat2', doctorId: 'doc2', date: '2024-03-26', time: '02:30 PM', status: 'SCHEDULED', type: 'Check-up', notes: 'First visit for new patient. Childhood vaccination record needed.' },
    { id: 'app3', patientId: 'pat3', doctorId: 'doc3', date: '2024-03-27', time: '09:00 AM', status: 'PENDING_RESCHEDULE', type: 'Consultation', notes: 'Doctor on leave, needs reschedule.' },
    { id: 'app4', patientId: 'pat4', doctorId: 'doc1', date: '2024-03-28', time: '11:00 AM', status: 'COMPLETED', type: 'Review', notes: 'Reviewed diabetes management plan. Patient is stable.' },
    { id: 'app5', patientId: 'pat5', doctorId: 'doc4', date: '2024-03-29', time: '01:00 PM', status: 'CANCELLED', type: 'Physiotherapy', notes: 'Patient fully recovered, appointment cancelled by patient.' },
    { id: 'app6', patientId: 'pat1', doctorId: 'doc1', date: '2024-04-01', time: '03:00 PM', status: 'SCHEDULED', type: 'Annual Exam', notes: 'Standard annual physical.' },
    { id: 'app7', patientId: 'pat7', doctorId: 'doc2', date: '2024-04-02', time: '09:30 AM', status: 'CONFIRMED', type: 'Asthma Review', notes: 'Asthma control check and inhaler technique.' },
];

const dummyTreatments = [
    { id: 'trt1', patientId: 'pat4', doctorId: 'doc1', startDate: '2023-01-01', endDate: '2024-12-31', status: 'IN_PROGRESS', type: 'Diabetes Management', description: 'Daily insulin, diet, exercise regimen.' },
    { id: 'trt2', patientId: 'pat1', doctorId: 'doc1', startDate: '2024-03-20', endDate: '2024-03-25', status: 'COMPLETED', type: 'Flu Treatment', description: 'Antivirals, rest, hydration.' },
    { id: 'trt3', patientId: 'pat3', doctorId: 'doc3', startDate: '2024-03-27', endDate: '2024-04-27', status: 'PENDING', type: 'Initial Wellness Plan', description: 'Personalized wellness recommendations based on initial check-up.' },
    { id: 'trt4', patientId: 'pat7', doctorId: 'doc2', startDate: '2023-08-01', endDate: '2025-08-01', status: 'APPROVED', type: 'Asthma Maintenance', description: 'Prescribed daily inhaled corticosteroids and rescue inhaler.' },
];

const dummyMedicalRecords = [
    { id: 'med1', patientId: 'pat1', date: '2024-03-20', type: 'Visit Note', details: 'Patient presented with flu-like symptoms. Prescribed Tamiflu.', recordedBy: 'doc1' },
    { id: 'med2', patientId: 'pat4', date: '2024-03-15', type: 'Lab Results', details: 'A1C: 7.2%, Glucose: 140 mg/dL. Results stable.', recordedBy: 'nur1' },
    { id: 'med3', patientId: 'pat2', date: '2023-10-01', type: 'Consultation', details: 'Referred to a cardiologist for blood pressure management.', recordedBy: 'doc2' },
    { id: 'med4', patientId: 'pat7', date: '2024-02-01', type: 'Vitals', details: 'BP: 120/80, HR: 72, Temp: 98.6F, Oxygen Sat: 99%.', recordedBy: 'nur3' },
    { id: 'med5', patientId: 'pat1', date: '2024-03-25', type: 'Visit Note', details: 'Follow-up for flu. Symptoms resolved. Advised rest.', recordedBy: 'doc1' },
];

const dummyAuditLogs = [
    { id: 'log1', timestamp: '2024-03-24T10:30:00Z', user: 'AdminUser', action: 'CREATE', entity: 'Patient', entityId: 'pat8', details: 'Created new patient record for Jane Doe' },
    { id: 'log2', timestamp: '2024-03-24T11:00:00Z', user: 'DoctorUser', action: 'UPDATE', entity: 'Appointment', entityId: 'app1', details: 'Updated appointment status to CONFIRMED for pat1' },
    { id: 'log3', timestamp: '2024-03-24T11:15:00Z', user: 'ReceptionistUser', action: 'DELETE', entity: 'Appointment', entityId: 'app5', details: 'Cancelled appointment for pat5' },
    { id: 'log4', timestamp: '2024-03-24T12:00:00Z', user: 'AdminUser', action: 'APPROVE', entity: 'Treatment', entityId: 'trt4', details: 'Approved Asthma Maintenance plan for pat7' },
    { id: 'log5', timestamp: '2024-03-24T13:00:00Z', user: 'NurseUser', action: 'UPDATE', entity: 'MedicalRecord', entityId: 'med4', details: 'Updated vitals for pat7' },
];


// --- Reusable Components (defined within App scope or passed as props) ---

// Status Label Component
const StatusLabel = ({ status, type }) => {
    const statusInfo = STATUS_MAPS[type]?.[status];
    if (!statusInfo) return null;
    return (
        <span className={`status-label ${statusInfo.className}`} style={{ backgroundColor: `var(--${statusInfo.className.replace('status-', '').toLowerCase()})` }}>
            {statusInfo.label}
        </span>
    );
};

// Breadcrumbs Component
const Breadcrumbs = ({ path, navigate }) => {
    if (!path || path.length <= 1) return null;
    return (
        <div className="breadcrumbs">
            {path.map((crumb, index) => (
                <React.Fragment key={crumb.screen + (crumb.params?.id || '')}>
                    {index > 0 && <span>/</span>}
                    {index < path.length - 1 ? (
                        <a href="#" onClick={(e) => { e.preventDefault(); navigate(crumb.screen, crumb.params || {}); }}>
                            {crumb.label}
                        </a>
                    ) : (
                        <span className="current">{crumb.label}</span>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

// Card Component (General purpose)
const Card = ({ title, details, status, statusType, onClick, actions, children }) => (
    <div className="card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
        <div className="card-header">
            <h3 className="card-title">{title}</h3>
            {status && statusType && <StatusLabel status={status} type={statusType} />}
        </div>
        {details && (
            <div className="card-details">
                {Object.entries(details).map(([key, value]) => (
                    <p className="card-detail" key={key}>
                        <strong>{key}:</strong> {value}
                    </p>
                ))}
            </div>
        )}
        {children}
        {actions && actions.length > 0 && (
            <div className="card-actions" onClick={e => e.stopPropagation()}> {/* Prevent card click when clicking actions */}
                {actions.map((action, index) => (
                    <button key={index} onClick={action.handler}>
                        {action.label}
                    </button>
                ))}
            </div>
        )}
    </div>
);


function App() {
    const [view, setView] = useState({ screen: 'LOGIN', params: {}, path: [] });
    const [user, setUser] = useState({ role: '', name: '' }); // Default user is not logged in
    const [patientData, setPatientData] = useState(dummyPatients);
    const [appointmentData, setAppointmentData] = useState(dummyAppointments);
    const [doctorData, setDoctorData] = useState(dummyDoctors);
    const [nurseData, setNurseData] = useState(dummyNurses);
    const [treatmentData, setTreatmentData] = useState(dummyTreatments);
    const [medicalRecordData, setMedicalRecordData] = useState(dummyMedicalRecords);
    const [auditLogData, setAuditLogData] = useState(dummyAuditLogs); // Immutable audit trail

    // For Real-time updates simulation
    useEffect(() => {
        const interval = setInterval(() => {
            // In a real app, this would be fetching new data
            // For now, it just ensures the pulse indicator is visible.
        }, 5000); // Every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const navigate = useCallback((screen, params = {}) => {
        setView(prevView => {
            const currentPath = prevView.path || [];
            let label = screen.replace(/_LIST|_DETAIL|_FORM/g, '').replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            // More specific label for detail/form views
            if (params.id) {
                const entityId = params.id;
                const entityMap = {
                    'PATIENT': patientData,
                    'APPOINTMENT': appointmentData,
                    'DOCTOR': doctorData,
                    'NURSE': nurseData,
                    'TREATMENT': treatmentData,
                    'MEDICAL_RECORD': medicalRecordData,
                };
                // Determine entity type based on screen name prefix
                const entityPrefix = screen.split('_')[0];
                const entity = entityMap[entityPrefix]?.find(e => e.id === entityId);
                const entityName = entity?.name || entity?.type || entity?.description || `ID: ${entityId}`;

                if (screen.includes('_FORM')) {
                    label = (params.id ? 'Edit ' : 'New ') + entityName;
                } else {
                    label = entityName;
                }
            }

            const newCrumb = { screen, label, params };

            const existingPathIndex = currentPath.findIndex(crumb =>
                crumb.screen === screen &&
                JSON.stringify(crumb.params) === JSON.stringify(params)
            );

            let nextPath;
            if (screen === 'DASHBOARD' || screen === 'LOGIN' || !user.role) {
                // Always reset path to just Dashboard or Login when going to these root screens or not logged in
                nextPath = [{ screen: screen, label: label, params: params }];
            } else if (existingPathIndex > -1) {
                // If navigating to an existing crumb, trim the path
                nextPath = currentPath.slice(0, existingPathIndex + 1);
            } else {
                // If navigating to a new screen, append it
                nextPath = [...currentPath, newCrumb];
            }

            return { screen, params, path: nextPath };
        });
    }, [patientData, appointmentData, doctorData, nurseData, treatmentData, medicalRecordData, user.role]);

    useEffect(() => {
        // Initialize path when App mounts or user logs in, ensure path is not empty for non-login views
        if (user.role && (!view.path || view.path.length === 0 || view.path[0]?.screen === 'LOGIN')) {
            navigate('DASHBOARD');
        }
    }, [user.role, navigate, view.path]);


    const getAccessibleScreens = useMemo(() => {
        return ROLES_CONFIG[user.role]?.canView || [];
    }, [user.role]);

    const canPerform = useCallback((action, entityType = null) => {
        const rolePermissions = ROLES_CONFIG[user.role];
        if (!rolePermissions) return false;
        if (action === 'view' && entityType) {
            return rolePermissions.canView?.includes(entityType);
        }
        if (action === 'edit' && entityType) {
            // Check if user can edit this type of entity or specific field
            return rolePermissions.canEdit?.includes(entityType) || rolePermissions.canEdit?.includes(`${entityType}_FIELD`);
        }
        if (action === 'create' && entityType) {
            return rolePermissions.canCreate?.includes(entityType);
        }
        if (action === 'delete' && entityType) {
            return rolePermissions.canDelete?.includes(entityType);
        }
        if (action === 'approve') {
            return rolePermissions.canApprove;
        }
        if (action === 'view_logs') {
            return rolePermissions.canViewLogs;
        }
        return false;
    }, [user.role]);

    // --- Data Management Handlers ---
    const handleUpdatePatient = useCallback((id, updatedFields) => {
        setPatientData(prevPatients =>
            prevPatients.map(p => (p.id === id ? { ...p, ...updatedFields } : p))
        );
        // Simulate audit log entry
        setAuditLogData(prevLogs => ([...prevLogs, {
            id: `log${prevLogs.length + 1}`,
            timestamp: new Date().toISOString(),
            user: user.name,
            action: 'UPDATE',
            entity: 'Patient',
            entityId: id,
            details: `Updated patient ${id} fields: ${Object.keys(updatedFields).join(', ')}`
        }]));
    }, [user.name]);

    const handleAddPatient = useCallback((newPatient) => {
        const newId = `pat${patientData.length + 1}`;
        setPatientData(prevPatients => ([...prevPatients, { ...newPatient, id: newId }]));
        setAuditLogData(prevLogs => ([...prevLogs, {
            id: `log${prevLogs.length + 1}`,
            timestamp: new Date().toISOString(),
            user: user.name,
            action: 'CREATE',
            entity: 'Patient',
            entityId: newId,
            details: `Created new patient ${newId}: ${newPatient.name}`
        }]));
    }, [patientData.length, user.name]);

    const handleUpdateAppointment = useCallback((id, updatedFields) => {
        setAppointmentData(prevAppointments =>
            prevAppointments.map(a => (a.id === id ? { ...a, ...updatedFields } : a))
        );
        setAuditLogData(prevLogs => ([...prevLogs, {
            id: `log${prevLogs.length + 1}`,
            timestamp: new Date().toISOString(),
            user: user.name,
            action: 'UPDATE',
            entity: 'Appointment',
            entityId: id,
            details: `Updated appointment ${id} status to ${updatedFields.status || 'N/A'}`
        }]));
    }, [user.name]);

    const handleAddAppointment = useCallback((newAppointment) => {
        const newId = `app${appointmentData.length + 1}`;
        setAppointmentData(prevAppointments => ([...prevAppointments, { ...newAppointment, id: newId }]));
        setAuditLogData(prevLogs => ([...prevLogs, {
            id: `log${prevLogs.length + 1}`,
            timestamp: new Date().toISOString(),
            user: user.name,
            action: 'CREATE',
            entity: 'Appointment',
            entityId: newId,
            details: `Created new appointment ${newId} for patient ${newAppointment.patientId}`
        }]));
    }, [appointmentData.length, user.name]);

    const handleUpdateDoctor = useCallback((id, updatedFields) => {
        setDoctorData(prevDoctors =>
            prevDoctors.map(d => (d.id === id ? { ...d, ...updatedFields } : d))
        );
    }, []);

    const handleAddDoctor = useCallback((newDoctor) => {
        const newId = `doc${doctorData.length + 1}`;
        setDoctorData(prevDoctors => ([...prevDoctors, { ...newDoctor, id: newId }]));
    }, [doctorData.length]);

    const handleUpdateNurse = useCallback((id, updatedFields) => {
        setNurseData(prevNurses =>
            prevNurses.map(n => (n.id === id ? { ...n, ...updatedFields } : n))
        );
    }, []);

    const handleAddNurse = useCallback((newNurse) => {
        const newId = `nur${nurseData.length + 1}`;
        setNurseData(prevNurses => ([...prevNurses, { ...newNurse, id: newId }]));
    }, [nurseData.length]);

    const handleUpdateTreatment = useCallback((id, updatedFields) => {
        setTreatmentData(prevTreatments =>
            prevTreatments.map(t => (t.id === id ? { ...t, ...updatedFields } : t))
        );
        setAuditLogData(prevLogs => ([...prevLogs, {
            id: `log${prevLogs.length + 1}`,
            timestamp: new Date().toISOString(),
            user: user.name,
            action: 'UPDATE',
            entity: 'Treatment',
            entityId: id,
            details: `Updated treatment ${id} status to ${updatedFields.status || 'N/A'}`
        }]));
    }, [user.name]);

    const handleAddTreatment = useCallback((newTreatment) => {
        const newId = `trt${treatmentData.length + 1}`;
        setTreatmentData(prevTreatments => ([...prevTreatments, { ...newTreatment, id: newId }]));
        setAuditLogData(prevLogs => ([...prevLogs, {
            id: `log${prevLogs.length + 1}`,
            timestamp: new Date().toISOString(),
            user: user.name,
            action: 'CREATE',
            entity: 'Treatment',
            entityId: newId,
            details: `Created new treatment ${newId} for patient ${newTreatment.patientId}`
        }]));
    }, [treatmentData.length, user.name]);

    const handleUpdateMedicalRecord = useCallback((id, updatedFields) => {
        setMedicalRecordData(prevRecords =>
            prevRecords.map(r => (r.id === id ? { ...r, ...updatedFields } : r))
        );
    }, []);

    const handleAddMedicalRecord = useCallback((newRecord) => {
        const newId = `med${medicalRecordData.length + 1}`;
        setMedicalRecordData(prevRecords => ([...prevRecords, { ...newRecord, id: newId }]));
    }, [medicalRecordData.length]);

    const handleLogin = useCallback((role) => {
        setUser({ role, name: `${role} User` });
        navigate('DASHBOARD');
    }, [navigate]);

    const handleLogout = useCallback(() => {
        setUser({ role: '', name: '' });
        navigate('LOGIN'); // Assuming a login screen
    }, [navigate]);

    // --- Screen Components ---

    const DashboardScreen = () => {
        // Filter data based on user role (e.g., patient only sees their own data)
        const currentPatientId = user.role === 'Patient' ? 'pat1' : null; // For patient role, assume 'pat1' is their ID for dummy data
        const patientsForDashboard = currentPatientId ? patientData.filter(p => p.id === currentPatientId) : patientData;
        const appointmentsForDashboard = currentPatientId ? appointmentData.filter(app => app.patientId === currentPatientId) : appointmentData;
        const treatmentsForDashboard = currentPatientId ? treatmentData.filter(t => t.patientId === currentPatientId) : treatmentData;

        // Calculate some dummy stats
        const totalPatients = patientsForDashboard.length;
        const activeAppointments = appointmentsForDashboard.filter(app => app.status === 'SCHEDULED' || app.status === 'CONFIRMED').length;
        const completedAppointmentsToday = appointmentsForDashboard.filter(app => app.status === 'COMPLETED' && app.date === new Date().toISOString().slice(0, 10)).length;
        const pendingTreatments = treatmentsForDashboard.filter(t => t.status === 'PENDING').length;

        const recentActivities = useMemo(() => {
            let activities = auditLogData;
            if (currentPatientId) {
                activities = activities.filter(log => log.entityId === currentPatientId || (log.entity === 'Appointment' && appointmentData.find(a => a.id === log.entityId)?.patientId === currentPatientId));
            }
            return activities.slice(-5).reverse().map(log => { // Get 5 most recent activities
                const entityName = log.entityId ? (
                    patientData.find(p => p.id === log.entityId)?.name ||
                    appointmentData.find(a => a.id === log.entityId)?.type ||
                    log.entityId
                ) : '';
                return {
                    id: log.id,
                    description: `${log.action} ${log.entity} ${entityName ? `(${entityName})` : ''}`,
                    timestamp: new Date(log.timestamp).toLocaleString()
                };
            });
        }, [auditLogData, patientData, appointmentData, currentPatientId]);


        return (
            <div className="dashboard-page">
                <div className="screen-header">
                    <h1 className="screen-title">Dashboard</h1>
                    <div className="global-actions">
                        <span className="real-time-indicator"></span>
                        <p style={{ display: 'flex', alignItems: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                            Real-time updates
                        </p>
                    </div>
                </div>

                <div className="dashboard-grid">
                    <div className="dashboard-card">
                        <h3>Total Patients</h3>
                        <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary-700)' }}>{totalPatients}</p>
                    </div>
                    <div className="dashboard-card">
                        <h3>Active Appointments</h3>
                        <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary-700)' }}>{activeAppointments}</p>
                    </div>
                    <div className="dashboard-card">
                        <h3>Completed Today</h3>
                        <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary-700)' }}>{completedAppointmentsToday}</p>
                    </div>
                    <div className="dashboard-card">
                        <h3>Pending Treatments</h3>
                        <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary-700)' }}>{pendingTreatments}</p>
                    </div>
                </div>

                <div className="dashboard-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
                    <div className="dashboard-card">
                        <h3>Appointments by Status (Chart)</h3>
                        <div className="chart-container">Bar Chart Placeholder</div>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-sm)' }}>
                            <a href="#" onClick={() => alert('Exporting chart data...')}>Export to PDF/Excel</a>
                        </p>
                    </div>
                    <div className="dashboard-card">
                        <h3>Recent Activities</h3>
                        <ul className="recent-activities">
                            {recentActivities.map(activity => (
                                <li key={activity.id}>
                                    <div>
                                        {activity.description}
                                        <div className="activity-meta">{activity.timestamp}</div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        );
    };

    const PatientFormScreen = ({ patientId }) => {
        const isEditing = !!patientId;
        const currentPatient = useMemo(() => patientData.find(p => p.id === patientId), [patientId]);
        const [formState, setFormState] = useState(
            currentPatient || { name: '', dob: '', contact: '', status: 'ACTIVE', medicalHistorySummary: '', admittedDate: new Date().toISOString().slice(0,10) }
        );
        const [errors, setErrors] = useState({});

        const validate = useCallback(() => {
            const newErrors = {};
            if (!formState.name) newErrors.name = 'Patient name is required.';
            if (!formState.dob) newErrors.dob = 'Date of Birth is required.';
            if (!formState.contact) newErrors.contact = 'Contact information is required.';
            if (!formState.status) newErrors.status = 'Status is required.';
            return newErrors;
        }, [formState]);

        const handleChange = useCallback((e) => {
            const { name, value } = e.target;
            setFormState(prevState => ({ ...prevState, [name]: value }));
            if (errors[name]) { // Clear error on change
                setErrors(prevErrors => {
                    const nextErrors = { ...prevErrors };
                    delete nextErrors[name];
                    return nextErrors;
                });
            }
        }, [errors]);

        const handleSubmit = useCallback((e) => {
            e.preventDefault();
            const validationErrors = validate();
            if (Object.keys(validationErrors).length > 0) {
                setErrors(validationErrors);
                return;
            }

            if (isEditing) {
                handleUpdatePatient(patientId, formState);
            } else {
                handleAddPatient(formState);
            }
            navigate('PATIENTS_LIST');
        }, [isEditing, patientId, formState, handleUpdatePatient, handleAddPatient, navigate, validate]);

        // Placeholder for file upload
        const handleFileUpload = useCallback((e) => {
            const file = e.target.files?.[0];
            if (file) {
                alert(`File "${file.name}" uploaded successfully (placeholder).`);
                // In a real app, you'd handle file storage and associate with the record.
            }
        }, []);

        return (
            <div className="form-page">
                <div className="screen-header">
                    <h1 className="screen-title">{isEditing ? `Edit Patient: ${currentPatient?.name || patientId}` : 'Add New Patient'}</h1>
                    <div className="detail-actions">
                        <button onClick={() => navigate('PATIENTS_LIST')} style={{ backgroundColor: 'var(--color-neutral)' }}>Back to List</button>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="name" className="required-field">Patient Name</label>
                        <input type="text" id="name" name="name" value={formState.name} onChange={handleChange} required />
                        {errors.name && <p className="error-message">{errors.name}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="dob" className="required-field">Date of Birth</label>
                        <input type="date" id="dob" name="dob" value={formState.dob} onChange={handleChange} required />
                        {errors.dob && <p className="error-message">{errors.dob}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="contact" className="required-field">Contact Info</label>
                        <input type="text" id="contact" name="contact" value={formState.contact} onChange={handleChange} required />
                        {errors.contact && <p className="error-message">{errors.contact}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="status" className="required-field">Status</label>
                        <select id="status" name="status" value={formState.status} onChange={handleChange} required>
                            {Object.entries(STATUS_MAPS.PATIENT).map(([key, info]) => (
                                <option key={key} value={key}>{info.label}</option>
                            ))}
                        </select>
                        {errors.status && <p className="error-message">{errors.status}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="medicalHistorySummary">Medical History Summary</label>
                        <textarea id="medicalHistorySummary" name="medicalHistorySummary" value={formState.medicalHistorySummary} onChange={handleChange} rows="4"></textarea>
                    </div>
                    <div className="form-group">
                        <label htmlFor="admittedDate">Admitted Date (Auto-populated)</label>
                        <input type="date" id="admittedDate" name="admittedDate" value={formState.admittedDate} onChange={handleChange} readOnly={!isEditing} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="medicalFileUpload">Upload Medical Documents</label>
                        <input type="file" id="medicalFileUpload" name="medicalFileUpload" onChange={handleFileUpload} />
                        <p style={{fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-xs)'}}>Max file size: 5MB (Placeholder)</p>
                    </div>
                    <div className="form-actions">
                        <button type="button" onClick={() => navigate('PATIENTS_LIST')} style={{ backgroundColor: 'var(--color-neutral)' }}>Cancel</button>
                        <button type="submit">{isEditing ? 'Save Changes' : 'Add Patient'}</button>
                    </div>
                </form>
            </div>
        );
    };

    const PatientDetailScreen = ({ patientId }) => {
        const patient = useMemo(() => patientData.find(p => p.id === patientId), [patientId]);
        const patientAppointments = useMemo(() => appointmentData.filter(app => app.patientId === patientId), [patientId]);
        const patientTreatments = useMemo(() => treatmentData.filter(trt => trt.patientId === patientId), [patientId]);
        const patientMedicalRecords = useMemo(() => medicalRecordData.filter(rec => rec.patientId === patientId), [patientId]);

        if (!patient) return <div className="detail-page">Patient not found.</div>;

        const canEditPatient = canPerform('edit', 'PATIENT');
        const canViewAuditLogs = canPerform('view_logs');

        return (
            <div className="detail-page">
                <div className="detail-header">
                    <h1 className="screen-title">{patient.name} <StatusLabel status={patient.status} type="PATIENT" /></h1>
                    <div className="detail-actions">
                        {canEditPatient && (
                            <button onClick={() => navigate('PATIENT_FORM', { id: patient.id })}>Edit Patient</button>
                        )}
                        <button onClick={() => navigate('PATIENTS_LIST')} style={{ backgroundColor: 'var(--color-neutral)' }}>Back to List</button>
                    </div>
                </div>

                <div className="detail-section">
                    <h3>Patient Information</h3>
                    <div className="detail-grid">
                        <div className="detail-item">
                            <p>Name</p>
                            <strong>{patient.name}</strong>
                        </div>
                        <div className="detail-item">
                            <p>Date of Birth</p>
                            <strong>{patient.dob}</strong>
                        </div>
                        <div className="detail-item">
                            <p>Contact</p>
                            <strong>{patient.contact}</strong>
                        </div>
                        <div className="detail-item">
                            <p>Status</p>
                            <strong><StatusLabel status={patient.status} type="PATIENT" /></strong>
                        </div>
                        <div className="detail-item">
                            <p>Admitted Date</p>
                            <strong>{patient.admittedDate}</strong>
                        </div>
                    </div>
                    <h4 style={{ marginTop: 'var(--spacing-lg)' }}>Medical History Summary</h4>
                    <p>{patient.medicalHistorySummary || 'No summary available.'}</p>
                </div>

                <div className="detail-section">
                    <h3>Related Appointments ({patientAppointments.length})</h3>
                    <div className="card-list">
                        {patientAppointments.map(app => (
                            <Card
                                key={app.id}
                                title={`${app.type} with Dr. ${doctorData.find(d => d.id === app.doctorId)?.name?.split(' ')[1] || 'N/A'}`}
                                details={{
                                    Date: app.date,
                                    Time: app.time,
                                }}
                                status={app.status}
                                statusType="APPOINTMENT"
                                onClick={() => navigate('APPOINTMENT_DETAIL', { id: app.id })}
                            />
                        ))}
                    </div>
                </div>

                <div className="detail-section">
                    <h3>Related Treatments ({patientTreatments.length})</h3>
                    <div className="card-list">
                        {patientTreatments.map(trt => (
                            <Card
                                key={trt.id}
                                title={trt.type}
                                details={{
                                    Doctor: doctorData.find(d => d.id === trt.doctorId)?.name || 'N/A',
                                    'Start Date': trt.startDate,
                                    'End Date': trt.endDate,
                                }}
                                status={trt.status}
                                statusType="TREATMENT"
                                onClick={() => navigate('TREATMENT_DETAIL', { id: trt.id })}
                            />
                        ))}
                    </div>
                </div>

                <div className="detail-section">
                    <h3>Medical Records ({patientMedicalRecords.length})</h3>
                    <div className="card-list">
                        {patientMedicalRecords.map(rec => (
                            <Card
                                key={rec.id}
                                title={`${rec.type} (${rec.date})`}
                                details={{
                                    'Recorded By': rec.recordedBy,
                                    Details: rec.details.substring(0, 50) + '...',
                                }}
                                onClick={() => navigate('MEDICAL_RECORD_DETAIL', { id: rec.id })}
                            >
                                <button onClick={(e) => { e.stopPropagation(); alert('Document Preview for ' + rec.id); }} style={{ marginTop: 'var(--spacing-sm)', background: 'var(--color-secondary-500)', color: 'var(--color-light-text)' }}>Preview Document</button>
                            </Card>
                        ))}
                    </div>
                </div>

                {canViewAuditLogs && (
                    <div className="detail-section">
                        <h3>Audit Logs (Immutable)</h3>
                        <p style={{fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)'}}>
                            This section displays an immutable audit trail of changes related to this patient.
                            <a href="#" onClick={() => navigate('AUDIT_LOGS', { entityId: patient.id })} style={{marginLeft: 'var(--spacing-xs)'}}>View All Logs</a>
                        </p>
                        <ul>
                            {auditLogData.filter(log => log.entityId === patient.id).map(log => (
                                <li key={log.id} style={{fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)', listStyleType: 'disc', marginLeft: 'var(--spacing-md)'}}>
                                    [{new Date(log.timestamp).toLocaleString()}] {log.user}: {log.action} - {log.details}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    };

    const PatientsListScreen = () => {
        const [searchTerm, setSearchTerm] = useState('');
        const [filterStatus, setFilterStatus] = useState('ALL');

        const filteredPatients = useMemo(() => {
            let filtered = patientData;
            if (filterStatus !== 'ALL') {
                filtered = filtered.filter(p => p.status === filterStatus);
            }
            if (searchTerm) {
                filtered = filtered.filter(p =>
                    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.contact.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }
            return filtered;
        }, [patientData, searchTerm, filterStatus]);

        const canCreatePatient = canPerform('create', 'PATIENT');
        const canEditPatient = canPerform('edit', 'PATIENT');

        return (
            <div>
                <div className="screen-header">
                    <h1 className="screen-title">Patients</h1>
                    <div className="global-actions">
                        <div className="search-bar" style={{ width: 'unset' }}>
                            <input
                                type="text"
                                placeholder="Search patients..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ backgroundColor: 'var(--color-background-card)', color: 'var(--color-text-primary)' }}
                            />
                        </div>
                        <div className="filter-controls">
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                style={{ width: 'auto' }}
                            >
                                <option value="ALL">All Statuses</option>
                                {Object.entries(STATUS_MAPS.PATIENT).map(([key, info]) => (
                                    <option key={key} value={key}>{info.label}</option>
                                ))}
                            </select>
                            <button onClick={() => alert('Saved views feature (placeholder)')} style={{ backgroundColor: 'var(--color-primary-300)', color: 'var(--color-dark-text)' }}>Saved Views</button>
                        </div>
                        {canCreatePatient && (
                            <button onClick={() => navigate('PATIENT_FORM')}>+ Add New Patient</button>
                        )}
                        <button onClick={() => alert('Export Patients to Excel/PDF (placeholder)')} style={{backgroundColor: 'var(--color-secondary-500)'}}>Export</button>
                        <button onClick={() => alert('Bulk Actions (placeholder)')} style={{backgroundColor: 'var(--color-info)'}}>Bulk Actions</button>
                    </div>
                </div>

                <div className="card-list">
                    {filteredPatients.map(patient => (
                        <Card
                            key={patient.id}
                            title={patient.name}
                            details={{
                                'D.O.B': patient.dob,
                                Contact: patient.contact,
                            }}
                            status={patient.status}
                            statusType="PATIENT"
                            onClick={() => navigate('PATIENT_DETAIL', { id: patient.id })}
                            actions={canEditPatient ? [{
                                label: 'Edit',
                                handler: () => navigate('PATIENT_FORM', { id: patient.id })
                            }] : []}
                        />
                    ))}
                </div>
            </div>
        );
    };

    const AppointmentDetailScreen = ({ appointmentId }) => {
        const appointment = useMemo(() => appointmentData.find(app => app.id === appointmentId), [appointmentId, appointmentData]);
        const patient = useMemo(() => patientData.find(p => p.id === appointment?.patientId), [appointment, patientData]);
        const doctor = useMemo(() => doctorData.find(d => d.id === appointment?.doctorId), [appointment, doctorData]);

        if (!appointment) return <div className="detail-page">Appointment not found.</div>;

        const canEditAppointment = canPerform('edit', 'APPOINTMENT');

        const updateStatus = useCallback((newStatus) => {
            handleUpdateAppointment(appointmentId, { status: newStatus });
        }, [appointmentId, handleUpdateAppointment]);

        return (
            <div className="detail-page">
                <div className="detail-header">
                    <h1 className="screen-title">{appointment.type} for {patient?.name || 'N/A'} <StatusLabel status={appointment.status} type="APPOINTMENT" /></h1>
                    <div className="detail-actions">
                        {canEditAppointment && (
                            <button onClick={() => navigate('APPOINTMENT_FORM', { id: appointment.id })}>Edit Appointment</button>
                        )}
                        <button onClick={() => navigate('APPOINTMENTS_LIST')} style={{ backgroundColor: 'var(--color-neutral)' }}>Back to List</button>
                    </div>
                </div>

                <div className="detail-section">
                    <h3>Appointment Details</h3>
                    <div className="detail-grid">
                        <div className="detail-item">
                            <p>Patient</p>
                            <strong><a href="#" onClick={(e) => { e.preventDefault(); navigate('PATIENT_DETAIL', { id: patient?.id }); }}>{patient?.name || 'N/A'}</a></strong>
                        </div>
                        <div className="detail-item">
                            <p>Doctor</p>
                            <strong><a href="#" onClick={(e) => { e.preventDefault(); navigate('DOCTOR_DETAIL', { id: doctor?.id }); }}>{doctor?.name || 'N/A'}</a></strong>
                        </div>
                        <div className="detail-item">
                            <p>Date</p>
                            <strong>{appointment.date}</strong>
                        </div>
                        <div className="detail-item">
                            <p>Time</p>
                            <strong>{appointment.time}</strong>
                        </div>
                        <div className="detail-item">
                            <p>Type</p>
                            <strong>{appointment.type}</strong>
                        </div>
                        <div className="detail-item">
                            <p>Status</p>
                            <strong><StatusLabel status={appointment.status} type="APPOINTMENT" /></strong>
                        </div>
                    </div>
                    <h4 style={{ marginTop: 'var(--spacing-lg)' }}>Notes</h4>
                    <p>{appointment.notes || 'No notes.'}</p>
                </div>

                {canEditAppointment && (
                    <div className="detail-section">
                        <h3>Workflow / Quick Actions</h3>
                        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                            {(appointment.status === 'SCHEDULED' || appointment.status === 'PENDING_RESCHEDULE') && (
                                <button onClick={() => updateStatus('CONFIRMED')}>Confirm Appointment</button>
                            )}
                            {(appointment.status === 'SCHEDULED' || appointment.status === 'CONFIRMED') && (
                                <button onClick={() => updateStatus('CANCELLED')} style={{ backgroundColor: 'var(--color-danger)' }}>Cancel Appointment</button>
                            )}
                            {(appointment.status === 'SCHEDULED' || appointment.status === 'CONFIRMED') && (
                                <button onClick={() => updateStatus('PENDING_RESCHEDULE')} style={{ backgroundColor: 'var(--color-warning)' }}>Reschedule</button>
                            )}
                            {(appointment.status === 'CONFIRMED' || appointment.status === 'PENDING_RESCHEDULE') && (
                                <button onClick={() => updateStatus('COMPLETED')} style={{ backgroundColor: 'var(--color-success)' }}>Mark as Completed</button>
                            )}
                        </div>
                        <p style={{fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-md)'}}>
                            SLA Tracking: This appointment is {appointment.status === 'PENDING_RESCHEDULE' ? 'approaching SLA breach for rescheduling.' : 'within SLA.'} (Placeholder)
                        </p>
                    </div>
                )}
            </div>
        );
    };

    const AppointmentFormScreen = ({ appointmentId }) => {
        const isEditing = !!appointmentId;
        const currentAppointment = useMemo(() => appointmentData.find(app => app.id === appointmentId), [appointmentId, appointmentData]);
        const [formState, setFormState] = useState(
            currentAppointment || { patientId: '', doctorId: '', date: '', time: '', status: 'SCHEDULED', type: '', notes: '' }
        );
        const [errors, setErrors] = useState({});

        const validate = useCallback(() => {
            const newErrors = {};
            if (!formState.patientId) newErrors.patientId = 'Patient is required.';
            if (!formState.doctorId) newErrors.doctorId = 'Doctor is required.';
            if (!formState.date) newErrors.date = 'Date is required.';
            if (!formState.time) newErrors.time = 'Time is required.';
            if (!formState.type) newErrors.type = 'Type is required.';
            return newErrors;
        }, [formState]);

        const handleChange = useCallback((e) => {
            const { name, value } = e.target;
            setFormState(prevState => ({ ...prevState, [name]: value }));
            if (errors[name]) {
                setErrors(prevErrors => {
                    const nextErrors = { ...prevErrors };
                    delete nextErrors[name];
                    return nextErrors;
                });
            }
        }, [errors]);

        const handleSubmit = useCallback((e) => {
            e.preventDefault();
            const validationErrors = validate();
            if (Object.keys(validationErrors).length > 0) {
                setErrors(validationErrors);
                return;
            }

            if (isEditing) {
                handleUpdateAppointment(appointmentId, formState);
            } else {
                handleAddAppointment(formState);
            }
            navigate('APPOINTMENTS_LIST');
        }, [isEditing, appointmentId, formState, handleUpdateAppointment, handleAddAppointment, navigate, validate]);

        return (
            <div className="form-page">
                <div className="screen-header">
                    <h1 className="screen-title">{isEditing ? `Edit Appointment: ${appointmentId}` : 'Add New Appointment'}</h1>
                    <div className="detail-actions">
                        <button onClick={() => navigate('APPOINTMENTS_LIST')} style={{ backgroundColor: 'var(--color-neutral)' }}>Back to List</button>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="patientId" className="required-field">Patient</label>
                        <select id="patientId" name="patientId" value={formState.patientId} onChange={handleChange} required>
                            <option value="">Select a Patient</option>
                            {patientData.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        {errors.patientId && <p className="error-message">{errors.patientId}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="doctorId" className="required-field">Doctor</label>
                        <select id="doctorId" name="doctorId" value={formState.doctorId} onChange={handleChange} required>
                            <option value="">Select a Doctor</option>
                            {doctorData.filter(d => d.status === 'ACTIVE').map(d => (
                                <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
                            ))}
                        </select>
                        {errors.doctorId && <p className="error-message">{errors.doctorId}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="date" className="required-field">Date</label>
                        <input type="date" id="date" name="date" value={formState.date} onChange={handleChange} required />
                        {errors.date && <p className="error-message">{errors.date}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="time" className="required-field">Time</label>
                        <input type="time" id="time" name="time" value={formState.time} onChange={handleChange} required />
                        {errors.time && <p className="error-message">{errors.time}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="type" className="required-field">Appointment Type</label>
                        <input type="text" id="type" name="type" value={formState.type} onChange={handleChange} required />
                        {errors.type && <p className="error-message">{errors.type}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="status" className="required-field">Status (Auto-populated for new appointments)</label>
                        <select id="status" name="status" value={formState.status} onChange={handleChange} disabled={!isEditing} >
                            {Object.entries(STATUS_MAPS.APPOINTMENT).map(([key, info]) => (
                                <option key={key} value={key}>{info.label}</option>
                            ))}
                        </select>
                        {errors.status && <p className="error-message">{errors.status}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="notes">Notes</label>
                        <textarea id="notes" name="notes" value={formState.notes} onChange={handleChange} rows="4"></textarea>
                    </div>
                    <div className="form-actions">
                        <button type="button" onClick={() => navigate('APPOINTMENTS_LIST')} style={{ backgroundColor: 'var(--color-neutral)' }}>Cancel</button>
                        <button type="submit">{isEditing ? 'Save Changes' : 'Add Appointment'}</button>
                    </div>
                </form>
            </div>
        );
    };

    const AppointmentsListScreen = () => {
        const [searchTerm, setSearchTerm] = useState('');
        const [filterStatus, setFilterStatus] = useState('ALL');

        // Filter appointments based on user role
        const currentPatientId = user.role === 'Patient' ? 'pat1' : null; // Assume 'pat1' for Patient role
        const filteredAppointments = useMemo(() => {
            let filtered = appointmentData;
            if (currentPatientId) {
                filtered = filtered.filter(app => app.patientId === currentPatientId);
            }

            if (filterStatus !== 'ALL') {
                filtered = filtered.filter(app => app.status === filterStatus);
            }
            if (searchTerm) {
                filtered = filtered.filter(app => {
                    const patientName = patientData.find(p => p.id === app.patientId)?.name || '';
                    const doctorName = doctorData.find(d => d.id === app.doctorId)?.name || '';
                    return (
                        app.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        doctorName.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                });
            }
            return filtered;
        }, [appointmentData, searchTerm, filterStatus, patientData, doctorData, currentPatientId]);

        const canCreateAppointment = canPerform('create', 'APPOINTMENT');
        const canEditAppointment = canPerform('edit', 'APPOINTMENT');

        return (
            <div>
                <div className="screen-header">
                    <h1 className="screen-title">{user.role === 'Patient' ? 'My Appointments' : 'Appointments'}</h1>
                    <div className="global-actions">
                        <div className="search-bar" style={{ width: 'unset' }}>
                            <input
                                type="text"
                                placeholder="Search appointments..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ backgroundColor: 'var(--color-background-card)', color: 'var(--color-text-primary)' }}
                            />
                        </div>
                        <div className="filter-controls">
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                style={{ width: 'auto' }}
                            >
                                <option value="ALL">All Statuses</option>
                                {Object.entries(STATUS_MAPS.APPOINTMENT).map(([key, info]) => (
                                    <option key={key} value={key}>{info.label}</option>
                                ))}
                            </select>
                        </div>
                        {(canCreateAppointment || (user.role === 'Patient' && canPerform('create', 'APPOINTMENT_REQUEST'))) && (
                            <button onClick={() => navigate('APPOINTMENT_FORM')}>+ Schedule New Appointment</button>
                        )}
                        <button onClick={() => alert('Export Appointments (placeholder)')} style={{backgroundColor: 'var(--color-secondary-500)'}}>Export</button>
                    </div>
                </div>

                <div className="card-list">
                    {filteredAppointments.map(app => (
                        <Card
                            key={app.id}
                            title={`${app.type} for ${patientData.find(p => p.id === app.patientId)?.name || 'N/A'}`}
                            details={{
                                Date: app.date,
                                Time: app.time,
                                Doctor: doctorData.find(d => d.id === app.doctorId)?.name || 'N/A',
                            }}
                            status={app.status}
                            statusType="APPOINTMENT"
                            onClick={() => navigate('APPOINTMENT_DETAIL', { id: app.id })}
                            actions={canEditAppointment ? [{
                                label: 'Edit',
                                handler: () => navigate('APPOINTMENT_FORM', { id: app.id })
                            }] : []}
                        />
                    ))}
                </div>
            </div>
        );
    };

    const DoctorsListScreen = () => {
        const canCreateDoctor = canPerform('create', 'DOCTOR');
        const canEditDoctor = canPerform('edit', 'DOCTOR');
        return (
            <div>
                <div className="screen-header">
                    <h1 className="screen-title">Doctors</h1>
                    <div className="global-actions">
                        {canCreateDoctor && (
                            <button onClick={() => navigate('DOCTOR_FORM')}>+ Add New Doctor</button>
                        )}
                    </div>
                </div>
                <div className="card-list">
                    {doctorData.map(doctor => (
                        <Card
                            key={doctor.id}
                            title={doctor.name}
                            details={{
                                Specialty: doctor.specialty,
                                Contact: doctor.contact,
                            }}
                            status={doctor.status}
                            statusType="STAFF"
                            onClick={() => navigate('DOCTOR_DETAIL', { id: doctor.id })}
                            actions={canEditDoctor ? [{
                                label: 'Edit',
                                handler: () => navigate('DOCTOR_FORM', { id: doctor.id })
                            }] : []}
                        />
                    ))}
                </div>
            </div>
        );
    };

    const DoctorDetailScreen = ({ doctorId }) => {
        const doctor = useMemo(() => doctorData.find(d => d.id === doctorId), [doctorId, doctorData]);
        const doctorAppointments = useMemo(() => appointmentData.filter(app => app.doctorId === doctorId), [doctorId, appointmentData]);
        const doctorTreatments = useMemo(() => treatmentData.filter(trt => trt.doctorId === doctorId), [doctorId, treatmentData]);

        if (!doctor) return <div className="detail-page">Doctor not found.</div>;

        const canEditDoctor = canPerform('edit', 'DOCTOR');

        return (
            <div className="detail-page">
                <div className="detail-header">
                    <h1 className="screen-title">{doctor.name} <StatusLabel status={doctor.status} type="STAFF" /></h1>
                    <div className="detail-actions">
                        {canEditDoctor && (
                            <button onClick={() => navigate('DOCTOR_FORM', { id: doctor.id })}>Edit Doctor</button>
                        )}
                        <button onClick={() => navigate('DOCTORS_LIST')} style={{ backgroundColor: 'var(--color-neutral)' }}>Back to List</button>
                    </div>
                </div>

                <div className="detail-section">
                    <h3>Doctor Information</h3>
                    <div className="detail-grid">
                        <div className="detail-item">
                            <p>Name</p>
                            <strong>{doctor.name}</strong>
                        </div>
                        <div className="detail-item">
                            <p>Specialty</p>
                            <strong>{doctor.specialty}</strong>
                        </div>
                        <div className="detail-item">
                            <p>Contact</p>
                            <strong>{doctor.contact}</strong>
                        </div>
                        <div className="detail-item">
                            <p>Email</p>
                            <strong>{doctor.email}</strong>
                        </div>
                        <div className="detail-item">
                            <p>Status</p>
                            <strong><StatusLabel status={doctor.status} type="STAFF" /></strong>
                        </div>
                    </div>
                </div>

                <div className="detail-section">
                    <h3>Scheduled Appointments ({doctorAppointments.length})</h3>
                    <div className="card-list">
                        {doctorAppointments.map(app => (
                            <Card
                                key={app.id}
                                title={`${app.type} for ${patientData.find(p => p.id === app.patientId)?.name || 'N/A'}`}
                                details={{
                                    Date: app.date,
                                    Time: app.time,
                                }}
                                status={app.status}
                                statusType="APPOINTMENT"
                                onClick={() => navigate('APPOINTMENT_DETAIL', { id: app.id })}
                            />
                        ))}
                    </div>
                </div>

                <div className="detail-section">
                    <h3>Managed Treatments ({doctorTreatments.length})</h3>
                    <div className="card-list">
                        {doctorTreatments.map(trt => (
                            <Card
                                key={trt.id}
                                title={trt.type}
                                details={{
                                    Patient: patientData.find(p => p.id === trt.patientId)?.name || 'N/A',
                                    'Start Date': trt.startDate,
                                    'End Date': trt.endDate,
                                }}
                                status={trt.status}
                                statusType="TREATMENT"
                                onClick={() => navigate('TREATMENT_DETAIL', { id: trt.id })}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const DoctorFormScreen = ({ doctorId }) => {
        const isEditing = !!doctorId;
        const currentDoctor = useMemo(() => doctorData.find(d => d.id === doctorId), [doctorId, doctorData]);
        const [formState, setFormState] = useState(
            currentDoctor || { name: '', specialty: '', contact: '', status: 'ACTIVE', email: '' }
        );
        const [errors, setErrors] = useState({});

        const validate = useCallback(() => {
            const newErrors = {};
            if (!formState.name) newErrors.name = 'Doctor name is required.';
            if (!formState.specialty) newErrors.specialty = 'Specialty is required.';
            if (!formState.contact) newErrors.contact = 'Contact information is required.';
            if (!formState.email) newErrors.email = 'Email is required.';
            return newErrors;
        }, [formState]);

        const handleChange = useCallback((e) => {
            const { name, value } = e.target;
            setFormState(prevState => ({ ...prevState, [name]: value }));
            if (errors[name]) {
                setErrors(prevErrors => {
                    const nextErrors = { ...prevErrors };
                    delete nextErrors[name];
                    return nextErrors;
                });
            }
        }, [errors]);

        const handleSubmit = useCallback((e) => {
            e.preventDefault();
            const validationErrors = validate();
            if (Object.keys(validationErrors).length > 0) {
                setErrors(validationErrors);
                return;
            }

            if (isEditing) {
                handleUpdateDoctor(doctorId, formState);
            } else {
                handleAddDoctor(formState);
            }
            navigate('DOCTORS_LIST');
        }, [isEditing, doctorId, formState, handleUpdateDoctor, handleAddDoctor, navigate, validate]);

        return (
            <div className="form-page">
                <div className="screen-header">
                    <h1 className="screen-title">{isEditing ? `Edit Doctor: ${currentDoctor?.name || doctorId}` : 'Add New Doctor'}</h1>
                    <div className="detail-actions">
                        <button onClick={() => navigate('DOCTORS_LIST')} style={{ backgroundColor: 'var(--color-neutral)' }}>Back to List</button>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="doctor-name" className="required-field">Doctor Name</label>
                        <input type="text" id="doctor-name" name="name" value={formState.name} onChange={handleChange} required />
                        {errors.name && <p className="error-message">{errors.name}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="specialty" className="required-field">Specialty</label>
                        <input type="text" id="specialty" name="specialty" value={formState.specialty} onChange={handleChange} required />
                        {errors.specialty && <p className="error-message">{errors.specialty}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="doctor-contact" className="required-field">Contact Info</label>
                        <input type="text" id="doctor-contact" name="contact" value={formState.contact} onChange={handleChange} required />
                        {errors.contact && <p className="error-message">{errors.contact}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="doctor-email" className="required-field">Email</label>
                        <input type="email" id="doctor-email" name="email" value={formState.email} onChange={handleChange} required />
                        {errors.email && <p className="error-message">{errors.email}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="doctor-status" className="required-field">Status</label>
                        <select id="doctor-status" name="status" value={formState.status} onChange={handleChange} required>
                            {Object.entries(STATUS_MAPS.STAFF).map(([key, info]) => (
                                <option key={key} value={key}>{info.label}</option>
                            ))}
                        </select>
                        {errors.status && <p className="error-message">{errors.status}</p>}
                    </div>
                    <div className="form-actions">
                        <button type="button" onClick={() => navigate('DOCTORS_LIST')} style={{ backgroundColor: 'var(--color-neutral)' }}>Cancel</button>
                        <button type="submit">{isEditing ? 'Save Changes' : 'Add Doctor'}</button>
                    </div>
                </form>
            </div>
        );
    };

    // Placeholder for other screens for brevity
    const GenericListViewScreen = ({ entityType, data, navigateToDetail, navigateToForm, canCreate, canEdit, statusType, titleKey, detailKeys, filterable = false, searchPlaceholder = '' }) => {
        const [searchTerm, setSearchTerm] = useState('');
        const [filterStatus, setFilterStatus] = useState('ALL');

        const filteredData = useMemo(() => {
            let filtered = data;
            if (filterable && filterStatus !== 'ALL' && statusType) {
                filtered = filtered.filter(item => item.status === filterStatus);
            }
            if (searchTerm) {
                filtered = filtered.filter(item =>
                    Object.values(item).some(val =>
                        String(val).toLowerCase().includes(searchTerm.toLowerCase())
                    )
                );
            }
            return filtered;
        }, [data, searchTerm, filterStatus, filterable, statusType]);

        return (
            <div>
                <div className="screen-header">
                    <h1 className="screen-title">{entityType}s</h1>
                    <div className="global-actions">
                        {searchPlaceholder && (
                            <div className="search-bar" style={{ width: 'unset' }}>
                                <input
                                    type="text"
                                    placeholder={searchPlaceholder}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ backgroundColor: 'var(--color-background-card)', color: 'var(--color-text-primary)' }}
                                />
                            </div>
                        )}
                        {filterable && statusType && (
                            <div className="filter-controls">
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    style={{ width: 'auto' }}
                                >
                                    <option value="ALL">All Statuses</option>
                                    {Object.entries(STATUS_MAPS[statusType]).map(([key, info]) => (
                                        <option key={key} value={key}>{info.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {canCreate && (
                            <button onClick={() => navigateToForm()}>+ Add New {entityType}</button>
                        )}
                    </div>
                </div>
                <div className="card-list">
                    {filteredData.map(item => (
                        <Card
                            key={item.id}
                            title={item[titleKey]}
                            details={detailKeys.reduce((acc, key) => {
                                acc[key.charAt(0).toUpperCase() + key.slice(1)] = item[key];
                                return acc;
                            }, {})}
                            status={item.status}
                            statusType={statusType}
                            onClick={() => navigateToDetail(item.id)}
                            actions={canEdit ? [{
                                label: 'Edit',
                                handler: () => navigateToForm(item.id)
                            }] : []}
                        />
                    ))}
                </div>
            </div>
        );
    };

    const AuditLogsScreen = () => {
        const canViewLogs = canPerform('view_logs');
        if (!canViewLogs) {
            return <div className="detail-page">You do not have permission to view audit logs.</div>;
        }

        const logsToDisplay = useMemo(() => {
            if (view.params?.entityId) {
                return auditLogData.filter(log => log.entityId === view.params.entityId);
            }
            return auditLogData;
        }, [auditLogData, view.params?.entityId]);

        return (
            <div className="detail-page">
                <div className="screen-header">
                    <h1 className="screen-title">Audit Logs {view.params?.entityId ? `for Entity: ${view.params.entityId}` : ''}</h1>
                    <div className="detail-actions">
                        {view.params?.entityId && (
                            <button onClick={() => navigate('AUDIT_LOGS')} style={{backgroundColor: 'var(--color-neutral)'}}>View All Logs</button>
                        )}
                        <button onClick={() => navigate('DASHBOARD')} style={{backgroundColor: 'var(--color-neutral)'}}>Back to Dashboard</button>
                    </div>
                </div>
                <div className="detail-section">
                    <h3>Immutable Audit Trail</h3>
                    <p style={{fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)'}}>
                        All changes are recorded in an immutable audit trail, ensuring data integrity and compliance.
                    </p>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {logsToDisplay.map(log => (
                            <li key={log.id} style={{ borderBottom: '1px solid var(--border-color)', padding: 'var(--spacing-sm) 0', fontSize: 'var(--font-size-sm)' }}>
                                <strong>[{new Date(log.timestamp).toLocaleString()}]</strong>
                                <br />
                                <span>User: <em>{log.user}</em></span><br/>
                                <span>Action: <em>{log.action} {log.entity} ({log.entityId || 'N/A'})</em></span><br/>
                                <span>Details: {log.details}</span>
                            </li>
                        ))}
                        {logsToDisplay.length === 0 && (
                            <p>No audit logs found for this filter/entity.</p>
                        )}
                    </ul>
                </div>
            </div>
        );
    };

    const LoginScreen = () => (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 100px)', padding: 'var(--spacing-xl)' }}>
            <div className="form-page" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                <h1 className="screen-title" style={{ marginBottom: 'var(--spacing-xl)' }}>Select Role to Login</h1>
                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    {Object.keys(ROLES_CONFIG).map(role => (
                        <button key={role} onClick={() => handleLogin(role)} style={{
                            padding: 'var(--spacing-md)',
                            fontSize: 'var(--font-size-md)',
                            backgroundColor: 'var(--color-primary-500)'
                        }}>
                            Login as {role}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    const SettingsScreen = () => {
        return (
            <div className="detail-page">
                <div className="screen-header">
                    <h1 className="screen-title">User Settings</h1>
                </div>
                <div className="detail-section">
                    <h3>Profile Information</h3>
                    <p><strong>Current Role:</strong> {user.role}</p>
                    <p><strong>Username:</strong> {user.name}</p>
                    <button onClick={() => alert('Feature: Change Password (placeholder)')} style={{marginTop: 'var(--spacing-md)'}}>Change Password</button>
                </div>
                <div className="detail-section">
                    <h3>Personalization</h3>
                    <p>Theme: <a href="#" onClick={() => alert('Feature: Dark/Light Mode (placeholder)')}>Switch to Dark Mode</a></p>
                    <p>Preferred Language: <select><option>English</option><option>Spanish</option></select></p>
                    <p style={{fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-md)'}}>
                        Saved grid views and filters are stored per user. (Placeholder)
                    </p>
                </div>
            </div>
        );
    };

    const renderScreen = () => {
        // Patient-specific views logic for list screens
        const currentPatientId = user.role === 'Patient' ? 'pat1' : null; // Hardcoded for dummy data
        const patientSpecificProps = currentPatientId ? {
            data: patientData.filter(p => p.id === currentPatientId),
            navigateToDetail: (id) => navigate('MY_PROFILE', { id }), // Patient profile
            navigateToForm: (id) => navigate('MY_PROFILE', { id }),
            canCreate: canPerform('create', 'MY_PROFILE'), // Placeholder for specific patient actions
            canEdit: canPerform('edit', 'MY_PROFILE')
        } : {};

        switch (view.screen) {
            case 'LOGIN': return <LoginScreen />;
            case 'DASHBOARD': return <DashboardScreen />;
            case 'PATIENTS_LIST': return <PatientsListScreen />;
            case 'PATIENT_DETAIL': return <PatientDetailScreen patientId={view.params.id} />;
            case 'PATIENT_FORM': return <PatientFormScreen patientId={view.params.id} />;
            case 'APPOINTMENTS_LIST': return <AppointmentsListScreen />;
            case 'APPOINTMENT_DETAIL': return <AppointmentDetailScreen appointmentId={view.params.id} />;
            case 'APPOINTMENT_FORM': return <AppointmentFormScreen appointmentId={view.params.id} />;
            case 'DOCTORS_LIST': return <DoctorsListScreen />;
            case 'DOCTOR_DETAIL': return <DoctorDetailScreen doctorId={view.params.id} />;
            case 'DOCTOR_FORM': return <DoctorFormScreen doctorId={view.params.id} />;
            case 'NURSES_LIST': return <GenericListViewScreen
                entityType="Nurse"
                data={nurseData}
                navigateToDetail={(id) => navigate('NURSE_DETAIL', { id })}
                navigateToForm={(id) => navigate('NURSE_FORM', { id })} // Implement NurseFormScreen similarly
                canCreate={canPerform('create', 'NURSE')}
                canEdit={canPerform('edit', 'NURSE')}
                statusType="STAFF"
                titleKey="name"
                detailKeys={['department', 'contact']}
                searchPlaceholder="Search nurses..."
                filterable={true}
            />;
            case 'NURSE_DETAIL': return <div className="detail-page"><h3>Nurse Detail (Placeholder)</h3><p>ID: {view.params.id}</p><button onClick={() => navigate('NURSES_LIST')}>Back</button></div>;
            case 'NURSE_FORM': return <div className="form-page"><h3>Nurse Form (Placeholder)</h3><p>{view.params.id ? 'Edit' : 'Add'} Nurse ID: {view.params.id}</p><button onClick={() => navigate('NURSES_LIST')}>Cancel</button></div>;
            case 'TREATMENTS_LIST': return <GenericListViewScreen
                entityType="Treatment"
                data={treatmentData}
                navigateToDetail={(id) => navigate('TREATMENT_DETAIL', { id })}
                navigateToForm={(id) => navigate('TREATMENT_FORM', { id })}
                canCreate={canPerform('create', 'TREATMENT')}
                canEdit={canPerform('edit', 'TREATMENT')}
                statusType="TREATMENT"
                titleKey="type"
                detailKeys={['startDate', 'endDate']}
                searchPlaceholder="Search treatments..."
                filterable={true}
            />;
            case 'TREATMENT_DETAIL': return <div className="detail-page"><h3>Treatment Detail (Placeholder)</h3><p>ID: {view.params.id}</p><button onClick={() => navigate('TREATMENTS_LIST')}>Back</button></div>;
            case 'TREATMENT_FORM': return <div className="form-page"><h3>Treatment Form (Placeholder)</h3><p>{view.params.id ? 'Edit' : 'Add'} Treatment ID: {view.params.id}</p><button onClick={() => navigate('TREATMENTS_LIST')}>Cancel</button></div>;
            case 'MEDICAL_RECORDS_LIST': return <GenericListViewScreen
                entityType="Medical Record"
                data={medicalRecordData}
                navigateToDetail={(id) => navigate('MEDICAL_RECORD_DETAIL', { id })}
                navigateToForm={(id) => navigate('MEDICAL_RECORD_FORM', { id })}
                canCreate={canPerform('create', 'MEDICAL_RECORD')}
                canEdit={canPerform('edit', 'MEDICAL_RECORD')}
                statusType={null} // Medical records don't have a shared status mapping
                titleKey="type"
                detailKeys={['date', 'recordedBy']}
                searchPlaceholder="Search records..."
            />;
            case 'MEDICAL_RECORD_DETAIL': return <div className="detail-page"><h3>Medical Record Detail (Placeholder)</h3><p>ID: {view.params.id}</p><button onClick={() => navigate('MEDICAL_RECORDS_LIST')}>Back</button></div>;
            case 'MEDICAL_RECORD_FORM': return <div className="form-page"><h3>Medical Record Form (Placeholder)</h3><p>{view.params.id ? 'Edit' : 'Add'} Medical Record ID: {view.params.id}</p><button onClick={() => navigate('MEDICAL_RECORDS_LIST')}>Cancel</button></div>;
            case 'AUDIT_LOGS': return <AuditLogsScreen />;
            case 'SETTINGS': return <SettingsScreen />;
            case 'MY_APPOINTMENTS': return <AppointmentsListScreen />; // Patient's view of appointments
            case 'MY_MEDICAL_RECORDS': return <GenericListViewScreen
                entityType="My Medical Record"
                data={medicalRecordData.filter(rec => rec.patientId === currentPatientId)}
                navigateToDetail={(id) => navigate('MEDICAL_RECORD_DETAIL', { id })}
                navigateToForm={() => alert('Patients cannot create medical records directly.')}
                canCreate={false}
                canEdit={false}
                statusType={null}
                titleKey="type"
                detailKeys={['date', 'recordedBy']}
                searchPlaceholder="Search my records..."
            />;
            case 'MY_PROFILE': return <PatientDetailScreen patientId={currentPatientId} />; // Patient's view of their own profile
            default: return <div className="detail-page"><h1>404 - Screen Not Found</h1><button onClick={() => navigate('DASHBOARD')}>Go to Dashboard</button></div>;
        }
    };

    if (!user.role) {
        return <LoginScreen />;
    }

    return (
        <div className="app-container">
            <header className="header">
                <h1 className="header-logo" onClick={() => navigate('DASHBOARD')}>
                    PatientCare+
                </h1>
                <nav className="header-nav">
                    <ul>
                        {getAccessibleScreens.map(screenName => {
                            const labelMap = {
                                'DASHBOARD': 'Dashboard',
                                'PATIENTS_LIST': 'Patients',
                                'APPOINTMENTS_LIST': 'Appointments',
                                'DOCTORS_LIST': 'Doctors',
                                'NURSES_LIST': 'Nurses',
                                'TREATMENTS_LIST': 'Treatments',
                                'MEDICAL_RECORDS_LIST': 'Records',
                                'AUDIT_LOGS': 'Audit Logs',
                                'SETTINGS': 'Settings',
                                'MY_APPOINTMENTS': 'My Appointments',
                                'MY_MEDICAL_RECORDS': 'My Records',
                                'MY_PROFILE': 'My Profile'
                            };
                            if (!labelMap[screenName]) return null; // Only show main list/dashboard screens in nav
                            const currentRouteBase = view.screen.split('_')[0];
                            const navRouteBase = screenName.split('_')[0];
                            return (
                                <li key={screenName}>
                                    <a
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); navigate(screenName); }}
                                        className={currentRouteBase === navRouteBase ? 'active' : ''}
                                    >
                                        {labelMap[screenName]}
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
                <div className="user-info">
                    <span>{user.name} ({user.role})</span>
                    <button onClick={handleLogout} style={{ backgroundColor: 'var(--color-danger)', padding: 'var(--spacing-xs) var(--spacing-sm)' }}>Logout</button>
                </div>
            </header>

            <main className="main-content">
                <Breadcrumbs path={view.path || []} navigate={navigate} />
                {renderScreen()}
            </main>
        </div>
    );
}

export default App;