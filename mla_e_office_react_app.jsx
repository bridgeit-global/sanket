import React, { useState, useEffect } from "react";

// Types

type Theme = "light" | "dark";

type Language = "en" | "mr"; // English / Marathi

type ModuleKey =
  | "dashboard"
  | "daily"
  | "inward"
  | "outward"
  | "projects"
  | "users"
  | "profile"
  | "settings";

type Role = "MLA" | "PA" | "Office Staff" | "Guest";

interface NavItem {
  key: ModuleKey;
  labelKey: string;
}

interface Permissions {
  dashboard: boolean;
  daily: boolean;
  inward: boolean;
  outward: boolean;
  projects: boolean;
}

interface MlaUser {
  id: number;
  name: string;
  loginId: string;
  role: Role;
  password: string; // demo only - in real app never store plain text
  permissions: Permissions;
}

// Simple i18n using Bhashini-compatible language codes (en, mr)
// In production, you can populate these strings using Bhashini NMT APIs
// from https://bhashini.gov.in via your backend.

const translations: Record<string, { en: string; mr: string }> = {
  "app.title": {
    en: "MLA e-Office",
    mr: "आमदार ई-ऑफिस",
  },
  "app.subtitle": {
    en: "Constituency Control Room",
    mr: "मतदारसंघ नियंत्रण कक्ष",
  },
  "sidebar.eoffice": {
    en: "e-Office",
    mr: "ई-ऑफिस",
  },
  "nav.dashboard": { en: "Dashboard", mr: "डॅशबोर्ड" },
  "nav.daily": { en: "Daily Programme", mr: "दैनिक कार्यक्रम" },
  "nav.inward": { en: "Inward", mr: "आवक नोंद" },
  "nav.outward": { en: "Outward", mr: "जावक नोंद" },
  "nav.projects": { en: "Projects", mr: "प्रकल्प" },
  "nav.users": { en: "Users & Roles", mr: "वापरकर्ते व भूमिका" },
  "nav.profile": { en: "Profile", mr: "प्रोफाईल" },
  "nav.settings": { en: "Settings", mr: "सेटिंग्स" },
  "top.module": { en: "Module", mr: "मॉड्यूल" },
  "top.today": { en: "Today's Date", mr: "आजची तारीख" },
  "btn.darkMode": { en: "Dark Mode", mr: "डार्क मोड" },
  "btn.lightMode": { en: "Light Mode", mr: "लाईट मोड" },
  "btn.lang.en": { en: "English", mr: "इंग्रजी" },
  "btn.lang.mr": { en: "Marathi", mr: "मराठी" },
  "dashboard.today": { en: "Today at a glance", mr: "आजचा आढावा" },
  "dashboard.upcoming": {
    en: "Upcoming programmes",
    mr: "आगामी कार्यक्रम",
  },
  "dashboard.quickActions": {
    en: "Quick actions",
    mr: "जलद कृती",
  },
  "dashboard.meetings": { en: "Meetings", mr: "बैठका" },
  "dashboard.inout": { en: "Inward / Outward", mr: "आवक / जावक" },
  "dashboard.projects": { en: "Projects", mr: "प्रकल्प" },
  "dashboard.meetingsSub": {
    en: "As per Daily Programme",
    mr: "दैनिक कार्यक्रमानुसार",
  },
  "dashboard.inoutSub": {
    en: "Registered today",
    mr: "आज नोंद झालेली",
  },
  "dashboard.projectsSub": {
    en: "In progress for the Constituency",
    mr: "मतदारसंघातील प्रलंबित कामे",
  },
  "daily.title": {
    en: "Create / Edit Daily Programme",
    mr: "दैनिक कार्यक्रम तयार / दुरुस्त करा",
  },
  "daily.register": {
    en: "Programme Register",
    mr: "कार्यक्रम नोंदवही",
  },
  "field.date": { en: "Date", mr: "तारीख" },
  "field.startTime": { en: "Start Time", mr: "सुरुवातीची वेळ" },
  "field.endTime": { en: "End Time", mr: "शेवटची वेळ" },
  "field.programmeTitle": {
    en: "Programme Title",
    mr: "कार्यक्रमाचे नाव",
  },
  "field.location": { en: "Location", mr: "ठिकाण" },
  "field.remarks": { en: "Remarks", mr: "शेरा" },
  "placeholder.programmeTitle": {
    en: "Field visit, meeting, event...",
    mr: "मैदानी भेट, बैठक, कार्यक्रम...",
  },
  "placeholder.location": {
    en: "Ward office, society name, landmark...",
    mr: "वॉर्ड कार्यालय, सोसायटी, महत्वाचे ठिकाण...",
  },
  "placeholder.remarks": {
    en: "Key points, officers to be present, contact person...",
    mr: "मुख्य मुद्दे, उपस्थित अधिकारी, संपर्क व्यक्ती...",
  },
  "btn.addToProgramme": {
    en: "Add to Programme",
    mr: "कार्यक्रमात जोडा",
  },
  "btn.printProgramme": {
    en: "Print Programme",
    mr: "कार्यक्रम छापा",
  },
  "table.noProgramme": {
    en: "No programme added yet.",
    mr: "अद्याप कोणताही कार्यक्रम नोंदलेला नाही.",
  },
  "inward.title": { en: "Inward Register", mr: "आवक नोंदवही" },
  "outward.title": { en: "Outward Register", mr: "जावक नोंदवही" },
  "field.from": {
    en: "From (Name / Office)",
    mr: "कोणाकडून (नाव / कार्यालय)",
  },
  "field.to": {
    en: "To (Name / Office)",
    mr: "कोणाकडे (नाव / कार्यालय)",
  },
  "field.subject": { en: "Subject", mr: "विषय" },
  "field.project": { en: "Project", mr: "प्रकल्प" },
  "field.mode": { en: "Mode", mr: "प्रकार" },
  "field.refNo": { en: "Reference No.", mr: "संदर्भ क्र." },
  "field.officer": {
    en: "Marked to Officer",
    mr: "कोणत्या अधिकाऱ्याकडे",
  },
  "field.attachDocs": {
    en: "Attach documents",
    mr: "दस्तऐवज जोडा",
  },
  "placeholder.fromTo": {
    en: "Name, designation, department...",
    mr: "नाव, हुद्दा, विभाग...",
  },
  "placeholder.subject": {
    en: "Short description of letter / document",
    mr: "पत्र / दस्तऐवजाचा संक्षिप्त मजकूर",
  },
  "placeholder.mode": {
    en: "Hand / Email / Dak / Courier...",
    mr: "हातवाहक / ईमेल / डाक / कुरिअर...",
  },
  "placeholder.refNo": {
    en: "Diary no., email id, dak no...",
    mr: "डायरी क्रमांक, ईमेल आयडी, डाक क्रमांक...",
  },
  "placeholder.officer": {
    en: "PA, PRO, Office staff...",
    mr: "पीए, पीआरओ, कार्यालयीन कर्मचारी...",
  },
  "btn.addEntry": { en: "Add Entry", mr: "नोंद जोडा" },
  "btn.printRegister": { en: "Print Register", mr: "नोंदवही छापा" },
  "entries.title": { en: "Entries", mr: "नोंदी" },
  "entries.total": { en: "Total entries", mr: "एकूण नोंदी" },
  "table.noEntries": {
    en: "No entries yet.",
    mr: "अद्याप कोणतीही नोंद नाही.",
  },
  "docs.none": { en: "No files", mr: "फाईल नाही" },
  "docs.filesCount": { en: "file(s)", mr: "फाईल(स्)" },
  "btn.download": { en: "Download", mr: "डाउनलोड" },
  "btn.print": { en: "Print", mr: "छापा" },
  "projects.title": {
    en: "Constituency Projects",
    mr: "मतदारसंघ प्रकल्प",
  },
  "projects.listTitle": { en: "Project List", mr: "प्रकल्प यादी" },
  "projects.total": { en: "Total", mr: "एकूण" },
  "field.projectName": { en: "Project name", mr: "प्रकल्पाचे नाव" },
  "field.ward": { en: "Ward / Beat", mr: "वॉर्ड / बीट" },
  "field.type": { en: "Type", mr: "प्रकार" },
  "field.status": { en: "Status", mr: "स्थिती" },
  "status.concept": { en: "Concept", mr: "संकल्पना" },
  "status.proposal": { en: "Proposal", mr: "मंजुरी प्रलंबित" },
  "status.inProgress": { en: "In Progress", mr: "प्रगतीपथावर" },
  "status.completed": { en: "Completed", mr: "पूर्ण" },
  "btn.addProject": { en: "Add Project", mr: "प्रकल्प जोडा" },
  "btn.saveProject": { en: "Save Changes", mr: "बदल जतन करा" },
  "btn.printProjects": {
    en: "Print Projects",
    mr: "प्रकल्पांची यादी छापा",
  },
  "btn.edit": { en: "Edit", mr: "संपादन" },
  "btn.delete": { en: "Delete", mr: "हटा" },
  "table.actions": { en: "Actions", mr: "कृती" },
  "users.title": {
    en: "User wise module access",
    mr: "मॉड्यूल प्रवेश (वापरकर्ता निहाय)",
  },
  "users.subtitle": {
    en: "Configure which user can see which module",
    mr: "कोणत्या वापरकर्त्यास कोणते मॉड्यूल दिसेल ते ठरवा",
  },
  "field.userName": { en: "User name", mr: "वापरकर्त्याचे नाव" },
  "field.usernameLogin": {
    en: "Login ID",
    mr: "लॉगिन आयडी",
  },
  "field.role": { en: "Role", mr: "भूमिका" },
  "field.password": { en: "Password", mr: "पासवर्ड" },
  "role.mla": { en: "MLA", mr: "आमदार" },
  "role.pa": { en: "PA", mr: "पीए" },
  "role.staff": { en: "Office Staff", mr: "कार्यालयीन कर्मचारी" },
  "role.guest": { en: "Guest", mr: "अतिथी" },
  "btn.addUser": { en: "Add User", mr: "वापरकर्ता जोडा" },
  "btn.setPassword": { en: "Set / Reset", mr: "सेट / रीसेट" },
  "users.note": {
    en: "Note: Users and passwords are stored only in this browser (localStorage) for demo. In production, connect to a secure backend / authentication system.",
    mr: "नोंद: वापरकर्ते व पासवर्ड केवळ या ब्राउजरमध्ये (localStorage) डेमो साठी साठवले जातात. प्रत्यक्ष वापरासाठी सुरक्षित बॅकएंड / प्रमाणीकरण प्रणालीशी जोडा.",
  },
  "settings.title": { en: "Settings", mr: "सेटिंग्स" },
  "settings.theme": { en: "Theme", mr: "थीम" },
  "settings.themeSub": {
    en: "Switch between Light (white theme) and Dark (black theme).",
    mr: "लाईट (पांढरी) आणि डार्क (काळी) थीममध्ये बदल करा.",
  },
  "signedIn.as": { en: "Signed in as", mr: "लॉग-इन केलेले" },
  "signedIn.office": { en: "Hon. MLA Office", mr: "मा. आमदार कार्यालय" },
  "auth.signInTitle": { en: "Sign in", mr: "साइन इन" },
  "auth.username": { en: "Login ID", mr: "लॉगिन आयडी" },
  "auth.password": { en: "Password", mr: "पासवर्ड" },
  "auth.signIn": { en: "Sign In", mr: "साइन इन" },
  "auth.signOut": { en: "Sign Out", mr: "साइन आउट" },
  "auth.invalid": {
    en: "Invalid login ID or password",
    mr: "लॉगिन आयडी किंवा पासवर्ड अयोग्य आहे",
  },
  "auth.profileTitle": { en: "My Profile", mr: "माझा प्रोफाईल" },
  "auth.currentPassword": {
    en: "Current Password",
    mr: "सध्याचा पासवर्ड",
  },
  "auth.newPassword": { en: "New Password", mr: "नवीन पासवर्ड" },
  "auth.confirmNewPassword": {
    en: "Confirm New Password",
    mr: "नवीन पासवर्ड पुन्हा लिहा",
  },
  "auth.changePassword": {
    en: "Change Password",
    mr: "पासवर्ड बदला",
  },
  "auth.passwordMismatch": {
    en: "New passwords do not match",
    mr: "नवीन पासवर्ड जुळत नाहीत",
  },
  "auth.passwordIncorrect": {
    en: "Current password is incorrect",
    mr: "सध्याचा पासवर्ड चुकीचा आहे",
  },
  "auth.passwordUpdated": {
    en: "Password updated successfully",
    mr: "पासवर्ड यशस्वीरित्या बदलला",
  },
};

