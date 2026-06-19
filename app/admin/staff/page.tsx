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
import type { Staff } from "@/lib/types";

interface FormState {
  name: string;
  role: string;
  is_active: boolean;
}

const emptyForm: FormState = { name: "", role: "", is_active: true };

export default function ManageStaffPage() {
  const supabase = createClient();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("staff").select("*").order("name");
    setStaff((data ?? []) as Staff[]);
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

  const openEdit = (s: Staff) => {
    setEditingId(s.id);
    setForm({ name: s.name, role: s.role, is_active: s.is_active });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError("Name is required.");
    if (!form.role.trim()) return setError("Role is required.");

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      role: form.role.trim(),
      is_active: form.is_active,
    };

    const { error: dbError } = editingId
      ? await supabase.from("staff").update(payload).eq("id", editingId)
      : await supabase.from("staff").insert(payload);

    setSaving(false);

    if (dbError) {
      setError("Could not save staff member. Please try again.");
      return;
    }
    setModalOpen(false);
    load();
  };

  const toggleActive = async (s: Staff) => {
    setBusyId(s.id);
    await supabase
      .from("staff")
      .update({ is_active: !s.is_active })
      .eq("id", s.id);
    setBusyId(null);
    load();
  };

  const handleDelete = async (s: Staff) => {
    if (
      !confirm(
        `Delete "${s.name}"? If they have bookings, deactivate instead.`
      )
    )
      return;
    setBusyId(s.id);
    // staff_id is ON DELETE SET NULL — delete always succeeds, bookings keep history
    const { error: delError } = await supabase
      .from("staff")
      .delete()
      .eq("id", s.id);
    setBusyId(null);
    if (delError) {
      alert("Could not delete. Try deactivating instead.");
      return;
    }
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">Staff</h1>
          <p className="mt-1 text-ink-light">Manage your salon team.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Staff
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <Spinner className="mx-auto text-brand-500" />
        </div>
      ) : staff.length === 0 ? (
        <Card className="mt-6">
          <CardBody className="text-center text-ink-light">
            No staff yet. Click &quot;Add Staff&quot; to create one.
          </CardBody>
        </Card>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {staff.map((s) => (
            <Card key={s.id}>
              <CardBody className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700">
                    {s.name.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-ink">{s.name}</h3>
                      {!s.is_active && (
                        <Badge variant="neutral">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-sm text-ink-light">{s.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
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
        title={editingId ? "Edit Staff" : "Add Staff"}
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
            label="Full Name"
            name="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Sarah"
            required
          />

          <Input
            label="Role"
            name="role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            placeholder="e.g. Hair Stylist"
            required
          />

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm({ ...form, is_active: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            Active (available for bookings)
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
              {editingId ? "Save Changes" : "Add Staff"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
