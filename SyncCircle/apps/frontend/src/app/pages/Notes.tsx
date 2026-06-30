import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  FolderOpen,
  FileText,
  Trash2,
  ChevronDown,
  ChevronRight,
  Edit3,
  X,
  Check,
  Users,
} from "lucide-react";
import { AISummarizeButton } from "../components/AISummarizeButton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import {
  getNotes,
  saveNote,
  deleteNote,
  getFolders,
  saveFolder,
  deleteFolder,
  getUser,
  getGroups,
} from "../lib/storage";
import { useWorkato } from "../hooks/useWorkato";
import type { Note, Folder, User, StudyGroup } from "../types";

const FOLDER_COLORS = [
  "#b8a4d4",
  "#d4e8f4",
  "#f4b8d0",
  "#fef4d4",
  "#d4f4e8",
  "#f4d4b8",
  "#c4d4f4",
  "#e8d4f4",
];

export function Notes() {
  const [user, setUser] = useState<User | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const { syncNote } = useWorkato();

  // Folder creation state
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);

  // Note creation state
  const [creatingNoteInFolder, setCreatingNoteInFolder] = useState<string | null>(null);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");

  // Shared Notes state
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Note editing state
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);
    reloadData(currentUser);
  }, []);

  function reloadData(currentUser: User | null) {
    if (!currentUser) return;
    const allFolders = getFolders().filter(
      (f) => f.type === "personal" && f.ownerId === currentUser.id
    );
    const userNotes = getNotes().filter((n) => n.ownerId === currentUser.id);
    setFolders(allFolders);
    setNotes(userNotes);
    setGroups(getGroups());
    setAllNotes(getNotes());
  }

  function toggleFolder(folderId: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }

  function toggleGroup(groupId: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  // --- Folder CRUD ---

  function handleCreateFolder() {
    if (!newFolderName.trim() || !user) return;
    const folder: Folder = {
      id: crypto.randomUUID(),
      name: newFolderName.trim(),
      color: newFolderColor,
      ownerId: user.id,
      type: "personal",
    };
    saveFolder(folder);
    setShowNewFolder(false);
    setNewFolderName("");
    setNewFolderColor(FOLDER_COLORS[0]);
    reloadData(user);
    setExpandedFolders((prev) => new Set([...prev, folder.id]));
  }

  function handleDeleteFolder(folderId: string) {
    // Delete all notes in this folder too
    const notesInFolder = notes.filter((n) => n.folderId === folderId);
    notesInFolder.forEach((n) => deleteNote(n.id));
    deleteFolder(folderId);
    reloadData(user);
  }

  // --- Note CRUD ---

  function handleCreateNote(folderId: string) {
    if (!newNoteTitle.trim() || !user) return;
    const note: Note = {
      id: crypto.randomUUID(),
      title: newNoteTitle.trim(),
      content: newNoteContent,
      folderId,
      ownerId: user.id,
      sharedGroupIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveNote(note);
    syncNote('create', note);
    setCreatingNoteInFolder(null);
    setNewNoteTitle("");
    setNewNoteContent("");
    reloadData(user);
  }

  function handleEditNote() {
    if (!editingNote || !editTitle.trim() || !user) return;
    const updated: Note = {
      ...editingNote,
      title: editTitle.trim(),
      content: editContent,
      updatedAt: new Date().toISOString(),
    };
    saveNote(updated);
    syncNote('update', updated);
    setEditingNote(null);
    reloadData(user);
  }

  function handleDeleteNote(noteId: string) {
    deleteNote(noteId);
    if (editingNote?.id === noteId) setEditingNote(null);
    reloadData(user);
  }

  function openEditNote(note: Note) {
    setEditingNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
  }

  function handleSummaryGenerated(summary: string) {
    if (!editingNote || !user) return;
    const updated: Note = {
      ...editingNote,
      summary,
      updatedAt: new Date().toISOString(),
    };
    saveNote(updated);
    setEditingNote(updated);
    reloadData(user);
  }

  // Group notes by folderId
  function getNotesForFolder(folderId: string) {
    return notes.filter((n) => n.folderId === folderId);
  }

  const unfiledNotes = notes.filter(
    (n) => !n.folderId || !folders.some((f) => f.id === n.folderId)
  );

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-1">Notes</h1>
        <p className="text-muted-foreground mb-6">
          Organize your study notes by topic
        </p>
      </motion.div>

      <Tabs defaultValue="user-notes">
        <TabsList className="mb-6">
          <TabsTrigger value="user-notes">User's Notes</TabsTrigger>
          <TabsTrigger value="shared-notes">Shared Notes</TabsTrigger>
        </TabsList>

        {/* ===== User's Notes Tab ===== */}
        <TabsContent value="user-notes">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Create Folder Button */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setShowNewFolder(true)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:shadow-lg transition-all flex items-center gap-2 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Create Folder
              </button>
            </div>

            {/* New Folder Form */}
            <AnimatePresence>
              {showNewFolder && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-card rounded-xl border border-border p-4 space-y-3"
                >
                  <h3 className="text-sm font-semibold">New Folder</h3>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Folder name..."
                    className="w-full px-3 py-2 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateFolder();
                      if (e.key === "Escape") setShowNewFolder(false);
                    }}
                  />
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Color</p>
                    <div className="flex gap-2 flex-wrap">
                      {FOLDER_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setNewFolderColor(color)}
                          className={`w-7 h-7 rounded-full border-2 transition-all ${
                            newFolderColor === color
                              ? "border-primary scale-110"
                              : "border-transparent"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateFolder}
                      disabled={!newFolderName.trim()}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setShowNewFolder(false);
                        setNewFolderName("");
                      }}
                      className="px-3 py-1.5 rounded-lg hover:bg-accent text-sm flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Folders with Notes */}
            {folders.map((folder) => {
              const folderNotes = getNotesForFolder(folder.id);
              const isExpanded = expandedFolders.has(folder.id);

              return (
                <motion.div
                  key={folder.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-xl border border-border overflow-hidden"
                >
                  {/* Folder Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/30 transition-colors"
                    onClick={() => toggleFolder(folder.id)}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: folder.color }}
                      />
                      <FolderOpen className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{folder.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({folderNotes.length})
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCreatingNoteInFolder(folder.id);
                          setExpandedFolders((prev) =>
                            new Set([...prev, folder.id])
                          );
                        }}
                        className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                        title="Create note"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                        title="Delete folder"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Folder Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-2">
                          {/* Create Note Form */}
                          {creatingNoteInFolder === folder.id && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="p-3 rounded-lg border border-border bg-accent/20 space-y-2"
                            >
                              <input
                                type="text"
                                value={newNoteTitle}
                                onChange={(e) =>
                                  setNewNoteTitle(e.target.value)
                                }
                                placeholder="Note title..."
                                className="w-full px-3 py-1.5 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 text-sm"
                                autoFocus
                              />
                              <textarea
                                value={newNoteContent}
                                onChange={(e) =>
                                  setNewNoteContent(e.target.value)
                                }
                                placeholder="Note content..."
                                rows={3}
                                className="w-full px-3 py-1.5 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 text-sm resize-none"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    handleCreateNote(folder.id)
                                  }
                                  disabled={!newNoteTitle.trim()}
                                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setCreatingNoteInFolder(null);
                                    setNewNoteTitle("");
                                    setNewNoteContent("");
                                  }}
                                  className="px-3 py-1.5 rounded-lg hover:bg-accent text-sm flex items-center gap-1"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Cancel
                                </button>
                              </div>
                            </motion.div>
                          )}

                          {/* Notes list */}
                          {folderNotes.length === 0 &&
                            creatingNoteInFolder !== folder.id && (
                              <p className="text-sm text-muted-foreground py-2 pl-2">
                                No notes yet. Click + to add one.
                              </p>
                            )}
                          {folderNotes.map((note) => (
                            <NoteCard
                              key={note.id}
                              note={note}
                              onEdit={() => openEditNote(note)}
                              onDelete={() => handleDeleteNote(note.id)}
                              formatDate={formatDate}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {/* Unfiled Notes Section */}
            {unfiledNotes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl border border-border overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Unfiled</span>
                    <span className="text-xs text-muted-foreground">
                      ({unfiledNotes.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {unfiledNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        onEdit={() => openEditNote(note)}
                        onDelete={() => handleDeleteNote(note.id)}
                        formatDate={formatDate}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Empty state */}
            {folders.length === 0 && unfiledNotes.length === 0 && (
              <div className="text-center py-16">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">No notes yet</h3>
                <p className="text-muted-foreground text-sm">
                  Create a folder to start organizing your notes.
                </p>
              </div>
            )}
          </motion.div>
        </TabsContent>

        {/* ===== Shared Notes Tab ===== */}
        <TabsContent value="shared-notes">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Join Group Button */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setShowJoinGroup(true)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:shadow-lg transition-all flex items-center gap-2 text-sm font-medium"
              >
                <Users className="w-4 h-4" />
                Join Group
              </button>
            </div>

            {/* Group Sections */}
            {(() => {
              const userGroups = groups.filter(
                (g) => user && g.members.includes(user.id)
              );

              if (userGroups.length === 0) {
                return (
                  <div className="text-center py-16">
                    <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-medium mb-2">No shared notes</h3>
                    <p className="text-muted-foreground text-sm">
                      Join a study group to see shared materials.
                    </p>
                  </div>
                );
              }

              return userGroups.map((group) => {
                const groupNotes = allNotes.filter((n) =>
                  n.sharedGroupIds.includes(group.id)
                );
                const isExpanded = expandedGroups.has(group.id);

                return (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-xl border border-border overflow-hidden"
                  >
                    {/* Group Header */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/30 transition-colors"
                      onClick={() => toggleGroup(group.id)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{group.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({groupNotes.length})
                        </span>
                      </div>
                    </div>

                    {/* Group Notes */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-2">
                            {groupNotes.length === 0 && (
                              <p className="text-sm text-muted-foreground py-2 pl-2">
                                No notes shared in this group yet.
                              </p>
                            )}
                            {groupNotes.map((note) => (
                              <div
                                key={note.id}
                                className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/30 transition-colors"
                              >
                                <FileText className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium truncate">
                                    {note.title}
                                  </h4>
                                  {note.content && (
                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                      {note.content}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground/70 mt-1">
                                    By {note.ownerId} · {formatDate(note.updatedAt)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              });
            })()}
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Note Edit Modal */}
      <AnimatePresence>
        {editingNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-8"
            onClick={() => setEditingNote(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="text-xl font-bold w-full bg-transparent border-none outline-none"
                  placeholder="Note title..."
                />
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-[250px] bg-transparent border-none outline-none resize-none text-sm leading-relaxed"
                  placeholder="Write your note content here..."
                />
                <AISummarizeButton
                  noteContent={editContent}
                  existingSummary={editingNote.summary}
                  onSummaryGenerated={handleSummaryGenerated}
                />
              </div>
              <div className="p-4 border-t border-border flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Last edited: {formatDate(editingNote.updatedAt)}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingNote(null)}
                    className="px-4 py-2 rounded-xl hover:bg-accent transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditNote}
                    disabled={!editTitle.trim()}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:shadow-lg transition-all text-sm font-medium disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- NoteCard Component (no emote/react icons) ---

function NoteCard({
  note,
  onEdit,
  onDelete,
  formatDate,
}: {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
  formatDate: (iso: string) => string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/30 transition-colors group">
      <FileText className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
        <h4 className="text-sm font-medium truncate">{note.title}</h4>
        {note.content && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {note.content}
          </p>
        )}
        <p className="text-xs text-muted-foreground/70 mt-1">
          {formatDate(note.createdAt)}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-1 rounded hover:bg-accent transition-colors"
          title="Edit note"
        >
          <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={onDelete}
          className="p-1 rounded hover:bg-destructive/10 transition-colors"
          title="Delete note"
        >
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </button>
      </div>
    </div>
  );
}
