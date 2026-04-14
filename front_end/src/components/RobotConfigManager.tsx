import { useState, useRef } from "react";
import type { RobotConfig } from "@/types/robot";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Settings, Plus, Trash2, Download, Upload, Pencil } from "lucide-react";

type AddAction = (config: RobotConfig) => Promise<void>;
type UpdateAction = (
  robot_id: string,
  updates: Partial<RobotConfig>,
) => Promise<void>;
type RemoveAction = (robot_id: string) => Promise<void>;
type ImportAction = (json: string) => Promise<void>;

interface Props {
  configs: RobotConfig[];
  onAdd: AddAction;
  onUpdate: UpdateAction;
  onRemove: RemoveAction;
  onExport: () => void;
  onImport: ImportAction;
  busy: boolean;
}

const defaultNew: Omit<RobotConfig, "robot_id"> = {
  name: "",
  color: "#22dd66",
  radius: 0.3,
  max_speed: 1.5,
  battery_capacity: 100,
  enabled: true,
};

export default function RobotConfigManager({
  configs,
  onAdd,
  onUpdate,
  onRemove,
  onExport,
  onImport,
  busy,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [form, setForm] = useState({ robot_id: "", ...defaultNew });
  const fileRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setForm({ robot_id: "", ...defaultNew });
    setAdding(false);
    setEditingId(null);
    setActionError(null);
  };

  const handleAdd = async () => {
    if (!form.robot_id.trim() || !form.name.trim()) return;
    try {
      setActionError(null);
      await onAdd({ ...form, robot_id: form.robot_id.trim() });
      resetForm();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to add robot",
      );
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const { robot_id: _, ...updates } = form;
    try {
      setActionError(null);
      await onUpdate(editingId, updates);
      resetForm();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to update robot",
      );
    }
  };

  const startEdit = (c: RobotConfig) => {
    setEditingId(c.robot_id);
    setForm({ ...c });
    setAdding(false);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setActionError(null);
      await onImport(await file.text());
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to import robots",
      );
    }
    e.target.value = "";
  };

  const handleToggleEnabled = async (robot_id: string, enabled: boolean) => {
    try {
      setActionError(null);
      await onUpdate(robot_id, { enabled });
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to update robot",
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <button
          className="p-1.5 rounded hover:bg-secondary transition-colors"
          title="Robot Configuration"
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Robot Configuration Manager
          </DialogTitle>
        </DialogHeader>

        {actionError && (
          <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-2 py-1">
            {actionError}
          </p>
        )}

        <div className="space-y-2">
          {configs.map((c) =>
            editingId === c.robot_id ? (
              <div
                key={c.robot_id}
                className="rounded-md bg-secondary p-3 space-y-2"
              >
                <FormFields form={form} setForm={setForm} idDisabled />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div
                key={c.robot_id}
                className="rounded-md bg-secondary p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                  <div>
                    <span className="text-xs font-bold text-foreground">
                      {c.name}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {c.robot_id}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    disabled={busy}
                    onClick={() =>
                      void handleToggleEnabled(c.robot_id, !c.enabled)
                    }
                    className={`text-[10px] px-2 py-0.5 rounded ${c.enabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    {c.enabled ? "ON" : "OFF"}
                  </button>
                  <button
                    onClick={() => startEdit(c)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => void onRemove(c.robot_id)}
                    className="p-1 hover:bg-destructive/20 rounded disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              </div>
            ),
          )}
        </div>

        {adding ? (
          <div className="rounded-md bg-secondary p-3 space-y-2">
            <FormFields form={form} setForm={setForm} />
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={resetForm}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void handleAdd()}
                disabled={busy || !form.robot_id.trim() || !form.name.trim()}
              >
                <Plus className="w-3 h-3 mr-1" /> Add Robot
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
            disabled={busy}
          >
            <Plus className="w-3 h-3 mr-1" /> Add New Robot
          </Button>
        )}

        <div className="flex gap-2 pt-2 border-t border-border">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={onExport}
            disabled={busy}
          >
            <Download className="w-3 h-3 mr-1" /> Export JSON
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            <Upload className="w-3 h-3 mr-1" /> Import JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => void handleFileImport(e)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FormFields({
  form,
  setForm,
  idDisabled,
}: Readonly<{
  form: RobotConfig;
  setForm: React.Dispatch<React.SetStateAction<RobotConfig>>;
  idDisabled?: boolean;
}>) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <Label className="text-xs">Robot ID</Label>
        <Input
          className="h-7 text-xs bg-muted"
          value={form.robot_id}
          disabled={idDisabled}
          onChange={(e) => setForm((f) => ({ ...f, robot_id: e.target.value }))}
          placeholder="ROBOT-04"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Name</Label>
        <Input
          className="h-7 text-xs bg-muted"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Scout Delta"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Color</Label>
        <div className="flex gap-1">
          <input
            type="color"
            value={form.color}
            className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
            onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
          />
          <Input
            className="h-7 text-xs bg-muted flex-1"
            value={form.color}
            onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Radius (m)</Label>
        <Input
          type="number"
          step="0.05"
          className="h-7 text-xs bg-muted"
          value={form.radius}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              radius: Number.parseFloat(e.target.value) || 0,
            }))
          }
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Max Speed (m/s)</Label>
        <Input
          type="number"
          step="0.1"
          className="h-7 text-xs bg-muted"
          value={form.max_speed}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              max_speed: Number.parseFloat(e.target.value) || 0,
            }))
          }
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Battery Capacity</Label>
        <Input
          type="number"
          className="h-7 text-xs bg-muted"
          value={form.battery_capacity}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              battery_capacity: Number.parseFloat(e.target.value) || 100,
            }))
          }
        />
      </div>
    </div>
  );
}
