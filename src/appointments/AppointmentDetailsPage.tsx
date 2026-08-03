import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import {
  canAddCommentVisibility,
  canSeeInternalDiagnostics,
  canSeeInternalNotes,
  editableFieldsForRecord,
  fieldLabel,
  isSupplierActor,
  skuTotals,
  transportReconciliation,
  visibleChangeHistory,
  visibleComments,
  visibleStatusHistory,
  type WorkspaceCommentVisibility,
  type WorkspaceSafeField,
} from './appointmentWorkspace';
import { useAppointmentWorkspace } from './AppointmentWorkspaceProvider';

const defaultEditReason = 'Correct approved local detail evidence';
const defaultCommentReason = 'Add explicit local comment evidence';

function displayFieldValue(
  record: NonNullable<ReturnType<ReturnType<typeof useAppointmentWorkspace>['getVisibleRecord']>>,
  field: WorkspaceSafeField,
): string {
  if (field === 'tractorRegistration') {
    return record.supplierTransportDetails.tractorRegistration;
  }
  if (field === 'trailerOrContainerRegistration') {
    return record.supplierTransportDetails.trailerOrContainerRegistration;
  }
  return record[field];
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const id = `detail-${title.toLocaleLowerCase('en-US').replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200" aria-labelledby={id}>
      <h2 id={id} className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function AppointmentDetailsPage() {
  const { appointmentId = '' } = useParams<{ appointmentId: string }>();
  const {
    activeActor,
    configuration,
    canViewAppointment,
  } = useDemoDomain();
  const {
    getVisibleRecord,
    updateField,
    addComment,
  } = useAppointmentWorkspace();
  const record = getVisibleRecord(appointmentId);
  const [editField, setEditField] = useState<WorkspaceSafeField | ''>('');
  const [editValue, setEditValue] = useState('');
  const [editReason, setEditReason] = useState(defaultEditReason);
  const [commentVisibility, setCommentVisibility] = useState<WorkspaceCommentVisibility | ''>('');
  const [commentText, setCommentText] = useState('');
  const [commentReason, setCommentReason] = useState(defaultCommentReason);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setEditField('');
    setEditValue('');
    setEditReason(defaultEditReason);
    setCommentVisibility('');
    setCommentText('');
    setCommentReason(defaultCommentReason);
    setMessage(null);
  }, [activeActor.id, appointmentId]);

  const warehouse = record
    ? configuration.warehouses.find((candidate) => candidate.id === record.warehouseId)
    : undefined;
  const editableFields = useMemo(() => record && warehouse
    ? editableFieldsForRecord(activeActor, record, warehouse)
    : [], [activeActor, record, warehouse]);

  if (!record || !canViewAppointment(record)) return null;

  const totals = skuTotals(record);
  const reconciliation = transportReconciliation(record);
  const comments = visibleComments(record, activeActor);
  const statusHistory = visibleStatusHistory(record, activeActor);
  const changeHistory = visibleChangeHistory(record, activeActor);
  const showInternalDiagnostics = canSeeInternalDiagnostics(activeActor);
  const showInternalNotes = canSeeInternalNotes(activeActor);
  const supplierActor = isSupplierActor(activeActor);

  const submitEdit = () => {
    if (!editField) {
      setMessage('Select an approved safe field before applying an edit.');
      return;
    }
    const error = updateField(record.id, editField, editValue, editReason);
    setMessage(error ?? 'Safe detail evidence updated in local memory only. No lifecycle, slot, gate or persistence action occurred.');
    if (!error) setEditValue('');
  };

  const submitComment = () => {
    const error = addComment(
      record.id,
      commentVisibility,
      commentText,
      commentReason,
    );
    setMessage(error ?? 'Comment evidence added in local memory only. No notification or durable write occurred.');
    if (!error) {
      setCommentText('');
      setCommentVisibility('');
    }
  };

  return (
    <div className="mx-auto max-w-7xl" aria-labelledby="appointment-detail-title">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/appointments" className="text-sm font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
            ← Back to appointments
          </Link>
          <p className="mt-4 text-sm font-medium text-[#023466]">Planning-aware local detail</p>
          <h1 id="appointment-detail-title" className="mt-1 text-2xl font-semibold text-gray-900">
            {record.systemReference}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {record.purchaseOrderNumber} · {record.warehouseName} · {record.plannedDate} {record.plannedTime} {record.timeZone}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full border border-gray-300 px-3 py-1">Lifecycle: {record.lifecycleStatus}</span>
          <span className="rounded-full border border-gray-300 px-3 py-1">Planning: {record.planningState}</span>
          <span className="rounded-full border border-gray-300 px-3 py-1">Operational: {record.operationalStatus}</span>
        </div>
      </div>

      <p className="mb-6 rounded-md border border-gray-300 bg-gray-50 p-4 text-sm text-gray-700">
        This detail is demonstrational local evidence. Display readiness does not authorize approval, reschedule,
        cancellation, dock, gate, capacity or operational actions.
      </p>

      {message && (
        <p role="status" tabIndex={-1} className="mb-6 rounded-md border border-gray-300 bg-white p-4 text-sm text-gray-800">
          {message}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <DetailSection title="Overview">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="font-semibold text-gray-700">Next required action</dt><dd>{record.requiredAction}</dd></div>
            <div><dt className="font-semibold text-gray-700">External reference</dt><dd>{record.externalReference}</dd></div>
            <div><dt className="font-semibold text-gray-700">Supplier</dt><dd>{record.supplierName}</dd></div>
            <div><dt className="font-semibold text-gray-700">Carrier</dt><dd>{record.carrierName}</dd></div>
            <div><dt className="font-semibold text-gray-700">Delivery type</dt><dd>{record.deliveryType}</dd></div>
            <div><dt className="font-semibold text-gray-700">Dock</dt><dd>{record.assignedDockId ?? 'Not assigned'}</dd></div>
          </dl>
        </DetailSection>

        <DetailSection title="Delivery Data">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="font-semibold text-gray-700">Booking origin</dt><dd>{record.bookingOrigin}</dd></div>
            <div><dt className="font-semibold text-gray-700">Source kind</dt><dd>{record.sourceKind}</dd></div>
            <div><dt className="font-semibold text-gray-700">Planning readiness</dt><dd>{record.planningState}</dd></div>
            <div><dt className="font-semibold text-gray-700">Change status</dt><dd>{record.changeStatus}</dd></div>
            <div><dt className="font-semibold text-gray-700">Contact</dt><dd>{record.contactName || 'Not provided'}</dd></div>
            <div><dt className="font-semibold text-gray-700">Phone</dt><dd>{record.phone || 'Not provided'}</dd></div>
          </dl>
        </DetailSection>

        <DetailSection title="Transport">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="font-semibold text-gray-700">Driver</dt><dd>{record.driverIdentification || 'Not provided'}</dd></div>
            <div><dt className="font-semibold text-gray-700">Tractor registration</dt><dd>{record.supplierTransportDetails.tractorRegistration}</dd></div>
            <div><dt className="font-semibold text-gray-700">Trailer or container</dt><dd>{record.supplierTransportDetails.trailerOrContainerRegistration}</dd></div>
            <div><dt className="font-semibold text-gray-700">Supplier-origin authority</dt><dd>Preserved</dd></div>
          </dl>
          {showInternalDiagnostics ? (
            <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
              <p className="font-semibold text-gray-800">Local reconciliation evidence</p>
              <p className="mt-1 text-gray-600">Requires decision: {reconciliation.requiresDecision ? 'Yes' : 'No'}</p>
              <ul className="mt-2 space-y-1 text-gray-700">
                {reconciliation.fields.map((field) => (
                  <li key={field.field}>
                    {fieldLabel(field.field)} · Supplier: {field.supplierValue || 'Not provided'} · Imported: {field.importedValue || 'Not provided'} · {field.status}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-600">Administrator reconciliation diagnostics are not available in this role.</p>
          )}
        </DetailSection>

        <DetailSection title="Orders and References">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="font-semibold text-gray-700">Purchase order</dt><dd>{record.purchaseOrderNumber}</dd></div>
            <div><dt className="font-semibold text-gray-700">ASN</dt><dd>{record.asnNumber || 'Not provided'}</dd></div>
            <div><dt className="font-semibold text-gray-700">System reference</dt><dd>{record.systemReference}</dd></div>
            <div><dt className="font-semibold text-gray-700">External reference</dt><dd>{record.externalReference}</dd></div>
          </dl>
        </DetailSection>

        <DetailSection title="Quantities">
          {totals ? (
            <>
              <p className="text-sm text-gray-700">{totals.lineCount} SKU lines · {totals.units} units · {totals.pallets} pallets</p>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead><tr>{['SKU', 'Description', 'Units', 'Pallets', 'Load carrier', 'Goods category'].map((heading) => <th key={heading} className="px-3 py-2 text-left font-semibold text-gray-800">{heading}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {record.skuLines.map((line) => (
                      <tr key={line.id}>
                        <td className="px-3 py-2">{line.sku}</td>
                        <td className="px-3 py-2">{line.description}</td>
                        <td className="px-3 py-2">{line.units}</td>
                        <td className="px-3 py-2">{line.pallets}</td>
                        <td className="px-3 py-2">{line.loadCarrierType}</td>
                        <td className="px-3 py-2">{line.goodsCategory}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm font-medium text-gray-700">Awaiting SKU details</p>
          )}
        </DetailSection>

        <DetailSection title="Documents">
          <ul className="space-y-2 text-sm text-gray-700">
            {record.documents.map((document) => (
              <li key={document.id}>{document.name} · {document.status} · display-only metadata</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-gray-500">No upload, download or document storage action is available.</p>
        </DetailSection>

        <DetailSection title="Comments">
          {comments.length === 0 ? (
            <p className="text-sm text-gray-600">No comments visible to the active actor.</p>
          ) : (
            <ul className="space-y-2 text-sm text-gray-700">
              {comments.map((comment) => (
                <li key={comment.id} className="rounded-md border border-gray-200 p-3">
                  <strong>{comment.visibility}</strong> · {comment.text}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 grid gap-3">
            <label className="text-sm font-semibold text-gray-800">
              Comment visibility
              <select aria-label="Comment visibility" value={commentVisibility} onChange={(event) => setCommentVisibility(event.target.value as WorkspaceCommentVisibility | '')} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal">
                <option value="">Select visibility</option>
                <option value="SHARED_COMMENT">Shared Comment</option>
                {canAddCommentVisibility(activeActor, 'INTERNAL_NOTE') && <option value="INTERNAL_NOTE">Internal Note</option>}
              </select>
            </label>
            <label className="text-sm font-semibold text-gray-800">Comment text<textarea aria-label="Comment text" value={commentText} onChange={(event) => setCommentText(event.target.value)} className="mt-1 min-h-24 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" /></label>
            <label className="text-sm font-semibold text-gray-800">Comment reason<input aria-label="Comment reason" value={commentReason} onChange={(event) => setCommentReason(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" /></label>
            <button type="button" onClick={submitComment} className="w-fit rounded-md bg-[#023466] px-4 py-2 text-sm font-semibold text-white">Add local comment</button>
          </div>
        </DetailSection>

        <DetailSection title="Status History">
          {statusHistory.length === 0 ? <p className="text-sm text-gray-600">No status history is visible.</p> : (
            <ol className="space-y-2 text-sm text-gray-700">
              {statusHistory.map((entry) => <li key={entry.id}>{entry.category} · {entry.from} → {entry.to} · {entry.reason}</li>)}
            </ol>
          )}
        </DetailSection>

        <DetailSection title="Change History">
          {changeHistory.length === 0 ? <p className="text-sm text-gray-600">No local changes have been applied.</p> : (
            <ol className="space-y-2 text-sm text-gray-700">
              {changeHistory.map((entry) => (
                <li key={entry.id}>{entry.sequence}. {entry.action} · {entry.field ?? entry.visibility} · {entry.before || 'Empty'} → {entry.after} · {entry.reason}</li>
              ))}
            </ol>
          )}
        </DetailSection>

        <DetailSection title="Audit Metadata">
          {showInternalDiagnostics ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="font-semibold text-gray-700">Created by</dt><dd>{record.createdBy}</dd></div>
              <div><dt className="font-semibold text-gray-700">Created at</dt><dd>{record.createdAt}</dd></div>
              <div><dt className="font-semibold text-gray-700">Last changed</dt><dd>{record.lastChangedAt}</dd></div>
              <div><dt className="font-semibold text-gray-700">Import diagnostic</dt><dd>{record.importDiagnostic ?? 'Not applicable'}</dd></div>
              <div><dt className="font-semibold text-gray-700">Batch lineage</dt><dd>{record.batchLineage ?? 'Not applicable'}</dd></div>
              <div><dt className="font-semibold text-gray-700">Internal planning note</dt><dd>{record.internalPlanningNote ?? 'Not applicable'}</dd></div>
            </dl>
          ) : (
            <p className="text-sm text-gray-600">Technical audit metadata is not available in this role.</p>
          )}
        </DetailSection>
      </div>

      <section className="mt-6 rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200" aria-labelledby="safe-edit-title">
        <h2 id="safe-edit-title" className="text-lg font-semibold text-gray-900">Safe inline edit</h2>
        {editableFields.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">No safe inline field is editable for this actor and operational state.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="text-sm font-semibold text-gray-800">
              Safe field
              <select aria-label="Safe field" value={editField} onChange={(event) => {
                const field = event.target.value as WorkspaceSafeField | '';
                setEditField(field);
                setEditValue(field ? displayFieldValue(record, field) : '');
              }} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal">
                <option value="">Select field</option>
                {editableFields.map((field) => <option key={field} value={field}>{fieldLabel(field)}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold text-gray-800">Replacement value<input aria-label="Replacement value" value={editValue} onChange={(event) => setEditValue(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" /></label>
            <label className="text-sm font-semibold text-gray-800">Edit reason<input aria-label="Edit reason" value={editReason} onChange={(event) => setEditReason(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" /></label>
            <button type="button" onClick={submitEdit} className="w-fit rounded-md bg-[#023466] px-4 py-2 text-sm font-semibold text-white">Apply safe local edit</button>
          </div>
        )}
        <p className="mt-3 text-xs text-gray-500">
          Pallets, delivery type, slot, statuses, approval, cancellation, reschedule, dock, gate and capacity remain read-only.
        </p>
      </section>

      {supplierActor && !showInternalNotes && (
        <p className="mt-6 rounded-md border border-gray-300 bg-gray-50 p-4 text-sm text-gray-700">
          Supplier-safe view: Internal Notes, import diagnostics, technical lineage, Security evidence and other organizations are excluded.
        </p>
      )}
    </div>
  );
}
