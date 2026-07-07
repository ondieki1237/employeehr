"use client";

import { useEffect, useMemo, useState, type JSX } from "react";
import { stockApi, usersApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  CalendarClock,
  RefreshCw,
  ListChecks,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ============================================================================
 * Types
 * ==========================================================================*/

interface InstalledMachine {
  _id: string;
  productName: string;
  serialNumber?: string;
  client?: { name: string; location?: string };
  installationLocation?: string;
  installationDate?: string;
  warrantyUntil?: string;
  status?: string;
  nextServiceDate?: string;
  installedBy?: string;
  attendant?: string;
  attendantNumber?: string;
  isTrained?: boolean;
  notes?: string;
}

interface Candidate {
  invoiceId: string;
  quotationId: string;
  productId: string;
  productName: string;
  category?: string;
  client?: { name: string; location?: string };
  invoiceNumber?: string;
  quantity?: number;
}

interface ServiceRecord {
  _id: string;
  machineId: string;
  isReminder?: boolean;
  machine?: {
    productName?: string;
    serialNumber?: string;
    client?: { name: string; location?: string };
  };
  serviceType?: string;
  scheduledDate?: string;
  completedDate?: string;
  technician?: string;
  cost?: number;
  notes?: string;
}

type SectionKey = "machines" | "pending" | "due" | "coming-soon" | "done";
type ComingSoonPeriod = "week" | "month";

interface ServiceFormState {
  machineId: string;
  serviceType: string;
  scheduledDate: string;
  technician: string;
  notes: string;
  cost: string;
  markCompleted: boolean;
}

const EMPTY_SERVICE_FORM: ServiceFormState = {
  machineId: "",
  serviceType: "",
  scheduledDate: "",
  technician: "",
  notes: "",
  cost: "",
  markCompleted: false,
};

const SERVICE_TYPE_OPTIONS = [
  "Annual Service",
  "Breakdown",
  "QC",
  "Client Request",
  "Machine failure",
  "Routine Maintenance",
];

interface EmployeeOption {
  _id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

function getEmployeeLabel(employee: EmployeeOption) {
  if (employee.name) return employee.name;
  const first = employee.first_name?.trim();
  const last = employee.last_name?.trim();
  if (first || last) return [first, last].filter(Boolean).join(" ");
  return employee.email || "Unnamed employee";
}

/* ============================================================================
 * Theme helpers (mirrors the palette used on the Invoices dashboard)
 * ==========================================================================*/

const PRIMARY_COLOR = "#0f766e";
const SECONDARY_COLOR = "#0ea5e9";

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return { r: 15, g: 118, b: 110 };
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function hexToRgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const PRIMARY_SOFT = hexToRgba(PRIMARY_COLOR, 0.08);
const SECONDARY_SOFT = hexToRgba(SECONDARY_COLOR, 0.08);
const PRIMARY_BORDER = hexToRgba(PRIMARY_COLOR, 0.18);

/* ============================================================================
 * Date helpers
 * ==========================================================================*/

// Positive => in the future, 0 => today, negative => overdue
function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString();
}

function toInputDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().split("T")[0];
}

/* ============================================================================
 * Small presentational helpers
 * ==========================================================================*/

function machineStatusTone(status?: string) {
  if (status === "maintenance") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (status === "inactive" || status === "decommissioned") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function ServiceStatusBadge({ service }: { service: ServiceRecord }) {
  if (service.completedDate) {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700"
      >
        Done
      </Badge>
    );
  }
  const d = daysUntil(service.scheduledDate);
  if (d === null) {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600"
      >
        Pending
      </Badge>
    );
  }
  if (d <= 0) {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-medium text-rose-700"
      >
        {d === 0 ? "Due today" : `Overdue ${Math.abs(d)}d`}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="rounded-full border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-medium text-sky-700"
    >
      In {d}d
    </Badge>
  );
}

