import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "ar";

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

// ─── Translations ─────────────────────────────────────────────────────────────
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.chat": "Control Center",
    "nav.proposals": "Proposals",
    "nav.approvals": "Approvals",
    "nav.notifications": "Notifications",
    "nav.agents": "Agents",
    "nav.audit": "Audit Log",
    "nav.memory": "Memory",
    "nav.companies": "Companies",
    // Company
    "company.switcher": "Switch Company",
    "company.add": "Add Company",
    "company.select": "Select a company",
    "company.name": "Company Name",
    "company.industry": "Industry",
    "company.website": "Website",
    "company.description": "Description",
    // Proposals
    "proposal.new": "New Proposal",
    "proposal.title": "Proposal Title",
    "proposal.type": "Type",
    "proposal.budget": "Budget",
    "proposal.timeline": "Timeline",
    "proposal.status.draft": "Draft",
    "proposal.status.deliberating": "Deliberating",
    "proposal.status.pending_approval": "Pending Approval",
    "proposal.status.approved": "Approved",
    "proposal.status.rejected": "Rejected",
    "proposal.status.revised": "Revised",
    "proposal.status.executing": "Executing",
    "proposal.status.completed": "Completed",
    "proposal.deliberate": "Start Deliberation",
    "proposal.deliberating_msg": "Running multi-agent deliberation with 13 specialized agents...",
    // Approvals
    "approval.approve": "Approve",
    "approval.reject": "Reject",
    "approval.revise": "Request Revision",
    "approval.pending": "Pending Approvals",
    "approval.reason": "Reason",
    "approval.notes": "Revision Notes",
    "approval.consensus": "Consensus Score",
    "approval.agents_support": "Agents Support",
    // Agents
    "agent.deliberation": "Deliberation",
    "agent.confidence": "Confidence",
    "agent.voted_for": "Supports",
    "agent.concerns": "Concerns",
    "agent.suggestions": "Suggestions",
    // General
    "general.loading": "Loading...",
    "general.save": "Save",
    "general.cancel": "Cancel",
    "general.create": "Create",
    "general.edit": "Edit",
    "general.delete": "Delete",
    "general.view": "View",
    "general.back": "Back",
    "general.submit": "Submit",
    "general.search": "Search",
    "general.filter": "Filter",
    "general.all": "All",
    "general.yes": "Yes",
    "general.no": "No",
    "general.required": "Required",
    "general.optional": "Optional",
    "general.success": "Success",
    "general.error": "Error",
    "general.confirm": "Confirm",
    "general.close": "Close",
    "general.noData": "No data available",
    "general.refresh": "Refresh",
    // Chat
    "chat.placeholder": "Ask your marketing AI...",
    "chat.send": "Send",
    "chat.empty": "Start a conversation with your marketing AI team",
    "chat.suggested.1": "Create a Q2 marketing strategy",
    "chat.suggested.2": "Analyze our competitors",
    "chat.suggested.3": "Optimize our ad spend",
    "chat.suggested.4": "Build a content calendar",
    // Notifications
    "notification.markRead": "Mark as Read",
    "notification.markAllRead": "Mark All Read",
    "notification.empty": "No notifications",
    "notification.unread": "unread",
    // Dashboard
    "dashboard.overview": "Overview",
    "dashboard.activeProposals": "Active Proposals",
    "dashboard.pendingApprovals": "Pending Approvals",
    "dashboard.totalAgents": "Total Agents",
    "dashboard.recentActivity": "Recent Activity",
    // Auth
    "auth.signIn": "Sign In",
    "auth.signOut": "Sign Out",
    "auth.welcome": "Welcome to AI Marketing OS",
    "auth.subtitle": "Your intelligent multi-agent marketing platform",
  },
  ar: {
    // Navigation
    "nav.dashboard": "لوحة التحكم",
    "nav.chat": "مركز التحكم",
    "nav.proposals": "المقترحات",
    "nav.approvals": "الموافقات",
    "nav.notifications": "الإشعارات",
    "nav.agents": "الوكلاء",
    "nav.audit": "سجل المراجعة",
    "nav.memory": "الذاكرة",
    "nav.companies": "الشركات",
    // Company
    "company.switcher": "تغيير الشركة",
    "company.add": "إضافة شركة",
    "company.select": "اختر شركة",
    "company.name": "اسم الشركة",
    "company.industry": "القطاع",
    "company.website": "الموقع الإلكتروني",
    "company.description": "الوصف",
    // Proposals
    "proposal.new": "مقترح جديد",
    "proposal.title": "عنوان المقترح",
    "proposal.type": "النوع",
    "proposal.budget": "الميزانية",
    "proposal.timeline": "الجدول الزمني",
    "proposal.status.draft": "مسودة",
    "proposal.status.deliberating": "قيد المداولة",
    "proposal.status.pending_approval": "في انتظار الموافقة",
    "proposal.status.approved": "موافق عليه",
    "proposal.status.rejected": "مرفوض",
    "proposal.status.revised": "تمت المراجعة",
    "proposal.status.executing": "قيد التنفيذ",
    "proposal.status.completed": "مكتمل",
    "proposal.deliberate": "بدء المداولة",
    "proposal.deliberating_msg": "جاري تشغيل المداولة متعددة الوكلاء مع 13 وكيل متخصص...",
    // Approvals
    "approval.approve": "موافقة",
    "approval.reject": "رفض",
    "approval.revise": "طلب مراجعة",
    "approval.pending": "الموافقات المعلقة",
    "approval.reason": "السبب",
    "approval.notes": "ملاحظات المراجعة",
    "approval.consensus": "درجة الإجماع",
    "approval.agents_support": "دعم الوكلاء",
    // Agents
    "agent.deliberation": "المداولة",
    "agent.confidence": "الثقة",
    "agent.voted_for": "يدعم",
    "agent.concerns": "المخاوف",
    "agent.suggestions": "الاقتراحات",
    // General
    "general.loading": "جاري التحميل...",
    "general.save": "حفظ",
    "general.cancel": "إلغاء",
    "general.create": "إنشاء",
    "general.edit": "تعديل",
    "general.delete": "حذف",
    "general.view": "عرض",
    "general.back": "رجوع",
    "general.submit": "إرسال",
    "general.search": "بحث",
    "general.filter": "تصفية",
    "general.all": "الكل",
    "general.yes": "نعم",
    "general.no": "لا",
    "general.required": "مطلوب",
    "general.optional": "اختياري",
    "general.success": "نجاح",
    "general.error": "خطأ",
    "general.confirm": "تأكيد",
    "general.close": "إغلاق",
    "general.noData": "لا توجد بيانات",
    "general.refresh": "تحديث",
    // Chat
    "chat.placeholder": "اسأل فريق التسويق الذكي...",
    "chat.send": "إرسال",
    "chat.empty": "ابدأ محادثة مع فريق التسويق الذكي",
    "chat.suggested.1": "أنشئ استراتيجية تسويقية للربع الثاني",
    "chat.suggested.2": "حلل منافسينا",
    "chat.suggested.3": "حسّن إنفاقنا الإعلاني",
    "chat.suggested.4": "أنشئ تقويم محتوى",
    // Notifications
    "notification.markRead": "تحديد كمقروء",
    "notification.markAllRead": "تحديد الكل كمقروء",
    "notification.empty": "لا توجد إشعارات",
    "notification.unread": "غير مقروء",
    // Dashboard
    "dashboard.overview": "نظرة عامة",
    "dashboard.activeProposals": "المقترحات النشطة",
    "dashboard.pendingApprovals": "الموافقات المعلقة",
    "dashboard.totalAgents": "إجمالي الوكلاء",
    "dashboard.recentActivity": "النشاط الأخير",
    // Auth
    "auth.signIn": "تسجيل الدخول",
    "auth.signOut": "تسجيل الخروج",
    "auth.welcome": "مرحباً بك في نظام التسويق الذكي",
    "auth.subtitle": "منصة التسويق الذكية متعددة الوكلاء",
  },
};

const I18nContext = createContext<I18nContextValue>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
  isRTL: false,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const stored = localStorage.getItem("ai_marketing_lang");
    return (stored === "ar" || stored === "en") ? stored : "en";
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("ai_marketing_lang", newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = newLang;
  };

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key: string): string => {
    return translations[lang][key] ?? translations["en"][key] ?? key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, isRTL: lang === "ar" }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
