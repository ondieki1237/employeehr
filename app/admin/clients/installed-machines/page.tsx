"use client";

import { useEffect, useMemo, useState } from "react";
import { stockApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp, Plus, Edit2, Trash2, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

export default function InstalledMachinesPage() {
  const [loading, setLoading] = useState(true);
  const [machines, setMachines] = useState<InstalledMachine[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<Record<string, Candidate>>(
    {},
  );
  const [saving, setSaving] = useState(false);
  const [showCandidates, setShowCandidates] = useState(false);
  const [machineSearch, setMachineSearch] = useState("");
  const [selectedMachine, setSelectedMachine] =
    useState<InstalledMachine | null>(null);
  const [editingMachine, setEditingMachine] = useState<InstalledMachine | null>(
    null,
  );
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailForm, setDetailForm] = useState<Partial<InstalledMachine>>({});
  const [hoveredCandidate, setHoveredCandidate] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [mRes, candRes] = await Promise.all([
        stockApi.getInstalledMachines(),
        stockApi.getInstallableCandidates(),
      ]);
      setMachines(mRes.data || []);
      const payload = candRes.data ||
        candRes || { categories: [], candidates: [] };
      setCategories(payload.categories || []);
      setCandidates(payload.candidates || []);
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
      setSelectedMachine(null);
      await load();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to delete machine");
    }
  };

  if (loading) return <div className="p-6">Loading installed machines...</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Installed Machines</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage machines sold to clients with installation and service
            details
          </p>
        </div>
        <Button
          onClick={() => setShowCandidates(!showCandidates)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {showCandidates ? "Hide" : "Add"} Machines
          {showCandidates ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Candidates Section (Collapsible) */}
      {showCandidates && (
        <Card className="border-primary/20">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-lg">
              Add Machines from Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <Label>Filter by Category</Label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded border px-3 py-2 mt-1"
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
                        className={`flex items-center justify-between rounded-lg border p-4 transition cursor-pointer ${
                          selected
                            ? "bg-primary/10 border-primary"
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

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Machines List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="bg-muted/50">
              <div className="flex items-center justify-between">
                <CardTitle>
                  Machines Registry ({filteredMachines.length})
                </CardTitle>
                <Input
                  placeholder="Search by machine, client, serial..."
                  value={machineSearch}
                  onChange={(e) => setMachineSearch(e.target.value)}
                  className="w-64"
                />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {machines.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No installed machines yet.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click "Add Machines" to register machines from delivered
                    invoices.
                  </p>
                </div>
              ) : filteredMachines.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No machines match your search.
                </p>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-auto">
                  {filteredMachines.map((m) => (
                    <div
                      key={m._id}
                      className={`p-4 rounded-lg border cursor-pointer transition ${
                        selectedMachine?._id === m._id
                          ? "bg-primary/10 border-primary"
                          : "bg-background hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedMachine(m)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{m.productName}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {m.client?.name || "—"} ·{" "}
                            {m.client?.location || "—"}
                          </div>
                          {m.serialNumber && (
                            <div className="text-xs text-muted-foreground mt-1">
                              SN: {m.serialNumber}
                            </div>
                          )}
                        </div>
                        <Badge
                          variant={
                            m.status === "active"
                              ? "default"
                              : m.status === "maintenance"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {m.status || "active"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Machine Details Panel */}
        {selectedMachine && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="bg-primary/5">
                <CardTitle className="text-lg">Machine Details</CardTitle>
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

                {selectedMachine.client?.location && (
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Location
                    </Label>
                    <p className="text-sm mt-1">
                      {selectedMachine.client.location}
                    </p>
                  </div>
                )}

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
                      {new Date(
                        selectedMachine.installationDate,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {selectedMachine.installedBy && (
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Installed By
                    </Label>
                    <p className="text-sm mt-1">
                      {selectedMachine.installedBy}
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
                  <div className="pt-2">
                    <Badge className="bg-green-100 text-green-800">
                      Operator Trained
                    </Badge>
                  </div>
                )}

                {selectedMachine.nextServiceDate && (
                  <div className="bg-blue-50 rounded-lg p-3 mt-4">
                    <Label className="text-xs uppercase tracking-wider text-blue-700">
                      Next Service Date
                    </Label>
                    <p className="text-sm font-medium text-blue-900 mt-1">
                      {new Date(
                        selectedMachine.nextServiceDate,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {selectedMachine.warrantyUntil && (
                  <div className="bg-amber-50 rounded-lg p-3">
                    <Label className="text-xs uppercase tracking-wider text-amber-700">
                      Warranty Until
                    </Label>
                    <p className="text-sm font-medium text-amber-900 mt-1">
                      {new Date(
                        selectedMachine.warrantyUntil,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {selectedMachine.notes && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Notes
                    </Label>
                    <p className="text-sm mt-1">{selectedMachine.notes}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Dialog
                    open={
                      showDetailDialog &&
                      editingMachine?._id === selectedMachine?._id
                    }
                    onOpenChange={setShowDetailDialog}
                  >
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 flex items-center gap-2"
                        onClick={() => openDetailDialog(selectedMachine)}
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          Edit Machine Details - {selectedMachine.productName}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Serial Number (Optional)</Label>
                            <Input
                              value={detailForm.serialNumber || ""}
                              onChange={(e) =>
                                setDetailForm({
                                  ...detailForm,
                                  serialNumber: e.target.value,
                                })
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
                                setDetailForm({
                                  ...detailForm,
                                  installedBy: e.target.value,
                                })
                              }
                              placeholder="Engineer name"
                            />
                          </div>

                          <div>
                            <Label>Next Service Date</Label>
                            <Input
                              type="date"
                              value={
                                detailForm.nextServiceDate
                                  ? new Date(detailForm.nextServiceDate)
                                      .toISOString()
                                      .split("T")[0]
                                  : ""
                              }
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
                                setDetailForm({
                                  ...detailForm,
                                  attendant: e.target.value,
                                })
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
                              setDetailForm({
                                ...detailForm,
                                notes: e.target.value,
                              })
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
                              setDetailForm({
                                ...detailForm,
                                isTrained: checked as boolean,
                              })
                            }
                          />
                          <Label className="cursor-pointer flex-1 mb-0">
                            Operator is trained on this machine
                          </Label>
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button
                            onClick={saveDetails}
                            disabled={saving}
                            className="flex-1"
                          >
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

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (selectedMachine._id) {
                        deleteMachine(selectedMachine._id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm"> Notes</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2"></CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
