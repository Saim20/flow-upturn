"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStakeholders } from "@/hooks/useStakeholders";
import { useEmployees } from "@/hooks/useEmployees";
import { ArrowLeft, WarningCircle, Plus, TrashSimple } from "@phosphor-icons/react";
import { ContactPerson, Stakeholder } from "@/lib/types/schemas";
import { LoadingSpinner } from "@/components/ui";

export default function EditStakeholderPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const stakeholderId = parseInt(id);

  const {
    activeProcesses,
    stakeholders,
    loading,
    updateStakeholder,
    fetchProcesses,
    fetchStakeholderById,
    fetchStakeholders,
  } = useStakeholders();
  const { employees, fetchEmployees } = useEmployees();

  const [stakeholder, setStakeholder] = useState<Stakeholder | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    process_id: "",
    parent_stakeholder_id: "",
    kam_id: "", // Changed from issue_handler_id
    is_active: true,
  });

  const [contactPersons, setContactPersons] = useState<ContactPerson[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingStakeholder, setLoadingStakeholder] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingStakeholder(true);
        await fetchProcesses();
        await fetchEmployees();
        await fetchStakeholders(); // Fetch stakeholders for parent selection
        
        const data = await fetchStakeholderById(stakeholderId);
        if (data) {
          setStakeholder(data);
          setFormData({
            name: data.name || "",
            address: data.address || "",
            process_id: data.process_id?.toString() || "",
            parent_stakeholder_id: data.parent_stakeholder_id?.toString() || "",
            kam_id: data.kam_id || "", // Changed from issue_handler_id
            is_active: data.is_active ?? true,
          });
          setContactPersons(data.contact_persons || []);
        }
      } catch (error) {
        console.error("Error loading stakeholder:", error);
        setErrors({ submit: "Failed to load stakeholder data" });
      } finally {
        setLoadingStakeholder(false);
      }
    };

    loadData();
  }, [stakeholderId, fetchProcesses, fetchEmployees, fetchStakeholderById]);

  const handleAddContactPerson = () => {
    setContactPersons([
      ...contactPersons,
      { name: "", email: "", phone: "" },
    ]);
  };

  const handleRemoveContactPerson = (index: number) => {
    setContactPersons(contactPersons.filter((_, i) => i !== index));
  };

  const handleContactPersonChange = (
    index: number,
    field: keyof ContactPerson,
    value: string
  ) => {
    const updated = [...contactPersons];
    updated[index] = { ...updated[index], [field]: value };
    setContactPersons(updated);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.process_id) {
      newErrors.process_id = "Please select a process";
    }

    // Validate contact persons
    contactPersons.forEach((cp, index) => {
      if (cp.name && !cp.email && !cp.phone) {
        newErrors[`contact_${index}`] = "Contact person must have email or phone";
      }
      if (cp.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cp.email)) {
        newErrors[`contact_${index}_email`] = "Invalid email format";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      // FunnelSimple out empty contact persons
      const validContactPersons = contactPersons.filter(
        (cp) => cp.name.trim() && (cp.email?.trim() || cp.phone?.trim())
      );

      await updateStakeholder(stakeholderId, {
        name: formData.name.trim(),
        address: formData.address.trim() || undefined,
        process_id: parseInt(formData.process_id),
        parent_stakeholder_id: formData.parent_stakeholder_id ? parseInt(formData.parent_stakeholder_id) : undefined,
        contact_persons: validContactPersons,
        is_active: formData.is_active,
        kam_id: formData.kam_id || undefined, // Changed from issue_handler_id
      });

      router.push(`/admin/stakeholders/${stakeholderId}`);
    } catch (error) {
      console.error("Error updating stakeholder:", error);
      setErrors({ submit: "Failed to update stakeholder. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingStakeholder) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner text="Loading stakeholder..." />
      </div>
    );
  }

  if (!stakeholder) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto text-center py-12">
          <WarningCircle className="mx-auto text-foreground-tertiary" size={48} />
          <h2 className="text-xl font-bold text-foreground-primary mt-4">Stakeholder Not Found</h2>
          <p className="text-foreground-secondary mt-2">
            The stakeholder you're trying to edit doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => router.push("/admin/stakeholders")}
            className="mt-6 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Back to Stakeholders
          </button>
        </div>
      </div>
    );
  }

  // Show error if no processes exist
  if (!loading && activeProcesses.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-foreground-secondary hover:text-foreground-primary mb-6"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="max-w-2xl mx-auto">
          <div className="bg-warning/10 border-2 border-warning/30 dark:bg-warning/20 rounded-lg p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-warning/20 rounded-full mb-4">
              <WarningCircle className="text-warning" size={32} />
            </div>
            <h2 className="text-xl font-bold text-foreground-primary mb-2">
              No Stakeholder Processes Found
            </h2>
            <p className="text-foreground-secondary mb-6">
              You need to have at least one active stakeholder process to edit this stakeholder.
            </p>
            <button
              onClick={() => router.push("/admin/config/stakeholder-process")}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
            >
              Go to Process Management
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-foreground-secondary hover:text-foreground-primary mb-6"
      >
        <ArrowLeft size={20} />
        Back
      </button>

      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground-primary mb-6">Edit Stakeholder</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-surface-primary rounded-lg border border-border-primary p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground-primary">Basic Information</h2>

            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-2">
                Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none ${
                  errors.name ? "border-error" : "border-border-secondary"
                }`}
                placeholder="Enter stakeholder/company name"
              />
              {errors.name && (
                <p className="text-error text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-2">
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-border-secondary rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="Enter full address (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-2">
                Process <span className="text-error">*</span>
              </label>
              <select
                value={formData.process_id}
                onChange={(e) => setFormData({ ...formData, process_id: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none ${
                  errors.process_id ? "border-error" : "border-border-secondary"
                }`}
              >
                <option value="">Select a process</option>
                {activeProcesses.map((process) => (
                  <option key={process.id} value={process.id}>
                    {process.name} ({process.is_sequential ? "Sequential" : "Independent"})
                  </option>
                ))}
              </select>
              {errors.process_id && (
                <p className="text-error text-sm mt-1">{errors.process_id}</p>
              )}
              <p className="text-foreground-tertiary text-sm mt-1">
                Select the workflow process this stakeholder follows
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-2">
                Parent Stakeholder
              </label>
              <select
                value={formData.parent_stakeholder_id}
                onChange={(e) => setFormData({ ...formData, parent_stakeholder_id: e.target.value })}
                className="w-full px-4 py-2 border border-border-secondary rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              >
                <option value="">None (No parent stakeholder)</option>
                {stakeholders.filter(s => s.id !== stakeholderId && s.status !== 'Rejected').map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.status})
                  </option>
                ))}
              </select>
              <p className="text-foreground-tertiary text-sm mt-1">
                Optional parent stakeholder for hierarchical relationships
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-2">
                Key Accounts Manager (KAM)
              </label>
              <select
                value={formData.kam_id}
                onChange={(e) => setFormData({ ...formData, kam_id: e.target.value })}
                className="w-full px-4 py-2 border border-border-secondary rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              >
                <option value="">None (No KAM assigned)</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
              <p className="text-foreground-tertiary text-sm mt-1">
                Assign a Key Accounts Manager who will receive notifications for any changes
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded border-border-secondary focus:ring-2 focus:ring-primary-500"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-foreground-secondary">
                Active
              </label>
              <p className="text-foreground-tertiary text-sm ml-2">
                (Inactive stakeholders are hidden from most views)
              </p>
            </div>
          </div>

          {/* Contact Persons */}
          <div className="bg-surface-primary rounded-lg border border-border-primary p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground-primary">Contact Persons</h2>
              <button
                type="button"
                onClick={handleAddContactPerson}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-primary-50 dark:hover:bg-primary-950 rounded transition-colors"
              >
                <Plus size={16} />
                Add Contact
              </button>
            </div>

            {contactPersons.length === 0 ? (
              <div className="text-center py-8 text-foreground-tertiary text-sm">
                No contact persons added yet. Click "Add Contact" to add one.
              </div>
            ) : (
              <div className="space-y-4">
                {contactPersons.map((contact, index) => (
                  <div
                    key={index}
                    className="border border-border-primary rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground-secondary">
                        Contact Person {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveContactPerson(index)}
                        className="text-error hover:text-error/80 p-1"
                      >
                        <TrashSimple size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-foreground-secondary mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          value={contact.name}
                          onChange={(e) =>
                            handleContactPersonChange(index, "name", e.target.value)
                          }
                          className="w-full px-3 py-2 text-sm border border-border-secondary rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                          placeholder="Full name"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-foreground-secondary mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={contact.email || ""}
                          onChange={(e) =>
                            handleContactPersonChange(index, "email", e.target.value)
                          }
                          className={`w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none ${
                            errors[`contact_${index}_email`]
                              ? "border-error"
                              : "border-border-secondary"
                          }`}
                          placeholder="email@example.com"
                        />
                        {errors[`contact_${index}_email`] && (
                          <p className="text-error text-xs mt-1">
                            {errors[`contact_${index}_email`]}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-foreground-secondary mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={contact.phone || ""}
                          onChange={(e) =>
                            handleContactPersonChange(index, "phone", e.target.value)
                          }
                          className="w-full px-3 py-2 text-sm border border-border-secondary rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                          placeholder="+1234567890"
                        />
                      </div>
                    </div>

                    {errors[`contact_${index}`] && (
                      <p className="text-error text-xs">{errors[`contact_${index}`]}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-lg dark:bg-error/20">
              {errors.submit}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-border-secondary text-foreground-secondary rounded-lg hover:bg-background-secondary dark:bg-background-tertiary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
