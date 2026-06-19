"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Power } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { formatUGX } from "@/lib/utils";
import type { Service } from "@/lib/types";

interface FormState {
  name: string;
  description: string;
  price: string;
  duration_minutes: string;
  is_active: boolean;
}

const emptyForm: FormState = {
  name: "",
  description: "",
  price: "",
  duration_minutes: "60",
  is_active: true,
};

export default function ManageServicesPage() {
  const supabase = createClient();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("services")
      .select("*")
      .order("name");
    setServices((data ?? []) as Service[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      description: s.description ?? "",
      price: String(s.price),
      duration_minutes: String(s.duration_minutes),
      is_active: s.is_active,
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const price = parseInt(form.price, 10);
    const duration = parseInt(form.duration_minutes, 10);

    if (!form.name.trim()) return setError("Name is required.");
    if (isNaN(price) || price <= 0) return setError("Enter a valid price.");
    if (isNaN(duration) || duration <= 0)
      return setError("Enter a valid duration.");

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      duration_minutes: duration,
      is_active: form.is_active,
    };

    const { error: dbError } = editingId
      ? await supabase.from("services").update(payload).eq("id", editingId)
      : await supabase.from("services").insert(payload);

    setSaving(false);

    if (dbError) {
      setError("Could not save service. Please try again.");
      return;
    }
    setModalOpen(false);
    load();
  };

  const toggleActive = async (s: Service) => {
    setBusyId(s.id);
    await supabase
      .from("services")
      .update({ is_active: !s.is_active })
      .eq("id", s.id);
    setBusyId(null);
    load();
  };

  const handleDelete = async (s: Service) => {
    if (
      !confirm(
        `Delete "${s.name}"? This cannot be undone. (If it has bookings, deactivate it instead.)`
      )
    )
      return;
    setBusyId(s.id);
    const { error: delError } = await supabase
      .from("services")
      .delete()
      .eq("id", s.id);
    setBusyId(null);
    if (delError) {
      alert(
        "Cannot delete: this service has existing bookings. Deactivate it instead."
      );
      return;
    }
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">Services</h1>
          <p className="mt-1 text-ink-light">Manage your service menu and pricing.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Service
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <Spinner className="mx-auto text-brand-500" />
        </div>
      ) : services.length === 0 ? (
        <Card className="mt-6">
          <CardBody className="text-center text-ink-light">
            No services yet. Click &quot;Add Service&quot; to create one.
          </CardBody>
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {services.map((s) => (
            <Card key={s.id}>
              <CardBody className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-ink">{s.name}</h3>
                    {!s.is_active && <Badge variant="neutral">Inactive</Badge>}
                  </div>
                  {s.description && (
                    <p className="mt-0.5 line-clamp-1 text-sm text-ink-light">
                      {s.description}
                    </p>
                  )}
                  <p className="mt-1 text-sm">
                    <span className="font-semibold text-brand-600">
                      {formatUGX(s.price)}
                    </span>
                    <span className="text-ink-light"> · {s.duration_minutes} min</span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleActive(s)}
                    loading={busyId === s.id}
                    aria-label={s.is_active ? "Deactivate" : "Activate"}
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(s)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Service" : "Add Service"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <Input
            label="Service Name"
            name="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Hair Braiding"
            required
          />

          <div>
            <label
              htmlFor="description"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Description
            </label>
            <textarea
              id="description"
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Short description"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-ink placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Price (UGX)"
              name="price"
              type="number"
              min="0"
              step="1000"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="50000"
              required
            />
            <Input
              label="Duration (min)"
              name="duration"
              type="number"
              min="5"
              step="5"
              value={form.duration_minutes}
              onChange={(e) =>
                setForm({ ...form, duration_minutes: e.target.value })
              }
              placeholder="60"
              required
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm({ ...form, is_active: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            Active (visible to customers)
          </label>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={saving}>
              {editingId ? "Save Changes" : "Add Service"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
