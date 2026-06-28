"use client";

import { useEffect, useMemo, useState } from "react";
import { stockApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useRef } from "react";

interface ClientActivity {
  type: "quotation" | "invoice" | "payment" | "sale";
  reference: string;
  amount: number;
  date: string;
  status?: string;
  paymentMethod?: string;
  paidAmount?: number;
  debtAmount?: number;
  externalReference?: string;
}

interface AccountsClientRow {
  key: string;
  client: {
    name: string;
    number: string;
    location: string;
    contactPerson?: string;
  };
  quotationsCount: number;
  quotationsValue: number;
  invoicesCount: number;
  purchasesValue: number;
  paidAmount: number;
  debtAmount: number;
  salesCount: number;
  salesValue: number;
  lastActivityAt?: string;
  activities: ClientActivity[];
}

interface SavedClientRow {
  key: string;
  client: {
    name: string;
    number: string;
    location: string;
    contactPerson?: string;
  };
  quotationsCount: number;
  quotationsValue: number;
  invoicesCount: number;
  purchasesValue: number;
  paidAmount: number;
  debtAmount: number;
  salesCount: number;
  salesValue: number;
  lastActivityAt?: string;
  activities: ClientActivity[];
  isSavedClient?: boolean;
}

export default function AccountsClientsPage() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<SavedClientRow[]>([]);
  const [selectedClientKey, setSelectedClientKey] = useState("");
  const [savingClient, setSavingClient] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    number: "",
    location: "",
    contactPerson: "",
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingClients, setUploadingClients] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [accountsResponse, clientsResponse] = await Promise.all([
        stockApi.getAccountsClients(),
        stockApi.getSavedClients(),
      ]);

      const accountsRows = (accountsResponse.data || []) as AccountsClientRow[];
      const savedClients = (clientsResponse.data ||
        clientsResponse ||
        []) as Array<{
        name: string;
        number: string;
        location: string;
        contactPerson?: string;
      }>;

      const mergedMap = new Map<string, SavedClientRow>();

      for (const row of accountsRows) {
        mergedMap.set(row.key, { ...row, isSavedClient: false });
      }

      for (const client of savedClients) {
        const key = `${String(client.name || "")
          .trim()
          .toLowerCase()}|${String(client.number || "")
          .trim()
          .toLowerCase()}|${String(client.location || "")
          .trim()
          .toLowerCase()}`;
        if (!key || mergedMap.has(key)) continue;

        mergedMap.set(key, {
          key,
          client: {
            name: String(client.name || "").trim(),
            number: String(client.number || "").trim(),
            location: String(client.location || "").trim(),
            contactPerson: client.contactPerson,
          },
          quotationsCount: 0,
          quotationsValue: 0,
          invoicesCount: 0,
          purchasesValue: 0,
          paidAmount: 0,
          debtAmount: 0,
          salesCount: 0,
          salesValue: 0,
          lastActivityAt: undefined,
          activities: [],
          isSavedClient: true,
        });
      }

      const data = Array.from(mergedMap.values());
      setRows(data);
      if (!selectedClientKey && data.length > 0)
        setSelectedClientKey(data[0].key);
    } catch (error: any) {
      window.alert(error?.message || "Failed to load accounts clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((row) =>
      [
        row.client?.name,
        row.client?.number,
        row.client?.location,
        row.client?.contactPerson,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const selectedClient = useMemo(
    () => rows.find((row) => row.key === selectedClientKey) || null,
    [rows, selectedClientKey],
  );

  const handleAddClient = async () => {
    const name = newClient.name.trim();
    const number = newClient.number.trim();
    const location = newClient.location.trim();
    if (!name || !number || !location) {
      window.alert("Client name, phone number, and location are required");
      return;
    }

    try {
      setSavingClient(true);
      await stockApi.saveClient({
        sourceName: name,
        sourceNumber: number,
        sourceLocation: location,
        legalName: name,
        contactPerson: newClient.contactPerson.trim() || undefined,
      });

      setNewClient({
        name: "",
        number: "",
        location: "",
        contactPerson: "",
      });

      await loadData();
      window.alert("Client saved successfully");
    } catch (error: any) {
      window.alert(error?.message || "Failed to save client");
    } finally {
      setSavingClient(false);
    }
  };

  if (loading) return <div className="p-6">Loading clients...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accounts · Clients</h1>
          <p className="text-sm text-muted-foreground">
            View client activities, purchases, quotations, debt position, and
            payment history.
          </p>
        </div>
        <div>
          <a
            href="/admin/accounts/clients/installed-machines"
            className="inline-block"
          >
            <Button size="sm">Installed Machines</Button>
          </a>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Client</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Client Name</Label>
              <Input
                value={newClient.name}
                onChange={(event) =>
                  setNewClient((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Client Number</Label>
              <Input
                value={newClient.number}
                onChange={(event) =>
                  setNewClient((prev) => ({
                    ...prev,
                    number: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Client Location</Label>
              <Input
                value={newClient.location}
                onChange={(event) =>
                  setNewClient((prev) => ({
                    ...prev,
                    location: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Contact Person (optional)</Label>
              <Input
                value={newClient.contactPerson}
                onChange={(event) =>
                  setNewClient((prev) => ({
                    ...prev,
                    contactPerson: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAddClient} disabled={savingClient}>
              {savingClient ? "Saving..." : "Save Client"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Upload Clients</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            Download a sample CSV, fill rows and upload. Required columns:{" "}
            <strong>client_name, client_number, client_location</strong>.
            Optional: <strong>contact_person</strong>.
          </p>
          <div className="flex items-center gap-3">
            <a
              className="text-sm text-primary underline"
              href="/static/sample-clients.csv"
              download
            >
              Download sample CSV
            </a>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                try {
                  setUploadingClients(true);
                  const res = await stockApi.bulkUploadClients(file);
                  if (!res?.success)
                    throw new Error(res?.message || "Upload failed");
                  window.alert(res?.message || "Upload complete");
                  await loadData();
                } catch (err: any) {
                  window.alert(err?.message || "Upload failed");
                } finally {
                  setUploadingClients(false);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }
              }}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingClients}
              size="sm"
            >
              {uploadingClients ? "Uploading..." : "Upload CSV"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Clients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded border p-3 space-y-3 bg-muted/20">
              <p className="text-sm font-medium">Quick Add Client</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Client Name</Label>
                  <Input
                    value={newClient.name}
                    onChange={(event) =>
                      setNewClient((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Client Number</Label>
                  <Input
                    value={newClient.number}
                    onChange={(event) =>
                      setNewClient((prev) => ({
                        ...prev,
                        number: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Client Location</Label>
                  <Input
                    value={newClient.location}
                    onChange={(event) =>
                      setNewClient((prev) => ({
                        ...prev,
                        location: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Contact Person (optional)</Label>
                  <Input
                    value={newClient.contactPerson}
                    onChange={(event) =>
                      setNewClient((prev) => ({
                        ...prev,
                        contactPerson: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleAddClient}
                  disabled={savingClient}
                  size="sm"
                >
                  {savingClient ? "Saving..." : "Save Client"}
                </Button>
              </div>
            </div>

            <Input
              placeholder="Search client by name, number, location or contact person"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <div className="max-h-[560px] overflow-auto space-y-2">
              {filteredRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No clients found.
                </p>
              ) : (
                filteredRows.map((row) => (
                  <button
                    key={row.key}
                    onClick={() => setSelectedClientKey(row.key)}
                    className={`w-full rounded border p-3 text-left transition hover:bg-muted/50 ${
                      selectedClientKey === row.key
                        ? "border-primary bg-muted/40"
                        : "border-border"
                    }`}
                  >
                    <div className="font-medium">{row.client.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.client.number} · {row.client.location}
                      {row.client.contactPerson
                        ? ` · ${row.client.contactPerson}`
                        : ""}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div>Purchases: {row.purchasesValue.toFixed(2)}</div>
                      <div>Quotations: {row.quotationsCount}</div>
                      <div>Paid: {row.paidAmount.toFixed(2)}</div>
                      <div className="font-medium text-primary">
                        Debt: {row.debtAmount.toFixed(2)}
                      </div>
                    </div>
                    {row.isSavedClient ? (
                      <div className="mt-2 text-[11px] uppercase tracking-wide text-emerald-700">
                        Saved client
                      </div>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client Activities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedClient ? (
              <p className="text-sm text-muted-foreground">
                Select a client to view details.
              </p>
            ) : (
              <>
                <div className="rounded border bg-muted/30 p-3 text-sm space-y-1">
                  <p>
                    <span className="font-medium">Client:</span>{" "}
                    {selectedClient.client.name}
                  </p>
                  <p>
                    <span className="font-medium">Phone:</span>{" "}
                    {selectedClient.client.number}
                  </p>
                  <p>
                    <span className="font-medium">Location:</span>{" "}
                    {selectedClient.client.location}
                  </p>
                  {selectedClient.client.contactPerson ? (
                    <p>
                      <span className="font-medium">Contact Person:</span>{" "}
                      {selectedClient.client.contactPerson}
                    </p>
                  ) : null}
                  <p>
                    <span className="font-medium">Total Purchases:</span>{" "}
                    {selectedClient.purchasesValue.toFixed(2)}
                  </p>
                  <p>
                    <span className="font-medium">Total Paid:</span>{" "}
                    {selectedClient.paidAmount.toFixed(2)}
                  </p>
                  <p>
                    <span className="font-medium">Outstanding Debt:</span>{" "}
                    {selectedClient.debtAmount.toFixed(2)}
                  </p>
                  <p>
                    <span className="font-medium">Quotations:</span>{" "}
                    {selectedClient.quotationsCount} (
                    {selectedClient.quotationsValue.toFixed(2)})
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2">Date</th>
                        <th className="py-2">Type</th>
                        <th className="py-2">Reference</th>
                        <th className="py-2">Amount</th>
                        <th className="py-2">Details</th>
                        <th className="py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedClient.activities || []).length === 0 ? (
                        <tr>
                          <td className="py-2" colSpan={6}>
                            No activities found.
                          </td>
                        </tr>
                      ) : (
                        selectedClient.activities.map((activity, index) => (
                          <tr
                            key={`${activity.type}-${activity.reference}-${index}`}
                            className="border-b"
                          >
                            <td className="py-2">
                              {new Date(activity.date).toLocaleString()}
                            </td>
                            <td className="py-2 capitalize">{activity.type}</td>
                            <td className="py-2">
                              {activity.reference || "-"}
                            </td>
                            <td className="py-2">
                              {Number(activity.amount || 0).toFixed(2)}
                            </td>
                            <td className="py-2 text-xs text-muted-foreground">
                              {activity.type === "invoice"
                                ? `Paid ${Number(activity.paidAmount || 0).toFixed(2)} · Debt ${Number(activity.debtAmount || 0).toFixed(2)}`
                                : activity.type === "payment"
                                  ? `${String(activity.paymentMethod || "").toUpperCase()}${activity.externalReference ? ` · ${activity.externalReference}` : ""}`
                                  : activity.status || "-"}
                            </td>
                            <td className="py-2">
                              {activity.type === "invoice" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    window.location.href = `/admin/stock/invoices?q=${encodeURIComponent(activity.reference || "")}`;
                                  }}
                                >
                                  Open Invoice
                                </Button>
                              ) : activity.type === "quotation" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    window.location.href = `/admin/stock/quotations?q=${encodeURIComponent(activity.reference || "")}`;
                                  }}
                                >
                                  Open Quotation
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  -
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