function ServiceCard({
  service,
  onMarkDone,
  onEdit,
  onDelete,
}: {
  service: ServiceRecord;
  onMarkDone?: (s: ServiceRecord) => void;
  onEdit: (s: ServiceRecord) => void;
  onDelete: (s: ServiceRecord) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/40">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">
            {service.machine?.productName || "Unknown machine"}
          </span>
          <ServiceStatusBadge service={service} />
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {service.serviceType || "General service"} ·{" "}
          {service.machine?.client?.name || "—"}
        </div>
        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {service.scheduledDate && (
            <span>Scheduled: {formatDate(service.scheduledDate)}</span>
          )}
          {service.completedDate && (
            <span>Completed: {formatDate(service.completedDate)}</span>
          )}
          {service.technician && <span>By: {service.technician}</span>}
        </div>
        {service.notes && (
          <div className="mt-2 text-xs italic text-muted-foreground">
            {service.notes}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!service.completedDate && !service.isReminder && onMarkDone && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 whitespace-nowrap text-xs"
            onClick={() => onMarkDone(service)}
          >
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
            Mark done
          </Button>
        )}
        {!service.isReminder && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 whitespace-nowrap">
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onEdit(service)}>
                Edit service
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(service)}
              >
                Delete service
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
 * Page
 * ==========================================================================*/

export default function InstalledMachinesPage() {
  // Section navigation
  const [section, setSection] = useState<SectionKey>("machines");
  const [comingSoonPeriod, setComingSoonPeriod] =
    useState<ComingSoonPeriod>("week");

  // Data
  const [loading, setLoading] = useState(true);
  const [machines, setMachines] = useState<InstalledMachine[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  // Add machine (from invoice candidates)
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<Record<string, Candidate>>(
    {},
  );
  const [showCandidates, setShowCandidates] = useState(false);
  const [hoveredCandidate, setHoveredCandidate] = useState<string | null>(null);

  // Machine list / detail
  const [machineSearch, setMachineSearch] = useState("");
  const [machinePage, setMachinePage] = useState(1);
  const machinePageSize = 10;
  const [selectedMachine, setSelectedMachine] =
    useState<InstalledMachine | null>(null);
  const [editingMachine, setEditingMachine] = useState<InstalledMachine | null>(
    null,
  );
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailForm, setDetailForm] = useState<Partial<InstalledMachine>>({});
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  // Services (log / edit)
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(
    null,
  );
  const [serviceForm, setServiceForm] =
    useState<ServiceFormState>(EMPTY_SERVICE_FORM);

  const [saving, setSaving] = useState(false);

  /* ---------------------------- Data loading ---------------------------- */

  const load = async () => {
    try {
      setLoading(true);
      const [mRes, candRes, sRes] = await Promise.all([
        stockApi.getInstalledMachines(),
        stockApi.getInstallableCandidates(),
        stockApi.getMachineServices
          ? stockApi.getMachineServices()
          : Promise.resolve({ data: [] }),
      ]);
      let usersRes: any = null;
      try {
        usersRes = await usersApi.getAll();
      } catch (employeeErr) {
        console.error("Failed to load employees", employeeErr);
      }

      setMachines(mRes.data || []);
      const payload = candRes.data ||
        candRes || { categories: [], candidates: [] };
      setCategories(payload.categories || []);
      setCandidates(payload.candidates || []);
      const servicePayload = Array.isArray(sRes?.data) ? sRes.data : [];
      setServices(servicePayload);
      setEmployees(Array.isArray(usersRes?.data) ? usersRes.data : []);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to load installed machines");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  /* ------------------------------ Derived -------------------------------- */

  const filteredByCategory = useMemo(() => {
    if (!selectedCategory) return candidates;
    return candidates.filter(
      (c: any) => (c.category || "Uncategorized") === selectedCategory,
    );
  }, [candidates, selectedCategory]);

  const filteredMachines = useMemo(() => {
    const query = machineSearch.trim().toLowerCase();
    if (!query) return machines;
    return machines.filter(
      (m) =>
        m.productName.toLowerCase().includes(query) ||
        m.client?.name.toLowerCase().includes(query) ||
        m.serialNumber?.toLowerCase().includes(query) ||
        m.installationLocation?.toLowerCase().includes(query),
    );
  }, [machines, machineSearch]);

  useEffect(() => {
    setMachinePage(1);
  }, [machineSearch]);

  const machineTotalPages = Math.max(
    1,
    Math.ceil(filteredMachines.length / machinePageSize),
  );

  useEffect(() => {
    if (machinePage > machineTotalPages) setMachinePage(machineTotalPages);
  }, [machinePage, machineTotalPages]);

  const pagedMachines = useMemo(() => {
    const start = (machinePage - 1) * machinePageSize;
    return filteredMachines.slice(start, start + machinePageSize);
  }, [filteredMachines, machinePage]);

  const machineVisiblePages = useMemo(() => {
    const count = Math.min(8, machineTotalPages);
    return Array.from({ length: count }, (_, index) => index + 1);
  }, [machineTotalPages]);

  const reminderServices = useMemo(() => {
    const reminders: ServiceRecord[] = [...services];

    machines.forEach((machine) => {
      if (!machine.nextServiceDate) return;

      const hasMatchingReminder = reminders.some(
        (service) =>
          service.machineId === machine._id &&
          service.scheduledDate === machine.nextServiceDate,
      );

      if (hasMatchingReminder) return;

      reminders.push({
        _id: `${machine._id}-next-service`,
        machineId: machine._id,
        isReminder: true,
        machine: {
          productName: machine.productName,
          serialNumber: machine.serialNumber,
          client: machine.client,
        },
        serviceType: "Routine Maintenance",
        scheduledDate: machine.nextServiceDate,
        completedDate: undefined,
        technician: "",
        notes: "Next service date from machine record",
        cost: 0,
      });
    });

    return reminders;
  }, [machines, services]);

  const pendingServices = useMemo(
    () => reminderServices.filter((s) => !s.completedDate),
    [reminderServices],
  );

  const dueServices = useMemo(
    () =>
      pendingServices.filter((s) => {
        const d = daysUntil(s.scheduledDate);
        return d !== null && d <= 0;
      }),
    [pendingServices],
  );

  const comingSoonServices = useMemo(() => {
    const limit = comingSoonPeriod === "week" ? 7 : 30;
    return pendingServices.filter((s) => {
      const d = daysUntil(s.scheduledDate);
      return d !== null && d > 0 && d <= limit;
    });
  }, [pendingServices, comingSoonPeriod]);

  const doneServices = useMemo(
    () =>
      [...services]
        .filter((s) => !!s.completedDate)
        .sort(
          (a, b) =>
            new Date(b.completedDate!).getTime() -
            new Date(a.completedDate!).getTime(),
        ),
    [services],
  );

  const recentDoneServices = useMemo(
    () => doneServices.slice(0, 5),
    [doneServices],
  );

  const servicesForSelectedMachine = useMemo(() => {
    if (!selectedMachine) return [];
    return reminderServices
      .filter((s) => s.machineId === selectedMachine._id)
      .sort((a, b) => {
        const da = a.scheduledDate || a.completedDate || "";
        const db = b.scheduledDate || b.completedDate || "";
        return db.localeCompare(da);
      });
  }, [reminderServices, selectedMachine]);

  const technicianOptions = useMemo(() => {
    const options = employees.map((employee) => ({
      value: getEmployeeLabel(employee),
      label: getEmployeeLabel(employee),
    }));

    if (
      serviceForm.technician &&
      !options.some((option) => option.value === serviceForm.technician)
    ) {
      options.unshift({ value: serviceForm.technician, label: serviceForm.technician });
    }

    return options;
  }, [employees, serviceForm.technician]);

  const sectionTabs: {
    key: SectionKey;
    label: string;
    icon: JSX.Element;
    count: number;
  }[] = [
    {
      key: "machines",
      label: "Machines",
      icon: <ListChecks className="h-4 w-4" />,
      count: machines.length,
    },
    {
      key: "pending",
      label: "Pending Services",
      icon: <Clock className="h-4 w-4" />,
      count: pendingServices.length,
    },
    {
      key: "due",
      label: "Due Services",
      icon: <AlertTriangle className="h-4 w-4" />,
      count: dueServices.length,
    },
    {
      key: "coming-soon",
      label: "Coming Soon",
      icon: <CalendarClock className="h-4 w-4" />,
      count: comingSoonServices.length,
    },
    {
      key: "done",
      label: "Done Services",
      icon: <CheckCircle2 className="h-4 w-4" />,
      count: doneServices.length,
    },
  ];

  /* ------------------------------- Actions -------------------------------- */

  const toggleSelect = (key: string, item: Candidate) => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = item;
      return next;
    });
  };

  const openDetailDialog = (machine: InstalledMachine) => {
    setEditingMachine(machine);
    setDetailForm({
      serialNumber: machine.serialNumber || "",
      nextServiceDate: machine.nextServiceDate || "",
      installedBy: machine.installedBy || "",
      attendant: machine.attendant || "",
      attendantNumber: machine.attendantNumber || "",
      isTrained: machine.isTrained || false,
      installationLocation: machine.installationLocation || "",
      notes: machine.notes || "",
    });
    setShowDetailDialog(true);
  };

  const saveDetails = async () => {
    if (!editingMachine || !editingMachine._id) return;
    setSaving(true);
    try {
      await stockApi.updateInstalledMachine(editingMachine._id, detailForm);
      alert("Machine details updated");
      setShowDetailDialog(false);
      await load();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to save details");
    } finally {
      setSaving(false);
    }
  };

  const saveSelectedCandidates = async () => {
    const keys = Object.keys(selectedItems);
    if (!keys.length) return alert("Select machines to save");
    setSaving(true);
    try {
      for (const k of keys) {
        const item = selectedItems[k];
        await stockApi.createInstalledMachine({
          client: item.client || {},
          productId: item.productId,
          productName: item.productName,
          category: item.category,
          invoiceId: item.invoiceId,
          quotationId: item.quotationId,
          installationDate: new Date().toISOString(),
          isActive: true,
        });
      }
      alert("Saved selected installed machines");
      setSelectedItems({});
      setShowCandidates(false);
      await load();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const deleteMachine = async (id: string) => {
    if (!confirm("Are you sure you want to delete this machine?")) return;
    try {
      await stockApi.deleteInstalledMachine(id);
      alert("Machine deleted");
      setSelectedMachine((prev) => (prev?._id === id ? null : prev));
      await load();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to delete machine");
    }
  };

  const openLogServiceDialog = (machine?: InstalledMachine) => {
    setEditingService(null);
    setServiceForm({
      ...EMPTY_SERVICE_FORM,
      machineId: machine?._id || selectedMachine?._id || "",
    });
    setShowServiceDialog(true);
  };

  const openEditServiceDialog = (service: ServiceRecord) => {
    setEditingService(service);
    setServiceForm({
      machineId: service.machineId,
      serviceType: service.serviceType || "",
      scheduledDate: toInputDate(service.scheduledDate),
      technician: service.technician || "",
      notes: service.notes || "",
      cost: service.cost != null ? String(service.cost) : "",
      markCompleted: !!service.completedDate,
    });
    setShowServiceDialog(true);
  };

  const saveService = async () => {
    if (!serviceForm.machineId) return alert("Select a machine");
    if (editingService?.isReminder) {
      alert("This reminder cannot be edited directly.");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        machineId: serviceForm.machineId,
        serviceType: serviceForm.serviceType,
        scheduledDate: serviceForm.scheduledDate
          ? new Date(serviceForm.scheduledDate).toISOString()
          : null,
        technician: serviceForm.technician,
        notes: serviceForm.notes,
        cost: serviceForm.cost ? Number(serviceForm.cost) : undefined,
        completedDate: serviceForm.markCompleted
          ? editingService?.completedDate || new Date().toISOString()
          : null,
      };

      if (editingService) {
        await stockApi.updateMachineService(editingService._id, payload);
      } else {
        await stockApi.createMachineService(payload);
      }
      alert(editingService ? "Service updated" : "Service logged");
      setShowServiceDialog(false);
      await load();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to save service");
    } finally {
      setSaving(false);
    }
  };

  const markServiceDone = async (service: ServiceRecord) => {
    if (service.isReminder) {
      alert("This reminder is not a saved service record.");
      return;
    }
    try {
      await stockApi.updateMachineService(service._id, {
        completedDate: new Date().toISOString(),
      });
      await load();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to mark service done");
    }
  };

  const deleteService = async (service: ServiceRecord) => {
    if (service.isReminder) {
      alert("This reminder is not a saved service record.");
      return;
    }
    if (!confirm("Delete this service record?")) return;
    try {
      await stockApi.deleteMachineService(service._id);
      await load();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to delete service");
    }
  };

  if (loading) return <div className="p-6">Loading installed machines...</div>;

  /* --------------------------------- Render -------------------------------- */

  return (
    <div className="space-y-5 p-6">
      {/* Gradient header banner, mirrors the Invoices dashboard */}
      <div
        className="rounded-2xl border px-4 py-3 shadow-sm"
        style={{
          borderColor: PRIMARY_BORDER,
          background: `linear-gradient(to right, ${PRIMARY_SOFT}, ${SECONDARY_SOFT})`,
        }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-0.5">
            <p
              className="text-sm font-medium tracking-wide"
              style={{ color: PRIMARY_COLOR }}
            >
              Installed Machines
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Installed machines dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Track machines sold to clients, and manage pending, due and
              completed services.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setSection("machines");
                setShowCandidates((v) => !v);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {showCandidates ? "Hide" : "Add"} Machines
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => openLogServiceDialog()}
            >
              <Wrench className="h-4 w-4" />
              Log Service
            </Button>
            <Button variant="ghost" size="icon" onClick={() => load()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Machines
              </div>
              <div className="mt-1 text-xl font-semibold">{machines.length}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Pending services
              </div>
              <div className="mt-1 text-xl font-semibold" style={{ color: SECONDARY_COLOR }}>
                {pendingServices.length}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Due services
              </div>
              <div className="mt-1 text-xl font-semibold text-rose-600">
                {dueServices.length}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Coming soon
              </div>
              <div className="mt-1 text-xl font-semibold">
                {comingSoonServices.length}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Done services
              </div>
              <div className="mt-1 text-xl font-semibold text-emerald-600">
                {doneServices.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section navigation, styled as a pill toggle row */}
        <div className="mt-3 flex flex-wrap gap-2 rounded-xl border bg-white/90 p-2 shadow-sm backdrop-blur-sm">
          {sectionTabs.map((tab) => (
            <Button
              key={tab.key}
              size="sm"
              variant={section === tab.key ? "default" : "outline"}
              className="flex items-center gap-2"
              onClick={() => setSection(tab.key)}
            >
              {tab.icon}
              {tab.label}
              <Badge
                variant="outline"
                className={`ml-1 rounded-full px-2 py-0 text-[11px] ${
                  section === tab.key
                    ? "border-white/40 bg-white/20 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {tab.count}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* ---------------------------- Machines section ---------------------------- */}
      {section === "machines" && (
        <>
          {showCandidates && (
            <Card className="overflow-hidden shadow-sm">
              <CardHeader className="border-b bg-muted/30 pb-3">
                <CardTitle className="text-base">
                  Add Machines from Invoices
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="rounded-xl border bg-white/90 p-3 shadow-sm backdrop-blur-sm">
                    <Label>Filter by Category</Label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="mt-1 w-full rounded border px-3 py-2"
                    >
                      <option value="">All categories</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {filteredByCategory.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No candidate machines found for selected category.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-auto">
                      {filteredByCategory.map((it: any, idx: number) => {
                        const key = `${it.invoiceId}::${it.productId}::${idx}`;
                        const selected = !!selectedItems[key];
                        return (
                          <div
                            key={key}
                            className={`flex items-center justify-between rounded-xl border p-4 transition cursor-pointer ${
                              selected
                                ? "border-primary bg-primary/10"
                                : "bg-background hover:bg-muted/50"
                            }`}
                            onMouseEnter={() => setHoveredCandidate(key)}
                            onMouseLeave={() => setHoveredCandidate(null)}
                          >
                            <div
                              className="flex-1 cursor-pointer"
                              onClick={() => toggleSelect(key, it)}
                            >
                              <div className="font-medium">{it.productName}</div>
                              <div className="text-xs text-muted-foreground">
                                Invoice: {it.invoiceNumber || it.invoiceId} ·
                                Client: {it.client?.name || "-"}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {hoveredCandidate === key && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => toggleSelect(key, it)}
                                  className="text-xs"
                                >
                                  {selected ? "Remove" : "Add"}
                                </Button>
                              )}
                              <Checkbox
                                checked={selected}
                                onCheckedChange={() => toggleSelect(key, it)}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={saveSelectedCandidates}
                      disabled={saving || Object.keys(selectedItems).length === 0}
                      className="flex-1"
                    >
                      {saving
                        ? "Saving..."
                        : `Save ${Object.keys(selectedItems).length} Selected`}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCandidates(false);
                        setSelectedItems({});
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Machines table */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden shadow-sm">
                <CardHeader className="border-b bg-muted/30 pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <CardTitle className="text-base">Machines registry</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Showing {filteredMachines.length} of {machines.length} machines
                      </p>
                    </div>
                    <Input
                      placeholder="Search by machine, client, serial..."
                      value={machineSearch}
                      onChange={(e) => setMachineSearch(e.target.value)}
                      className="w-full sm:w-64"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {machines.length === 0 ? (
                    <div className="flex min-h-[220px] items-center justify-center px-6 py-10 text-center">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          No installed machines yet
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Click "Add Machines" to register machines from
                          delivered invoices.
                        </p>
                      </div>
                    </div>
                  ) : filteredMachines.length === 0 ? (
                    <div className="flex min-h-[220px] items-center justify-center px-6 py-10 text-center">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          No machines found
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Try adjusting your search.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full table-fixed text-[13px]">
                        <thead className="sticky top-0 z-10 bg-muted/80 text-left text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                          <tr className="border-b">
                            <th className="px-3 py-3 font-medium w-[38%]">Machine</th>
                            <th className="px-3 py-3 font-medium w-[30%]">Client</th>
                            <th className="px-3 py-3 font-medium w-[16%]">Status</th>
                            <th className="px-3 py-3 font-medium w-[16%]">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagedMachines.map((m, index) => (
                            <tr
                              key={m._id}
                              onClick={() => setSelectedMachine(m)}
                              className={`cursor-pointer border-b align-top transition-colors hover:bg-muted/40 ${
                                selectedMachine?._id === m._id
                                  ? "bg-primary/10"
                                  : index % 2 === 0
                                    ? "bg-white"
                                    : "bg-muted/20"
                              }`}
                            >
                              <td className="px-3 py-2 align-top">
                                <div className="min-w-0">
                                  <div
                                    className="truncate font-medium text-foreground"
                                    title={m.productName}
                                  >
                                    {m.productName}
                                  </div>
                                  {m.serialNumber && (
                                    <div className="truncate text-[11px] text-muted-foreground">
                                      SN: {m.serialNumber}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 align-top">
                                <div className="min-w-0">
                                  <div
                                    className="truncate font-medium text-foreground"
                                    title={m.client?.name}
                                  >
                                    {m.client?.name || "—"}
                                  </div>
                                  <div className="truncate text-[11px] text-muted-foreground">
                                    {m.client?.location || "—"}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2 align-top">
                                <Badge
                                  variant="outline"
                                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${machineStatusTone(
                                    m.status,
                                  )}`}
                                >
                                  {m.status || "active"}
                                </Badge>
                              </td>
                              <td
                                className="px-3 py-2 align-top"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 w-full whitespace-nowrap"
                                    >
                                      Actions
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem
                                      onClick={() => setSelectedMachine(m)}
                                    >
                                      View details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => openDetailDialog(m)}
                                    >
                                      Edit machine
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => openLogServiceDialog(m)}
                                    >
                                      Log service
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => deleteMachine(m._id)}
                                    >
                                      Delete machine
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {filteredMachines.length > 0 && (
                    <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-muted-foreground">
                        Showing {(machinePage - 1) * machinePageSize + 1}–
                        {Math.min(machinePage * machinePageSize, filteredMachines.length)}{" "}
                        of {filteredMachines.length}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={machinePage === 1}
                          onClick={() =>
                            setMachinePage((current) => Math.max(1, current - 1))
                          }
                        >
                          Prev
                        </Button>
                        {machineVisiblePages.map((pageNumber) => (
                          <Button
                            key={pageNumber}
                            variant={pageNumber === machinePage ? "default" : "outline"}
                            size="sm"
                            onClick={() => setMachinePage(pageNumber)}
                            className="min-w-9"
                          >
                            {pageNumber}
                          </Button>
                        ))}
                        {machineTotalPages > 8 && (
                          <span className="px-1 text-sm text-muted-foreground">…</span>
                        )}
                        {machineTotalPages > 8 && (
                          <Button
                            variant={machinePage === machineTotalPages ? "default" : "outline"}
                            size="sm"
                            onClick={() => setMachinePage(machineTotalPages)}
                            className="min-w-9"
                          >
                            {machineTotalPages}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={machinePage === machineTotalPages}
                          onClick={() =>
                            setMachinePage((current) =>
                              Math.min(machineTotalPages, current + 1),
                            )
                          }
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right column: selected machine detail, or recent services */}
            <div className="space-y-4">
              {selectedMachine ? (
                <Card className="overflow-hidden shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 pb-3">
                    <CardTitle className="text-base">Machine details</CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedMachine(null)}
                    >
                      Close
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        Machine Name
                      </Label>
                      <p className="text-sm font-medium mt-1">
                        {selectedMachine.productName}
                      </p>
                    </div>

                    {selectedMachine.serialNumber && (
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                          Serial Number
                        </Label>
                        <p className="text-sm font-mono mt-1">
                          {selectedMachine.serialNumber}
                        </p>
                      </div>
                    )}

                    <div>
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        Client
                      </Label>
                      <p className="text-sm font-medium mt-1">
                        {selectedMachine.client?.name || "—"}
                      </p>
                    </div>

                    {selectedMachine.installationLocation && (
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                          Installation Location
                        </Label>
                        <p className="text-sm mt-1">
                          {selectedMachine.installationLocation}
                        </p>
                      </div>
                    )}

                    {selectedMachine.installationDate && (
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                          Installed Date
                        </Label>
                        <p className="text-sm mt-1">
                          {formatDate(selectedMachine.installationDate)}
                        </p>
                      </div>
                    )}

                    {selectedMachine.attendant && (
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                          Operator
                        </Label>
                        <div className="space-y-1 mt-1">
                          <p className="text-sm">{selectedMachine.attendant}</p>
                          {selectedMachine.attendantNumber && (
                            <p className="text-xs text-muted-foreground">
                              {selectedMachine.attendantNumber}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedMachine.isTrained && (
                      <Badge
                        variant="outline"
                        className="rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700"
                      >
                        Operator Trained
                      </Badge>
                    )}

                    {selectedMachine.warrantyUntil && (
                      <div className="rounded-xl border bg-amber-50 p-3">
                        <Label className="text-xs uppercase tracking-wider text-amber-700">
                          Warranty Until
                        </Label>
                        <p className="text-sm font-medium text-amber-900 mt-1">
                          {formatDate(selectedMachine.warrantyUntil)}
                        </p>
                      </div>
                    )}

                    {selectedMachine.notes && (
                      <div className="rounded-xl border bg-slate-50 p-3">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                          Notes
                        </Label>
                        <p className="text-sm mt-1">{selectedMachine.notes}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => openDetailDialog(selectedMachine)}
                      >
                        Edit Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openLogServiceDialog(selectedMachine)}
                      >
                        Log Service
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteMachine(selectedMachine._id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="overflow-hidden shadow-sm">
                  <CardHeader className="border-b bg-muted/30 pb-3">
                    <CardTitle className="text-sm">
                      Select a machine to see its details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 text-xs text-muted-foreground">
                    Click any row in the registry, or open its Actions menu.
                  </CardContent>
                </Card>
              )}

              {/* Per-machine service history, when a machine is selected */}
              {selectedMachine && (
                <Card className="overflow-hidden shadow-sm">
                  <CardHeader className="border-b bg-muted/30 pb-3">
                    <CardTitle className="text-sm">
                      Service History ({servicesForSelectedMachine.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-64 overflow-auto pt-4">
                    {servicesForSelectedMachine.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No services logged for this machine yet.
                      </p>
                    ) : (
                      servicesForSelectedMachine.map((s) => (
                        <div
                          key={s._id}
                          className="flex items-center justify-between text-xs rounded-lg border p-2"
                        >
                          <div>
                            <div className="font-medium">
                              {s.serviceType || "General service"}
                            </div>
                            <div className="text-muted-foreground">
                              {s.completedDate
                                ? `Completed ${formatDate(s.completedDate)}`
                                : `Scheduled ${formatDate(s.scheduledDate)}`}
                            </div>
                          </div>
                          <ServiceStatusBadge service={s} />
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Recent services done, always visible */}
              <Card className="overflow-hidden shadow-sm">
                <CardHeader className="border-b bg-muted/30 pb-3">
                  <CardTitle className="text-sm">Recent Services Done</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-4">
                  {recentDoneServices.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No completed services yet.
                    </p>
                  ) : (
                    recentDoneServices.map((s) => (
                      <div
                        key={s._id}
                        className="flex items-center justify-between text-xs rounded-lg border p-2"
                      >
                        <div>
                          <div className="font-medium">
                            {s.machine?.productName || "Machine"}
                          </div>
                          <div className="text-muted-foreground">
                            {s.serviceType || "General service"} ·{" "}
                            {formatDate(s.completedDate)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* ---------------------------- Pending services ---------------------------- */}
      {section === "pending" && (
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <CardTitle className="text-base">
              Pending Services ({pendingServices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-2">
            {pendingServices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No pending services. All caught up.
              </p>
            ) : (
              pendingServices.map((s) => (
                <ServiceCard
                  key={s._id}
                  service={s}
                  onMarkDone={markServiceDone}
                  onEdit={openEditServiceDialog}
                  onDelete={deleteService}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------ Due services ------------------------------ */}
      {section === "due" && (
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <CardTitle className="text-base">
              Due Services ({dueServices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-2">
            {dueServices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nothing overdue right now.
              </p>
            ) : (
              dueServices.map((s) => (
                <ServiceCard
                  key={s._id}
                  service={s}
                  onMarkDone={markServiceDone}
                  onEdit={openEditServiceDialog}
                  onDelete={deleteService}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* --------------------------- Coming soon services --------------------------- */}
      {section === "coming-soon" && (
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base">
                Coming Soon Services ({comingSoonServices.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={comingSoonPeriod === "week" ? "default" : "outline"}
                  onClick={() => setComingSoonPeriod("week")}
                >
                  Within a week
                </Button>
                <Button
                  size="sm"
                  variant={comingSoonPeriod === "month" ? "default" : "outline"}
                  onClick={() => setComingSoonPeriod("month")}
                >
                  Within a month
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-2">
            {comingSoonServices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nothing scheduled in this period.
              </p>
            ) : (
              comingSoonServices.map((s) => (
                <ServiceCard
                  key={s._id}
                  service={s}
                  onMarkDone={markServiceDone}
                  onEdit={openEditServiceDialog}
                  onDelete={deleteService}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------ Done services ------------------------------ */}
      {section === "done" && (
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <CardTitle className="text-base">
              Done Services ({doneServices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-2">
            {doneServices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No services completed yet.
              </p>
            ) : (
              doneServices.map((s) => (
                <ServiceCard
                  key={s._id}
                  service={s}
                  onEdit={openEditServiceDialog}
                  onDelete={deleteService}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------ Edit machine dialog ------------------------------ */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Machine Details
              {editingMachine ? ` - ${editingMachine.productName}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Serial Number (Optional)</Label>
                <Input
                  value={detailForm.serialNumber || ""}
                  onChange={(e) =>
                    setDetailForm({ ...detailForm, serialNumber: e.target.value })
                  }
                  placeholder="e.g., SN-2024-001"
                />
              </div>
              <div>
                <Label>Installation Location</Label>
                <Input
                  value={detailForm.installationLocation || ""}
                  onChange={(e) =>
                    setDetailForm({
                      ...detailForm,
                      installationLocation: e.target.value,
                    })
                  }
                  placeholder="e.g., Lab 1, Room 201"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Installed By (Engineer)</Label>
                <Input
                  value={detailForm.installedBy || ""}
                  onChange={(e) =>
                    setDetailForm({ ...detailForm, installedBy: e.target.value })
                  }
                  placeholder="Engineer name"
                />
              </div>
              <div>
                <Label>Next Service Date</Label>
                <Input
                  type="date"
                  value={toInputDate(detailForm.nextServiceDate)}
                  onChange={(e) =>
                    setDetailForm({
                      ...detailForm,
                      nextServiceDate: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : "",
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Operator / Attendant</Label>
                <Input
                  value={detailForm.attendant || ""}
                  onChange={(e) =>
                    setDetailForm({ ...detailForm, attendant: e.target.value })
                  }
                  placeholder="Operator name"
                />
              </div>
              <div>
                <Label>Operator Phone / Number</Label>
                <Input
                  value={detailForm.attendantNumber || ""}
                  onChange={(e) =>
                    setDetailForm({
                      ...detailForm,
                      attendantNumber: e.target.value,
                    })
                  }
                  placeholder="+254712345678"
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <textarea
                value={detailForm.notes || ""}
                onChange={(e) =>
                  setDetailForm({ ...detailForm, notes: e.target.value })
                }
                placeholder="Any additional notes about the machine"
                className="w-full rounded border px-3 py-2 text-sm"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={detailForm.isTrained || false}
                onCheckedChange={(checked) =>
                  setDetailForm({ ...detailForm, isTrained: checked as boolean })
                }
              />
              <Label className="cursor-pointer flex-1 mb-0">
                Operator is trained on this machine
              </Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={saveDetails} disabled={saving} className="flex-1">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDetailDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ------------------------------ Log / edit service dialog ------------------------------ */}
      <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingService ? "Edit Service" : "Log a Service"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Machine</Label>
              <select
                value={serviceForm.machineId}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, machineId: e.target.value })
                }
                className="w-full rounded border px-3 py-2 mt-1"
              >
                <option value="">Select a machine</option>
                {machines.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.productName} {m.client?.name ? `— ${m.client.name}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Service Type</Label>
                <select
                  value={serviceForm.serviceType}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, serviceType: e.target.value })
                  }
                  className="w-full rounded border px-3 py-2 mt-1"
                >
                  <option value="">Select a service type</option>
                  {SERVICE_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Scheduled Date</Label>
                <Input
                  type="date"
                  value={serviceForm.scheduledDate}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      scheduledDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Technician</Label>
                <select
                  value={serviceForm.technician}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, technician: e.target.value })
                  }
                  className="w-full rounded border px-3 py-2 mt-1"
                >
                  <option value="">Select an employee</option>
                  {technicianOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Cost (Optional)</Label>
                <Input
                  type="number"
                  value={serviceForm.cost}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, cost: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <textarea
                value={serviceForm.notes}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, notes: e.target.value })
                }
                placeholder="What was done, parts used, observations..."
                className="w-full rounded border px-3 py-2 text-sm"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={serviceForm.markCompleted}
                onCheckedChange={(checked) =>
                  setServiceForm({
                    ...serviceForm,
                    markCompleted: checked as boolean,
                  })
                }
              />
              <Label className="cursor-pointer flex-1 mb-0">
                Mark as completed
              </Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={saveService} disabled={saving} className="flex-1">
                {saving ? "Saving..." : editingService ? "Save Changes" : "Log Service"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowServiceDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}