const t = (language: Language, key: string): string => {
  const entry = translations[key];
  if (!entry) return key;
  return entry[language];
};

// Utility components

interface CardProps {
  title?: string;
  children: React.ReactNode;
  theme: Theme;
  actions?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, children, theme, actions }) => {
  const base =
    "w-full rounded-2xl border p-4 md:p-6 shadow-sm flex flex-col gap-3";
  const palette =
    theme === "light"
      ? "bg-white border-slate-200"
      : "bg-slate-800 border-slate-700";

  return (
    <section className={`${base} ${palette}`}>
      {(title || actions) && (
        <header className="mb-2 flex items-center justify-between gap-4">
          {title && (
            <h2 className="text-base md:text-lg font-semibold tracking-tight">
              {title}
            </h2>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="text-sm md:text-base leading-relaxed">{children}</div>
    </section>
  );
};

// Data types for modules

interface ProgrammeItem {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  location: string;
  remarks?: string;
}

interface Project {
  id: number;
  name: string;
  ward: string;
  type: string;
  status: "Concept" | "Proposal" | "In Progress" | "Completed";
}

interface AttachmentMeta {
  id: number;
  name: string;
  sizeKb: number;
}

interface RegisterEntry {
  id: number;
  date: string;
  fromTo: string;
  subject: string;
  project: string;
  mode: string;
  refNo: string;
  officer: string;
  attachments: AttachmentMeta[];
}

// Helper: seed demo users

const USERS_STORAGE_KEY = "mla_eoffice_users_v2";
const CURRENT_USER_STORAGE_KEY = "mla_eoffice_current_user_v2";

const seedDefaultUsers = (): MlaUser[] => [
  {
    id: 1,
    name: "Hon. MLA",
    loginId: "mla",
    role: "MLA",
    password: "mla123",
    permissions: {
      dashboard: true,
      daily: true,
      inward: true,
      outward: true,
      projects: true,
    },
  },
  {
    id: 2,
    name: "PA to MLA",
    loginId: "pa",
    role: "PA",
    password: "pa123",
    permissions: {
      dashboard: true,
      daily: true,
      inward: true,
      outward: true,
      projects: true,
    },
  },
  {
    id: 3,
    name: "Office Assistant",
    loginId: "staff",
    role: "Office Staff",
    password: "staff123",
    permissions: {
      dashboard: false,
      daily: false,
      inward: true,
      outward: true,
      projects: false,
    },
  },
];

// Module permission map (for nav hiding)

const modulePermissionMap: Partial<Record<ModuleKey, keyof Permissions>> = {
  dashboard: "dashboard",
  daily: "daily",
  inward: "inward",
  outward: "outward",
  projects: "projects",
};

const isModuleVisibleForUser = (user: MlaUser, key: ModuleKey): boolean => {
  if (key === "profile" || key === "settings") return true;
  if (key === "users") return user.role === "MLA"; // only MLA can manage users

  const permKey = modulePermissionMap[key];
  if (!permKey) return true;
  return Boolean(user.permissions[permKey]);
};

// Dashboard Module

const DashboardModule: React.FC<{ theme: Theme; language: Language }> = ({
  theme,
  language,
}) => {
  const statCard =
    "flex flex-col gap-1 rounded-2xl border p-4 md:p-5 shadow-sm";
  const statPalette =
    theme === "light"
      ? "bg-white border-slate-200"
      : "bg-slate-800 border-slate-700";

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Card theme={theme} title={t(language, "dashboard.today")}>
        <div className="grid gap-3 md:grid-cols-3">
          <div className={`${statCard} ${statPalette}`}>
            <span className="text-xs uppercase tracking-wide text-slate-500">
              {t(language, "dashboard.meetings")}
            </span>
            <span className="text-2xl font-semibold">4</span>
            <span className="text-xs text-slate-500">
              {t(language, "dashboard.meetingsSub")}
            </span>
          </div>
          <div className={`${statCard} ${statPalette}`}>
            <span className="text-xs uppercase tracking-wide text-slate-500">
              {t(language, "dashboard.inout")}
            </span>
            <span className="text-2xl font-semibold">12 / 9</span>
            <span className="text-xs text-slate-500">
              {t(language, "dashboard.inoutSub")}
            </span>
          </div>
          <div className={`${statCard} ${statPalette}`}>
            <span className="text-xs uppercase tracking-wide text-slate-500">
              {t(language, "dashboard.projects")}
            </span>
            <span className="text-2xl font-semibold">27</span>
            <span className="text-xs text-slate-500">
              {t(language, "dashboard.projectsSub")}
            </span>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <Card theme={theme} title={t(language, "dashboard.upcoming")}>
          <ul className="flex flex-col gap-3 text-sm">
            <li className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">Visit - M/East Ward Office</p>
                <p className="text-xs text-slate-500">
                  Review of storm water drain work at Govandi
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                10:30 am
              </span>
            </li>
            <li className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">Meeting with AEML Officials</p>
                <p className="text-xs text-slate-500">
                  Chembur BESS approvals and timelines
                </p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                1:00 pm
              </span>
            </li>
            <li className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">Jansamvad - Local residents</p>
                <p className="text-xs text-slate-500">
                  Public interaction at Deonar playground
                </p>
              </div>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                6:00 pm
              </span>
            </li>
          </ul>
        </Card>

        <Card theme={theme} title={t(language, "dashboard.quickActions")}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <button className="rounded-xl border border-dashed border-slate-300 px-3 py-3 text-left font-medium hover:border-slate-500 hover:bg-slate-50">
              + {t(language, "daily.title")}
            </button>
            <button className="rounded-xl border border-dashed border-slate-300 px-3 py-3 text-left font-medium hover:border-slate-500 hover:bg-slate-50">
              + {t(language, "nav.inward")}
            </button>
            <button className="rounded-xl border border-dashed border-slate-300 px-3 py-3 text-left font-medium hover:border-slate-500 hover:bg-slate-50">
              + {t(language, "btn.addProject")}
            </button>
            <button className="rounded-xl border border-dashed border-slate-300 px-3 py-3 text-left font-medium hover:border-slate-500 hover:bg-slate-50">
              + {t(language, "nav.outward")}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

// Daily Programme

const DailyProgramModule: React.FC<{ theme: Theme; language: Language }> = ({
  theme,
  language,
}) => {
  const [items, setItems] = useState<ProgrammeItem[]>([
    {
      id: 1,
      date: "2025-11-08",
      startTime: "10:30",
      endTime: "11:30",
      title: "Visit - M/East Ward Office",
      location: "M/E Ward Office, Govandi",
      remarks: "Review of storm water drain work",
    },
    {
      id: 2,
      date: "2025-11-08",
      startTime: "13:00",
      endTime: "14:00",
      title: "Meeting with AEML Officials",
      location: "MLA Office, Chembur",
      remarks: "Chembur BESS approvals and timelines",
    },
    {
      id: 3,
      date: "2025-11-08",
      startTime: "18:00",
      endTime: "19:30",
      title: "Jansamvad - Local residents",
      location: "Deonar playground",
      remarks: "Public interaction and grievance collection",
    },
  ]);

  const [form, setForm] = useState<ProgrammeItem>({
    id: 0,
    date: "2025-11-08",
    startTime: "",
    endTime: "",
    title: "",
    location: "",
    remarks: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.startTime || !form.title) return;
    setItems((prev) => [
      ...prev,
      {
        ...form,
        id: Date.now(),
      },
    ]);
    setForm({
      id: 0,
      date: form.date,
      startTime: "",
      endTime: "",
      title: "",
      location: "",
      remarks: "",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const tablePalette =
    theme === "light"
      ? "bg-white border-slate-200"
      : "bg-slate-800 border-slate-700";

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Card
        theme={theme}
        title={t(language, "daily.title")}
        actions={
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium hover:bg-slate-100"
          >
            {t(language, "btn.printProgramme")}
          </button>
        }
      >
        <form
          onSubmit={handleAdd}
          className="grid gap-3 md:grid-cols-4 md:items-end"
        >
          <div className="flex flex-col gap-1 text-sm">
            <label className="text-xs font-medium">{t(language, "field.date")}</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <label className="text-xs font-medium">
              {t(language, "field.startTime")}
            </label>
            <input
              type="time"
              name="startTime"
              value={form.startTime}
              onChange={handleChange}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <label className="text-xs font-medium">
              {t(language, "field.endTime")}
            </label>
            <input
              type="time"
              name="endTime"
              value={form.endTime}
              onChange={handleChange}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>
          <div className="flex flex-col gap-1 text-sm md:col-span-1">
            <label className="text-xs font-medium">
              {t(language, "field.programmeTitle")}
            </label>
            <input
              type="text"
              name="title"
              placeholder={t(language, "placeholder.programmeTitle")}
              value={form.title}
              onChange={handleChange}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>
          <div className="flex flex-col gap-1 text-sm md:col-span-2">
            <label className="text-xs font-medium">
              {t(language, "field.location")}
            </label>
            <input
              type="text"
              name="location"
              placeholder={t(language, "placeholder.location")}
              value={form.location}
              onChange={handleChange}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>
          <div className="flex flex-col gap-1 text-sm md:col-span-2">
            <label className="text-xs font-medium">
              {t(language, "field.remarks")}
            </label>
            <textarea
              name="remarks"
              rows={2}
              placeholder={t(language, "placeholder.remarks")}
              value={form.remarks}
              onChange={handleChange}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>
          <div className="md:col-span-4 flex justify-end">
            <button
              type="submit"
              className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-slate-700"
            >
              {t(language, "btn.addToProgramme")}
            </button>
          </div>
        </form>
      </Card>

      <section
        className={`${tablePalette} w-full rounded-2xl border p-3 md:p-4 shadow-sm`}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold md:text-base">
            {t(language, "daily.register")}
          </h2>
          <span className="text-xs text-slate-500">
            {t(language, "entries.total")}: {items.length}
          </span>
        </div>
        <div className="overflow-auto rounded-xl border border-dashed border-slate-300">
          <table className="min-w-full text-left text-xs md:text-sm">
            <thead className="bg-slate-100/70 text-slate-600">
              <tr>
                <th className="px-3 py-2">{t(language, "field.date")}</th>
                <th className="px-3 py-2">{t(language, "field.startTime")}</th>
                <th className="px-3 py-2">{t(language, "field.programmeTitle")}</th>
                <th className="px-3 py-2">{t(language, "field.location")}</th>
                <th className="px-3 py-2">{t(language, "field.remarks")}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td
                    className="px-3 py-3 text-center text-slate-400"
                    colSpan={5}
                  >
                    {t(language, "table.noProgramme")}
                  </td>
                </tr>
              )}
              {items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 align-top">{item.date}</td>
                  <td className="px-3 py-2 align-top">
                    {item.startTime} {item.endTime && `- ${item.endTime}`}
                  </td>
                  <td className="px-3 py-2 align-top font-medium">
                    {item.title}
                  </td>
                  <td className="px-3 py-2 align-top">{item.location}</td>
                  <td className="px-3 py-2 align-top text-xs text-slate-500">
                    {item.remarks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

// Inward / Outward Register

interface RegisterProps {
  theme: Theme;
  language: Language;
  type: "inward" | "outward";
  projects: Project[];
}

const RegisterModule: React.FC<RegisterProps> = ({
  theme,
  language,
  type,
  projects,
}) => {
  const [entries, setEntries] = useState<RegisterEntry[]>(() => {
    if (type === "inward") {
      return [
        {
          id: 1,
          date: "2025-11-08",
          fromTo: "Assistant Commissioner, M/E Ward",
          subject: "Storm water drain cleaning at Govandi",
          project: "Storm Water Drain Upgradation - Govandi",
          mode: "Hand Delivery",
          refNo: "INW/2025/001",
          officer: "PA to MLA",
          attachments: [
            { id: 11, name: "SWD_Govandi_note.pdf", sizeKb: 320 },
          ],
        },
        {
          id: 2,
          date: "2025-11-08",
          fromTo: "Residents Welfare Association, Deonar",
          subject: "Request for garden improvement",
          project: "Deonar Garden Redevelopment",
          mode: "Email",
          refNo: "INW/2025/002",
          officer: "Office Staff",
          attachments: [],
        },
      ];
    }
    return [
      {
        id: 3,
        date: "2025-11-08",
        fromTo: "Chief Engineer (Roads)",
        subject: "Recommendation for Loop Road at Govandi Station",
        project: "Loop Road at Govandi Station",
        mode: "Email",
        refNo: "OUT/2025/015",
        officer: "Hon. MLA",
        attachments: [
          { id: 21, name: "Recommendation_letter_loop_road.pdf", sizeKb: 210 },
        ],
      },
    ];
  });

  const [entry, setEntry] = useState<RegisterEntry>({
    id: 0,
    date: "2025-11-08",
    fromTo: "",
    subject: "",
    project: "",
    mode: "",
    refNo: "",
    officer: "",
    attachments: [],
  });

  const handleChange = (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | React.ChangeEvent<HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEntry((prev) => ({ ...prev, [name]: value }));
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const list: AttachmentMeta[] = [];
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      list.push({
        id: Date.now() + i,
        name: file.name,
        sizeKb: Math.round(file.size / 1024),
      });
    }
    setEntry((prev) => ({ ...prev, attachments: list }));
    e.target.value = "";
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry.date || !entry.subject) return;
    setEntries((prev) => [...prev, { ...entry, id: Date.now() }]);
    setEntry({
      id: 0,
      date: entry.date,
      fromTo: "",
      subject: "",
      project: "",
      mode: "",
      refNo: "",
      officer: "",
      attachments: [],
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const tablePalette =
    theme === "light"
      ? "bg-white border-slate-200"
      : "bg-slate-800 border-slate-700";

  const heading =
    type === "inward"
      ? t(language, "inward.title")
      : t(language, "outward.title");
  const labelFromTo =
    type === "inward"
      ? t(language, "field.from")
      : t(language, "field.to");

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Card
        theme={theme}
        title={heading}
        actions={
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium hover:bg-slate-100"
          >
            {t(language, "btn.printRegister")}
          </button>
        }
      >
        <form
          onSubmit={handleAdd}
          className="grid gap-3 md:grid-cols-6 md:items-end"
        >
          <div className="flex flex-col gap-1 text-sm md:col-span-1">
            <label className="text-xs font-medium">{t(language, "field.date")}</label>
            <input
              type="date"
              name="date"
              value={entry.date}
              onChange={handleChange}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>
          <div className="flex flex-col gap-1 text-sm md:col-span-2">
            <label className="text-xs font-medium">{labelFromTo}</label>
            <input
              type="text"
              name="fromTo"
              value={entry.fromTo}
              onChange={handleChange}
              placeholder={t(language, "placeholder.fromTo")}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>
          <div className="flex flex-col gap-1 text-sm md:col-span-3">
            <label className="text-xs font-medium">
              {t(language, "field.subject")}
            </label>
            <input
              type="text"
              name="subject"
              value={entry.subject}
              onChange={handleChange}
              placeholder={t(language, "placeholder.subject")}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>
          <div className="flex flex-col gap-1 text-sm md:col-span-2">
            <label className="text-xs font-medium">
              {t(language, "field.project")}
            </label>
            <select
              name="project"
              value={entry.project}
              onChange={handleChange}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="">
                {t(language, "field.project")} ({t(language, "docs.none")})
              </option>
              {projects.map((project) => (
                <option key={project.id} value={project.name}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 text-sm md:col-span-2">
            <label className="text-xs font-medium">
              {t(language, "field.mode")}
            </label>
            <input
              type="text"
              name="mode"
              value={entry.mode}
              onChange={handleChange}
              placeholder={t(language, "placeholder.mode")}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>
          <div className="flex flex-col gap-1 text-sm md:col-span-2">
            <label className="text-xs font-medium">
              {t(language, "field.refNo")}
            </label>
            <input
              type="text"
              name="refNo"
              value={entry.refNo}
              onChange={handleChange}
              placeholder={t(language, "placeholder.refNo")}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>
          <div className="flex flex-col gap-1 text-sm md:col-span-2">
            <label className="text-xs font-medium">
              {t(language, "field.officer")}
            </label>
            <input
              type="text"
              name="officer"
              value={entry.officer}
              onChange={handleChange}
              placeholder={t(language, "placeholder.officer")}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>
          <div className="flex flex-col gap-1 text-sm md:col-span-3">
            <label className="text-xs font-medium">
              {t(language, "field.attachDocs")}
            </label>
            <input
              type="file"
              multiple
              onChange={handleFiles}
              className="w-full rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs file:mr-3 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:border-slate-500"
            />
            <p className="text-xs text-slate-500">
              Selected files will be linked to this entry. Integrate with your
              backend / cloud storage and Bhashini translation APIs for
              multilingual processing.
            </p>
          </div>
          <div className="md:col-span-6 flex justify-end">
            <button
              type="submit"
              className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-slate-700"
            >
              {t(language, "btn.addEntry")}
            </button>
          </div>
        </form>
      </Card>

      <section
        className={`${tablePalette} w-full rounded-2xl border p-3 md:p-4 shadow-sm`}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold md:text-base">
            {t(language, "entries.title")}
          </h2>
          <span className="text-xs text-slate-500">
            {t(language, "entries.total")}: {entries.length}
          </span>
        </div>
        <div className="overflow-auto rounded-xl border border-dashed border-slate-300">
          <table className="min-w-full text-left text-xs md:text-sm">
            <thead className="bg-slate-100/70 text-slate-600">
              <tr>
                <th className="px-3 py-2">{t(language, "field.date")}</th>
                <th className="px-3 py-2">{t(language, "field.from")}</th>
                <th className="px-3 py-2">{t(language, "field.subject")}</th>
                <th className="px-3 py-2">{t(language, "field.project")}</th>
                <th className="px-3 py-2">{t(language, "field.mode")}</th>
                <th className="px-3 py-2">{t(language, "field.refNo")}</th>
                <th className="px-3 py-2">{t(language, "field.officer")}</th>
                <th className="px-3 py-2">{t(language, "field.attachDocs")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr>
                  <td
                    className="px-3 py-3 text-center text-slate-400"
                    colSpan={8}
                  >
                    {t(language, "table.noEntries")}
                  </td>
                </tr>
              )}
              {entries.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 align-top">{row.date}</td>
                  <td className="px-3 py-2 align-top">{row.fromTo}</td>
                  <td className="px-3 py-2 align-top font-medium">
                    {row.subject}
                  </td>
                  <td className="px-3 py-2 align-top">{row.project}</td>
                  <td className="px-3 py-2 align-top">{row.mode}</td>
                  <td className="px-3 py-2 align-top">{row.refNo}</td>
                  <td className="px-3 py-2 align-top">{row.officer}</td>
                  <td className="px-3 py-2 align-top">
                    {row.attachments.length === 0 ? (
                      <span className="text-[11px] text-slate-400">
                        {t(language, "docs.none")}
                      </span>
                    ) : (
                      <div className="flex flex-col gap-1 text-[11px]">
                        <span className="text-slate-500">
                          {row.attachments.length} {t(language, "docs.filesCount")}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          <button className="rounded-full border border-slate-300 px-2 py-1 hover:bg-slate-100">
                            {t(language, "btn.download")}
                          </button>
                          <button className="rounded-full border border-slate-300 px-2 py-1 hover:bg-slate-100">
                            {t(language, "btn.print")}
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

// Projects module

const ProjectsModule: React.FC<{
  theme: Theme;
  language: Language;
  projects: Project[];
  onAddProject: (data: Omit<Project, "id">) => void;
  onUpdateProject: (id: number, data: Omit<Project, "id">) => void;
  onDeleteProject: (id: number) => void;
}> = ({ theme, language, projects, onAddProject, onUpdateProject, onDeleteProject }) => {
  const [form, setForm] = useState<
    Omit<Project, "id" | "status"> & {
      status: Project["status"];
    }
  >({
    name: "",
    ward: "",
    type: "",
    status: "Concept",
  });

  const [editingId, setEditingId] = useState<number | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm({ name: "", ward: "", type: "", status: "Concept" });
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editingId !== null) {
      onUpdateProject(editingId, { ...form });
    } else {
      onAddProject({ ...form });
    }
    resetForm();
  };

  const handlePrintAll = () => {
    window.print();
  };

  const handleEditRow = (project: Project) => {
    setEditingId(project.id);
    setForm({
      name: project.name,
      ward: project.ward,
      type: project.type,
      status: project.status,
    });
  };

  const handleDeleteRow = (id: number) => {
    const exists = projects.some((p) => p.id === id);
    console.assert(exists, "Trying to delete project that does not exist");
    if (!exists) return;
    if (window.confirm("Delete this project?")) {
      onDeleteProject(id);
      if (editingId === id) {
        resetForm();
      }
    }
  };

  const handlePrintRow = () => {
    window.print();
  };

  const tablePalette =
    theme === "light"
      ? "bg-white border-slate-200"
      : "bg-slate-800 border-slate-700";

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Card
        theme={theme}
        title={t(language, "projects.title")}
        actions={
          <button
            type="button"
            onClick={handlePrintAll}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium hover:bg-slate-100"
          >
            {t(language, "btn.printProjects")}
          </button>
        }
      >
        <form
          onSubmit={handleSubmit}
          className="grid gap-3 md:grid-cols-5 md:items-end"
        >
          <div className="flex flex-col gap-1 text-sm md:col-span-2">
            <label className="text-xs font-medium">
              {t(language, "field.projectName")}
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Loop road at Govandi Station, BESS at Chembur..."
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <label className="text-xs font-medium">
              {t(language, "field.ward")}
            </label>
            <input
              type="text"
              name="ward"
              value={form.ward}
              onChange={handleChange}
              placeholder="M/E Ward, Beat 140..."
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <label className="text-xs font-medium">
              {t(language, "field.type")}
            </label>
            <input
              type="text"
              name="type"
              value={form.type}
              onChange={handleChange}
              placeholder="Road / Garden / Health / Education..."
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <label className="text-xs font-medium">
              {t(language, "field.status")}
            </label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="Concept">
                {t(language, "status.concept")}
              </option>
              <option value="Proposal">
                {t(language, "status.proposal")}
              </option>
              <option value="In Progress">
                {t(language, "status.inProgress")}
              </option>
              <option value="Completed">
                {t(language, "status.completed")}
              </option>
            </select>
          </div>
          <div className="md:col-span-5 flex items-center justify-end gap-2">
            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-slate-100"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-slate-700"
            >
              {editingId !== null
                ? t(language, "btn.saveProject")
                : t(language, "btn.addProject")}
            </button>
          </div>
        </form>
      </Card>

      <section
        className={`${tablePalette} w-full rounded-2xl border p-3 md:p-4 shadow-sm`}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold md:text-base">
            {t(language, "projects.listTitle")}
          </h2>
          <span className="text-xs text-slate-500">
            {t(language, "projects.total")}: {projects.length}
          </span>
        </div>
        <div className="overflow-auto rounded-xl border border-dashed border-slate-300">
          <table className="min-w-full text-left text-xs md:text-sm">
            <thead className="bg-slate-100/70 text-slate-600">
              <tr>
                <th className="px-3 py-2">{t(language, "field.projectName")}</th>
                <th className="px-3 py-2">{t(language, "field.ward")}</th>
                <th className="px-3 py-2">{t(language, "field.type")}</th>
                <th className="px-3 py-2">{t(language, "field.status")}</th>
                <th className="px-3 py-2 text-right">{t(language, "table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 && (
                <tr>
                  <td
                    className="px-3 py-3 text-center text-slate-400"
                    colSpan={5}
                  >
                    {t(language, "table.noEntries")}
                  </td>
                </tr>
              )}
              {projects.map((project) => (
                <tr key={project.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 align-top font-medium">
                    {project.name}
                  </td>
                  <td className="px-3 py-2 align-top">{project.ward}</td>
                  <td className="px-3 py-2 align-top">{project.type}</td>
                  <td className="px-3 py-2 align-top">{project.status}</td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-wrap justify-end gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleEditRow(project)}
                        className="rounded-full border border-slate-300 px-2 py-1 hover:bg-slate-100"
                      >
                        {t(language, "btn.edit")}
                      </button>
                      <button
                        type="button"
                        onClick={handlePrintRow}
                        className="rounded-full border border-slate-300 px-2 py-1 hover:bg-slate-100"
                      >
                        {t(language, "btn.print")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(project.id)}
                        className="rounded-full border border-rose-300 px-2 py-1 text-rose-700 hover:bg-rose-50"
                      >
                        {t(language, "btn.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

// Users & Roles module

interface UsersRolesProps {
  theme: Theme;
  language: Language;
  currentUser: MlaUser;
  users: MlaUser[];
  onUpdateUser: (user: MlaUser) => void;
  onAddUser: (user: MlaUser) => void;
}

const UsersRolesModule: React.FC<UsersRolesProps> = ({
  theme,
  language,
  currentUser,
  users,
  onUpdateUser,
  onAddUser,
}) => {
  const [newName, setNewName] = useState<string>("");
  const [newLoginId, setNewLoginId] = useState<string>("");
  const [newRole, setNewRole] = useState<Role>("Office Staff");

  const tablePalette =
    theme === "light"
      ? "bg-white border-slate-200"
      : "bg-slate-800 border-slate-700";

  if (currentUser.role !== "MLA") {
    return (
      <section
        className={`${tablePalette} w-full rounded-2xl border p-4 md:p-6 shadow-sm`}
      >
        <p className="text-sm text-slate-500">
          Only MLA is allowed to manage users and roles.
        </p>
      </section>
    );
  }

  const togglePermission = (user: MlaUser, key: keyof Permissions) => {
    const updated: MlaUser = {
      ...user,
      permissions: {
        ...user.permissions,
        [key]: !user.permissions[key],
      },
    };
    onUpdateUser(updated);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    const loginId = newLoginId.trim();
    if (!name || !loginId) return;
    const exists = users.some((u) => u.loginId === loginId);
    console.assert(!exists, "Login ID should be unique");
    if (exists) return;

    const newUser: MlaUser = {
      id: Date.now(),
      name,
      loginId,
      role: newRole,
      password: "password",
      permissions: {
        dashboard: false,
        daily: false,
        inward: false,
        outward: false,
        projects: false,
      },
    };
    onAddUser(newUser);
    setNewName("");
    setNewLoginId("");
    setNewRole("Office Staff");
  };

  const handleResetPassword = (user: MlaUser) => {
    const newPass = window.prompt("Enter new password for " + user.loginId);
    if (!newPass) return;
    const updated: MlaUser = { ...user, password: newPass };
    onUpdateUser(updated);
  };

  return (
    <section
      className={`${tablePalette} w-full rounded-2xl border p-3 md:p-4 shadow-sm`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold md:text-base">
          {t(language, "users.title")}
        </h2>
        <span className="text-xs text-slate-500">
          {t(language, "users.subtitle")}
        </span>
      </div>

      <form
        onSubmit={handleAddUser}
        className="mb-3 flex flex-col gap-2 rounded-2xl border border-dashed border-slate-300 p-3 text-xs md:flex-row md:items-end md:gap-3"
      >
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-[11px] font-medium">
            {t(language, "field.userName")}
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Office Assistant, PRO, Data Entry"
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-slate-500"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-[11px] font-medium">
            {t(language, "field.usernameLogin")}
          </label>
          <input
            type="text"
            value={newLoginId}
            onChange={(e) => setNewLoginId(e.target.value)}
            placeholder="login id (unique)"
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-slate-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium">
            {t(language, "field.role")}
          </label>
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as Role)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none focus:border-slate-500"
          >
            <option value="MLA">{t(language, "role.mla")}</option>
            <option value="PA">{t(language, "role.pa")}</option>
            <option value="Office Staff">{t(language, "role.staff")}</option>
            <option value="Guest">{t(language, "role.guest")}</option>
          </select>
        </div>
        <div className="flex justify-end md:justify-start">
          <button
            type="submit"
            className="mt-1 rounded-full bg-slate-900 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-white hover:bg-slate-700"
          >
            {t(language, "btn.addUser")}
          </button>
        </div>
      </form>

      <div className="overflow-auto rounded-xl border border-dashed border-slate-300">
        <table className="min-w-full text-left text-xs md:text-sm">
          <thead className="bg-slate-100/70 text-slate-600">
            <tr>
              <th className="px-3 py-2">{t(language, "field.userName")}</th>
              <th className="px-3 py-2">{t(language, "field.usernameLogin")}</th>
              <th className="px-3 py-2">{t(language, "field.role")}</th>
              <th className="px-3 py-2">Dashboard</th>
              <th className="px-3 py-2">{t(language, "daily.title")}</th>
              <th className="px-3 py-2">{t(language, "nav.inward")}</th>
              <th className="px-3 py-2">{t(language, "nav.outward")}</th>
              <th className="px-3 py-2">{t(language, "nav.projects")}</th>
              <th className="px-3 py-2">{t(language, "field.password")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-slate-100">
                <td className="px-3 py-2 align-top font-medium">{user.name}</td>
                <td className="px-3 py-2 align-top">{user.loginId}</td>
                <td className="px-3 py-2 align-top">{user.role}</td>
                {(
                  [
                    "dashboard",
                    "daily",
                    "inward",
                    "outward",
                    "projects",
                  ] as const
                ).map((key) => (
                  <td key={key} className="px-3 py-2 align-top">
                    <input
                      type="checkbox"
                      checked={user.permissions[key]}
                      onChange={() => togglePermission(user, key)}
                    />
                  </td>
                ))}
                <td className="px-3 py-2 align-top">
                  <button
                    type="button"
                    onClick={() => handleResetPassword(user)}
                    className="rounded-full border border-slate-300 px-3 py-1 text-[11px] hover:bg-slate-100"
                  >
                    {t(language, "btn.setPassword")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        {t(language, "users.note")}
      </p>
    </section>
  );
};

// Profile module

interface ProfileModuleProps {
  theme: Theme;
  language: Language;
  currentUser: MlaUser;
  onChangePassword: (userId: number, newPassword: string) => void;
}

const ProfileModule: React.FC<ProfileModuleProps> = ({
  theme,
  language,
  currentUser,
  onChangePassword,
}) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const cardPalette =
    theme === "light"
      ? "bg-white border-slate-200"
      : "bg-slate-800 border-slate-700";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsError(false);

    if (newPassword !== confirmPassword) {
      setIsError(true);
      setMessage(t(language, "auth.passwordMismatch"));
      return;
    }

    if (currentPassword !== currentUser.password) {
      setIsError(true);
      setMessage(t(language, "auth.passwordIncorrect"));
      return;
    }

    onChangePassword(currentUser.id, newPassword);
    setMessage(t(language, "auth.passwordUpdated"));
    setIsError(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <section
      className={`${cardPalette} w-full rounded-2xl border p-4 md:p-6 shadow-sm`}
    >
      <h2 className="mb-4 text-base font-semibold md:text-lg">
        {t(language, "auth.profileTitle")}
      </h2>
      <div className="mb-4 text-sm">
        <p className="font-medium">{currentUser.name}</p>
        <p className="text-xs text-slate-500">
          {currentUser.loginId} ({currentUser.role})
        </p>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-3 md:max-w-md">
        <div className="flex flex-col gap-1 text-sm">
          <label className="text-xs font-medium">
            {t(language, "auth.currentPassword")}
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>
        <div className="flex flex-col gap-1 text-sm">
          <label className="text-xs font-medium">
            {t(language, "auth.newPassword")}
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>
        <div className="flex flex-col gap-1 text-sm">
          <label className="text-xs font-medium">
            {t(language, "auth.confirmNewPassword")}
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>
        {message && (
          <p
            className={`text-xs ${
              isError ? "text-rose-600" : "text-emerald-600"
            }`}
          >
            {message}
          </p>
        )}
        <div className="mt-1 flex justify-start">
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-slate-700"
          >
            {t(language, "auth.changePassword")}
          </button>
        </div>
      </form>
    </section>
  );
};

// Settings module - theme etc.

const SettingsModule: React.FC<{
  theme: Theme;
  language: Language;
  onToggleTheme: () => void;
}> = ({ theme, language, onToggleTheme }) => {
  const cardPalette =
    theme === "light"
      ? "bg-white border-slate-200"
      : "bg-slate-800 border-slate-700";

  return (
    <section
      className={`${cardPalette} w-full rounded-2xl border p-4 md:p-6 shadow-sm`}
    >
      <h2 className="mb-4 text-base font-semibold md:text-lg">
        {t(language, "settings.title")}
      </h2>
      <div className="flex flex-col gap-4 text-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">{t(language, "settings.theme")}</p>
            <p className="text-xs text-slate-500">
              {t(language, "settings.themeSub")}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-slate-100"
          >
            {theme === "light"
              ? t(language, "btn.darkMode")
              : t(language, "btn.lightMode")}
          </button>
        </div>
      </div>
    </section>
  );
};

// Sign in screen

interface SignInProps {
  theme: Theme;
  language: Language;
  onSignIn: (loginId: string, password: string) => void;
  error: string | null;
}

const SignInScreen: React.FC<SignInProps> = ({
  theme,
  language,
  onSignIn,
  error,
}) => {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");

  const cardPalette =
    theme === "light"
      ? "bg-white border-slate-200"
      : "bg-slate-800 border-slate-700";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSignIn(loginId, password);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${
      theme === "light" ? "bg-slate-100" : "bg-slate-900"
    }`}>
      <section
        className={`${cardPalette} w-full max-w-sm rounded-2xl border p-5 shadow-sm`}
      >
        <h1 className="mb-1 text-lg font-semibold">
          {t(language, "auth.signInTitle")}
        </h1>
        <p className="mb-4 text-xs text-slate-500">
          Demo users: mla / mla123, pa / pa123, staff / staff123
        </p>
        <form onSubmit={handleSubmit} className="grid gap-3 text-sm">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">
              {t(language, "auth.username")}
            </label>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">
              {t(language, "auth.password")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>
          {error && (
            <p className="text-xs text-rose-600">{error}</p>
          )}
          <button
            type="submit"
            className="mt-1 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-slate-700"
          >
            {t(language, "auth.signIn")}
          </button>
        </form>
      </section>
    </div>
  );
};

// Root App

const navItems: NavItem[] = [
  { key: "dashboard", labelKey: "nav.dashboard" },
  { key: "daily", labelKey: "nav.daily" },
  { key: "inward", labelKey: "nav.inward" },
  { key: "outward", labelKey: "nav.outward" },
  { key: "projects", labelKey: "nav.projects" },
  { key: "users", labelKey: "nav.users" },
  { key: "profile", labelKey: "nav.profile" },
  { key: "settings", labelKey: "nav.settings" },
];

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>("light");
  const [language, setLanguage] = useState<Language>("en");
  const [active, setActive] = useState<ModuleKey>("dashboard");
  const [users, setUsers] = useState<MlaUser[]>([]);
  const [currentUser, setCurrentUser] = useState<MlaUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([
    {
      id: 1,
      name: "Loop Road at Govandi Station",
      ward: "M/E Ward",
      type: "Road",
      status: "In Progress",
    },
    {
      id: 2,
      name: "Storm Water Drain Upgradation - Govandi",
      ward: "M/E Ward",
      type: "Storm Water Drain",
      status: "Proposal",
    },
    {
      id: 3,
      name: "Deonar Garden Redevelopment",
      ward: "M/E Ward",
      type: "Garden",
      status: "Concept",
    },
  ]);

  // Load users and current user from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedUsers = window.localStorage.getItem(USERS_STORAGE_KEY);
      let initialUsers: MlaUser[];
      if (storedUsers) {
        initialUsers = JSON.parse(storedUsers) as MlaUser[];
      } else {
        initialUsers = seedDefaultUsers();
        window.localStorage.setItem(
          USERS_STORAGE_KEY,
          JSON.stringify(initialUsers)
        );
      }
      setUsers(initialUsers);

      const storedLoginId = window.localStorage.getItem(
        CURRENT_USER_STORAGE_KEY
      );
      if (storedLoginId) {
        const found = initialUsers.find((u) => u.loginId === storedLoginId);
        if (found) {
          setCurrentUser(found);
        }
      }
    } catch (err) {
      console.error("Failed to load users", err);
      const fallback = seedDefaultUsers();
      setUsers(fallback);
    }
  }, []);

  // Persist users whenever they change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (err) {
      console.error("Failed to save users", err);
    }
  }, [users]);

  // Simple runtime "tests" for permissions and translations
  useEffect(() => {
    const seed = seedDefaultUsers();
    const mla = seed.find((u) => u.role === "MLA");
    const staff = seed.find((u) => u.role === "Office Staff");
    if (mla && staff) {
      console.assert(
        isModuleVisibleForUser(mla, "users"),
        "MLA should see Users module"
      );
      console.assert(
        !isModuleVisibleForUser(staff, "users"),
        "Non-MLA should not see Users module"
      );
    }
    console.assert(
      Boolean(translations["nav.dashboard"]),
      "Dashboard translation key should exist"
    );
  }, []);

  const basePalette =
    theme === "light"
      ? "bg-slate-100 text-slate-900"
      : "bg-slate-900 text-slate-100";

  const sidebarPalette =
    theme === "light"
      ? "bg-white border-slate-200"
      : "bg-slate-950 border-slate-800";

  const topbarPalette =
    theme === "light"
      ? "bg-white/80 border-slate-200"
      : "bg-slate-950/80 border-slate-800";

  const handleToggleTheme = () =>
    setTheme((tTheme) => (tTheme === "light" ? "dark" : "light"));

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "en" ? "mr" : "en"));
  };

  const handleSignIn = (loginId: string, password: string) => {
    const user = users.find(
      (u) => u.loginId === loginId.trim() && u.password === password
    );
    if (!user) {
      setAuthError(t(language, "auth.invalid"));
      setCurrentUser(null);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
      }
      return;
    }
    setCurrentUser(user);
    setAuthError(null);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, user.loginId);
    }
    // reset active module to something user can actually see
    const visible = navItems.filter((n) => isModuleVisibleForUser(user, n.key));
    if (visible.length > 0) {
      setActive(visible[0].key);
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    }
  };

  const handleAddProject = (data: Omit<Project, "id">) => {
    setProjects((prev) => [...prev, { id: Date.now(), ...data }]);
  };

  const handleUpdateProject = (id: number, data: Omit<Project, "id">) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
  };

  const handleDeleteProject = (id: number) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdateUser = (updated: MlaUser) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setCurrentUser((prev) => (prev && prev.id === updated.id ? updated : prev));
  };

  const handleAddUser = (user: MlaUser) => {
    setUsers((prev) => [...prev, user]);
  };

  const handleProfilePasswordChange = (userId: number, newPassword: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const updated: MlaUser = { ...target, password: newPassword };
    handleUpdateUser(updated);
  };

  // Ensure active module is always visible for current user
  useEffect(() => {
    if (!currentUser) return;
    const visible = navItems.filter((n) => isModuleVisibleForUser(currentUser, n.key));
    if (visible.length === 0) return;
    const isActiveVisible = visible.some((n) => n.key === active);
    if (!isActiveVisible) {
      setActive(visible[0].key);
    }
  }, [currentUser, active]);

  const renderModule = () => {
    if (!currentUser) return null;
    switch (active) {
      case "dashboard":
        return <DashboardModule theme={theme} language={language} />;
      case "daily":
        return <DailyProgramModule theme={theme} language={language} />;
      case "inward":
        return (
          <RegisterModule
            theme={theme}
            language={language}
            type="inward"
            projects={projects}
          />
        );
      case "outward":
        return (
          <RegisterModule
            theme={theme}
            language={language}
            type="outward"
            projects={projects}
          />
        );
      case "projects":
        return (
          <ProjectsModule
            theme={theme}
            language={language}
            projects={projects}
            onAddProject={handleAddProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
          />
        );
      case "users":
        return (
          <UsersRolesModule
            theme={theme}
            language={language}
            currentUser={currentUser}
            users={users}
            onUpdateUser={handleUpdateUser}
            onAddUser={handleAddUser}
          />
        );
      case "profile":
        return (
          <ProfileModule
            theme={theme}
            language={language}
            currentUser={currentUser}
            onChangePassword={handleProfilePasswordChange}
          />
        );
      case "settings":
        return (
          <SettingsModule
            theme={theme}
            language={language}
            onToggleTheme={handleToggleTheme}
          />
        );
      default:
        return null;
    }
  };

  if (!currentUser) {
    return (
      <SignInScreen
        theme={theme}
        language={language}
        onSignIn={handleSignIn}
        error={authError}
      />
    );
  }

  const visibleNavItems = navItems.filter((item) =>
    isModuleVisibleForUser(currentUser, item.key)
  );

  return (
    <div className={`min-h-screen ${basePalette}`}>
      <div className="flex h-screen max-h-screen overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`hidden w-64 flex-shrink-0 flex-col border-r ${sidebarPalette} md:flex`}
        >
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-xs font-bold text-white">
              MLA
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-widest text-slate-500">
                {t(language, "sidebar.eoffice")}
              </span>
              <span className="text-sm font-semibold">
                {t(language, "app.subtitle")}
              </span>
            </div>
          </div>
          <nav className="mt-3 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
            {visibleNavItems.map((item) => {
              const isActive = active === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActive(item.key)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium md:text-sm ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-700"
                  }`}
                >
                  <span>{t(language, item.labelKey)}</span>
                  {isActive && <span className="text-[10px]">●</span>}
                </button>
              );
            })}
          </nav>
          <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
            <p>{t(language, "signedIn.as")}</p>
            <p className="font-medium">
              {currentUser.name} ({currentUser.loginId})
            </p>
            <p className="mt-1 text-[11px]">{t(language, "signedIn.office")}</p>
          </div>
        </aside>

        {/* Main area */}
        <main className="flex flex-1 flex-col">
          {/* Top bar */}
          <header
            className={`flex items-center justify-between border-b ${topbarPalette} px-4 py-3 md:px-6`}
          >
            <div className="flex flex-1 items-center justify-between gap-4">
              <div className="hidden items-baseline gap-2 md:flex">
                <span className="text-xs uppercase tracking-widest text-slate-500">
                  {t(language, "top.module")}
                </span>
                <span className="text-sm font-semibold">
                  {t(
                    language,
                    navItems.find((n) => n.key === active)?.labelKey || ""
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-medium uppercase tracking-wide hover:bg-slate-100"
                >
                  {language === "en"
                    ? t(language, "btn.lang.mr")
                    : t(language, "btn.lang.en")}
                </button>
                <button
                  type="button"
                  onClick={handleToggleTheme}
                  className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-medium uppercase tracking-wide hover:bg-slate-100"
                >
                  {theme === "light"
                    ? t(language, "btn.darkMode")
                    : t(language, "btn.lightMode")}
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-medium uppercase tracking-wide hover:bg-slate-100"
                >
                  {t(language, "auth.signOut")}
                </button>
                <div className="hidden flex-col items-end md:flex">
                  <span className="text-[11px] text-slate-500">
                    {t(language, "top.today")}
                  </span>
                  <span className="text-xs font-semibold">08 Nov 2025</span>
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-3 py-3 md:px-6 md:py-5">
            <div className="mx-auto flex max-w-6xl flex-col gap-4 md:gap-6">
              {renderModule()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
