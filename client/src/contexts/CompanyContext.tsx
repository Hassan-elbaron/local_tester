import React, { createContext, useContext, useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

interface Company {
  id: number;
  name: string;
  nameAr: string | null;
  industry: string | null;
  primaryColor: string | null;
}

interface CompanyContextValue {
  currentCompany: Company | null;
  setCurrentCompany: (company: Company) => void;
  companies: Company[];
  isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextValue>({
  currentCompany: null,
  setCurrentCompany: () => {},
  companies: [],
  isLoading: false,
});

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { data: companies = [], isLoading } = trpc.companies.list.useQuery();
  const [currentCompany, setCurrentCompanyState] = useState<Company | null>(null);

  // Auto-select first company or restore from localStorage
  useEffect(() => {
    if (companies.length > 0 && !currentCompany) {
      const storedId = localStorage.getItem("ai_marketing_company_id");
      const stored = storedId ? companies.find((c) => c.id === Number(storedId)) : null;
      setCurrentCompanyState((stored ?? companies[0]) as Company);
    }
  }, [companies, currentCompany]);

  const setCurrentCompany = (company: Company) => {
    setCurrentCompanyState(company);
    localStorage.setItem("ai_marketing_company_id", String(company.id));
  };

  return (
    <CompanyContext.Provider value={{ currentCompany, setCurrentCompany, companies: companies as Company[], isLoading }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}
