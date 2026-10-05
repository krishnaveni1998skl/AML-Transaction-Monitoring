import React, { useState } from 'react';
import { MessageSquare, Send, Tag, Clock, User, ShieldAlert } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters.js';

export const NotesThread = ({ notes = [], onAddNote, loading = false }) => {
  const [noteText, setNoteText] = useState('');
  const [selectedTag, setSelectedTag] = useState('Triage');

  const availableTags = [
    'Triage',
    'CustomerContacted',
    'SourceOfFundsVerified',
    'SanctionsCheck',
    'LayeringAnalysis',
    'LegitimateCommercial',
    'SuspiciousStructuring'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    onAddNote({
      noteText: noteText.trim(),
      actionTaken: 'NOTE_ADDED',
      tags: [selectedTag]
    });
    setNoteText('');
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'ESCALATED_TO_COMPLIANCE':
        return <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40">Escalated</span>;
      case 'FLAGGED_AS_SAR':
        return <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">SAR Candidate</span>;
      case 'ASSIGNED':
        return <span className="px-2 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/40">Assigned</span>;
      case 'CLOSED_FALSE_POSITIVE':
        return <span className="px-2 py-0.5 rounded text-[10px] bg-slate-500/20 text-slate-300 border border-slate-600">False Positive</span>;
      case 'CLOSED_LEGITIMATE':
        return <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Legitimate</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">Case Note</span>;
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-indigo-400" />
          Investigation Notes & Audit Trail
        </h4>
        <span className="text-xs font-mono text-slate-400">{notes.length} record(s)</span>
      </div>

      {/* Add Note Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          rows={3}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Enter investigation observations, document verifications, or analyst reasoning..."
          className="w-full rounded-lg bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
        />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-md px-2 py-1 focus:outline-none focus:border-indigo-500"
            >
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={!noteText.trim() || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition"
          >
            <Send className="h-3.5 w-3.5" />
            Add Note
          </button>
        </div>
      </form>

      {/* Timeline List */}
      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
        {notes.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            No notes logged for this alert yet.
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note._id}
              className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3.5 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium text-slate-200">
                  <User className="h-3.5 w-3.5 text-indigo-400" />
                  <span>{note.authorName}</span>
                  {getActionBadge(note.actionTaken)}
                </div>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDateTime(note.timestamp || note.createdAt)}
                </span>
              </div>

              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{note.noteText}</p>

              {note.tags && note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {note.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotesThread;
