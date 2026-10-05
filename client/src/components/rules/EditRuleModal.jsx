import React, { useState, useEffect } from 'react';
import { X, Sliders, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { ruleService } from '../../services/ruleService.js';

export const EditRuleModal = ({
  isOpen,
  onClose,
  rule,
  onRuleUpdated
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    severity: 'MEDIUM',
    weight: 20,
    isEnabled: true,
    parametersJson: '{}'
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name || '',
        description: rule.description || '',
        severity: rule.severity || 'MEDIUM',
        weight: rule.weight || 20,
        isEnabled: rule.isEnabled !== false,
        parametersJson: JSON.stringify(rule.parameters || {}, null, 2)
      });
      setError('');
    }
  }, [rule]);

  if (!isOpen || !rule) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let parsedParams = {};
    try {
      parsedParams = JSON.parse(formData.parametersJson);
    } catch (err) {
      setError('Parameters must be a valid JSON object: ' + err.message);
      return;
    }

    try {
      setSubmitting(true);
      const updatePayload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        severity: formData.severity,
        weight: Number(formData.weight),
        isEnabled: formData.isEnabled,
        parameters: parsedParams
      };

      const res = await ruleService.updateRule(rule._id, updatePayload);
      if (onRuleUpdated) {
        onRuleUpdated(res.data);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update rule.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Configure Rule</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-300">
                  {rule.ruleCode}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Modify dynamic thresholds, weights, and detection parameters
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Rule Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Description / Detection Intent</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Severity Classification</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Score Contribution Weight (1 - 50)</label>
              <input
                type="number"
                min="1"
                max="50"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-semibold">Configurable Parameters (JSON)</label>
              <span className="text-[10px] text-slate-500 font-mono">Dynamic hot-reload</span>
            </div>
            <textarea
              rows={5}
              value={formData.parametersJson}
              onChange={(e) => setFormData({ ...formData, parametersJson: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono text-[11px] focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isEnabledCheck"
              checked={formData.isEnabled}
              onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
              className="h-4 w-4 rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="isEnabledCheck" className="text-slate-300 cursor-pointer select-none">
              Rule is active and evaluated during transaction ingestion pipeline
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save & Invalidate Cache</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRuleModal;
