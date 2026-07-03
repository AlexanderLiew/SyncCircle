import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  FolderOpen,
  FileText,
  Upload,
  Trash2,
  ChevronDown,
  ChevronRight,
  Edit3,
  X,
  Check,
  Users,
  Search,
  UserPlus,
  Bell,
  UserCheck,
  UserX,
  Download,
} from "lucide-react";
import { AISummarizeButton } from "../components/AISummarizeButton";
import { NoteFileUpload, type FileAttachment } from "../components/NoteFileUpload";
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
  saveGroup,
  getGroupFolders,
  saveGroupFolder,
  deleteGroupFolder,
  getGroupNotes,
  saveGroupNote,
  deleteGroupNote,
} from "../lib/storage";
import type { Note, Folder, User, StudyGroup, GroupFolder, GroupNote } from "../types";

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

  // Folder creation state
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);

  // Note creation state
  const [creatingNoteInFolder, setCreatingNoteInFolder] = useState<string | null>(null);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");

  // File upload state
  const [uploadingInFolder, setUploadingInFolder] = useState<string | null>(null);

  // Note editing state (personal)
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  // Shared Notes state
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedGroupFolders, setExpandedGroupFolders] = useState<Set<string>>(new Set());
  const [groupFoldersMap, setGroupFoldersMap] = useState<Record<string, GroupFolder[]>>({});
  const [groupNotesMap, setGroupNotesMap] = useState<Record<string, GroupNote[]>>({});

  // Shared Notes modals
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showFindGroups, setShowFindGroups] = useState(false);
  const [showPendingRequests, setShowPendingRequests] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupTag, setNewGroupTag] = useState("");
  const [findGroupSearch, setFindGroupSearch] = useState("");

  // Group folder creation state
  const [creatingFolderInGroup, setCreatingFolderInGroup] = useState<string | null>(null);
  const [newGroupFolderName, setNewGroupFolderName] = useState("");
  const [newGroupFolderColor, setNewGroupFolderColor] = useState(FOLDER_COLORS[0]);

  // Group note creation state
  const [creatingNoteInGroupFolder, setCreatingNoteInGroupFolder] = useState<string | null>(null);
  const [newGroupNoteTitle, setNewGroupNoteTitle] = useState("");
  const [newGroupNoteContent, setNewGroupNoteContent] = useState("");

  // Group file upload state
  const [uploadingInGroupFolder, setUploadingInGroupFolder] = useState<string | null>(null);

  // Group note editing state (separate from personal)
  const [editingGroupNote, setEditingGroupNote] = useState<GroupNote | null>(null);
  const [editGroupNoteTitle, setEditGroupNoteTitle] = useState("");
  const [editGroupNoteContent, setEditGroupNoteContent] = useState("");

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
    reloadGroupData();
  }

  function reloadGroupData() {
    const allGroups = getGroups();
    setGroups(allGroups);
    // Build folder and notes maps
    const fMap: Record<string, GroupFolder[]> = {};
    const nMap: Record<string, GroupNote[]> = {};
    allGroups.forEach((g) => {
      fMap[g.id] = getGroupFolders(g.id);
      nMap[g.id] = getGroupNotes(g.id);
    });
    setGroupFoldersMap(fMap);
    setGroupNotesMap(nMap);
  }

  function toggleFolder(folderId: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }

  function toggleGroup(groupId: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  function toggleGroupFolder(folderId: string) {
    setExpandedGroupFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }

  // --- Personal Folder CRUD ---

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
    const notesInFolder = notes.filter((n) => n.folderId === folderId);
    notesInFolder.forEach((n) => deleteNote(n.id));
    deleteFolder(folderId);
    reloadData(user);
  }

  // --- Personal Note CRUD ---

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
    setCreatingNoteInFolder(null);
    setNewNoteTitle("");
    setNewNoteContent("");
    reloadData(user);
  }

  function handleFileExtracted(folderId: string, title: string, content: string, attachment: FileAttachment) {
    if (!user) return;
    const note: Note = {
      id: crypto.randomUUID(),
      title,
      content,
      folderId,
      ownerId: user.id,
      sharedGroupIds: [],
      attachment,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveNote(note);
    setUploadingInFolder(null);
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

  // --- Group CRUD ---

  function handleCreateGroup() {
    if (!newGroupName.trim() || !newGroupTag.trim() || !user) return;
    const group: StudyGroup = {
      id: crypto.randomUUID(),
      name: newGroupName.trim(),
      tag: newGroupTag.trim(),
      creatorId: user.id,
      members: [user.id],
      pendingMembers: [],
      createdAt: new Date().toISOString(),
    };
    saveGroup(group);
    setShowCreateGroup(false);
    setNewGroupName("");
    setNewGroupTag("");
    reloadGroupData();
  }

  function handleRequestJoin(group: StudyGroup) {
    if (!user) return;
    if (group.members.includes(user.id) || group.pendingMembers.includes(user.id)) return;
    const updated: StudyGroup = {
      ...group,
      pendingMembers: [...group.pendingMembers, user.id],
    };
    saveGroup(updated);
    reloadGroupData();
  }

  function handleAcceptMember(group: StudyGroup, memberId: string) {
    const updated: StudyGroup = {
      ...group,
      members: [...group.members, memberId],
      pendingMembers: group.pendingMembers.filter((id) => id !== memberId),
    };
    saveGroup(updated);
    reloadGroupData();
  }

  function handleRejectMember(group: StudyGroup, memberId: string) {
    const updated: StudyGroup = {
      ...group,
      pendingMembers: group.pendingMembers.filter((id) => id !== memberId),
    };
    saveGroup(updated);
    reloadGroupData();
  }

  // --- Group Folder CRUD ---

  function handleCreateGroupFolder(groupId: string) {
    if (!newGroupFolderName.trim() || !user) return;
    const colorIndex = (groupFoldersMap[groupId]?.length || 0) % FOLDER_COLORS.length;
    const folder: GroupFolder = {
      id: crypto.randomUUID(),
      groupId,
      name: newGroupFolderName.trim(),
      color: newGroupFolderColor || FOLDER_COLORS[colorIndex],
      createdBy: user.id,
      createdAt: new Date().toISOString(),
    };
    saveGroupFolder(folder);
    setCreatingFolderInGroup(null);
    setNewGroupFolderName("");
    setNewGroupFolderColor(FOLDER_COLORS[0]);
    reloadGroupData();
    setExpandedGroupFolders((prev) => new Set([...prev, folder.id]));
  }

  function handleDeleteGroupFolder(folderId: string) {
    deleteGroupFolder(folderId);
    reloadGroupData();
  }

  // --- Group Note CRUD ---

  function handleCreateGroupNote(groupId: string, folderId: string) {
    if (!newGroupNoteTitle.trim() || !user) return;
    const note: GroupNote = {
      id: crypto.randomUUID(),
      groupId,
      folderId,
      title: newGroupNoteTitle.trim(),
      content: newGroupNoteContent,
      createdBy: user.id,
      createdByName: user.displayName || user.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveGroupNote(note);
    setCreatingNoteInGroupFolder(null);
    setNewGroupNoteTitle("");
    setNewGroupNoteContent("");
    reloadGroupData();
  }

  function handleGroupFileExtracted(groupId: string, folderId: string, title: string, content: string, attachment: FileAttachment) {
    if (!user) return;
    const note: GroupNote = {
      id: crypto.randomUUID(),
      groupId,
      folderId,
      title,
      content,
      createdBy: user.id,
      createdByName: user.displayName || user.email,
      attachment,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveGroupNote(note);
    setUploadingInGroupFolder(null);
    reloadGroupData();
  }

  function handleEditGroupNote() {
    if (!editingGroupNote || !editGroupNoteTitle.trim() || !user) return;
    const updated: GroupNote = {
      ...editingGroupNote,
      title: editGroupNoteTitle.trim(),
      content: editGroupNoteContent,
      updatedAt: new Date().toISOString(),
    };
    saveGroupNote(updated);
    setEditingGroupNote(null);
    reloadGroupData();
  }

  function handleDeleteGroupNote(noteId: string) {
    deleteGroupNote(noteId);
    if (editingGroupNote?.id === noteId) setEditingGroupNote(null);
    reloadGroupData();
  }

  function openEditGroupNote(note: GroupNote) {
    setEditingGroupNote(note);
    setEditGroupNoteTitle(note.title);
    setEditGroupNoteContent(note.content);
  }

  // Helper functions
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

  // Pending count for groups I created
  const pendingCount = groups
    .filter((g) => user && g.creatorId === user.id)
    .reduce((sum, g) => sum + g.pendingMembers.length, 0);

  // Groups the user is a member of
  const myGroups = groups.filter((g) => user && g.members.includes(user.id));

  // All groups for find modal (filtered by search)
  const filteredFindGroups = groups.filter((g) => {
    const q = findGroupSearch.toLowerCase();
    return g.name.toLowerCase().includes(q) || g.tag.toLowerCase().includes(q);
  });


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
                          setUploadingInFolder(null);
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
                          setUploadingInFolder(folder.id);
                          setCreatingNoteInFolder(null);
                          setExpandedFolders((prev) =>
                            new Set([...prev, folder.id])
                          );
                        }}
                        className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                        title="Upload note from file"
                      >
                        <Upload className="w-4 h-4" />
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

                          {/* Upload Note From File */}
                          {uploadingInFolder === folder.id && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="p-3 rounded-lg border border-border bg-accent/20"
                            >
                              <h4 className="text-sm font-semibold mb-2">Upload Notes from File</h4>
                              <NoteFileUpload
                                onExtracted={(title, content, attachment) =>
                                  handleFileExtracted(folder.id, title, content, attachment)
                                }
                                onCancel={() => setUploadingInFolder(null)}
                              />
                            </motion.div>
                          )}

                          {/* Notes list */}
                          {folderNotes.length === 0 &&
                            creatingNoteInFolder !== folder.id &&
                            uploadingInFolder !== folder.id && (
                              <p className="text-sm text-muted-foreground py-2 pl-2">
                                No notes yet. Click + to add one or upload a file.
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
            {/* Header Actions */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <button
                onClick={() => setShowCreateGroup(true)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:shadow-lg transition-all flex items-center gap-2 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Create Group
              </button>
              <button
                onClick={() => setShowFindGroups(true)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:shadow-lg transition-all flex items-center gap-2 text-sm font-medium"
              >
                <Search className="w-4 h-4" />
                Find Groups
              </button>
              <button
                onClick={() => setShowPendingRequests(true)}
                className="px-4 py-2 rounded-xl border border-border hover:bg-accent transition-all flex items-center gap-2 text-sm font-medium relative"
              >
                <Bell className="w-4 h-4" />
                My Pending
                {pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold">
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>

            {/* Group Cards */}
            {myGroups.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">No groups yet</h3>
                <p className="text-muted-foreground text-sm">
                  Create or join a study group to start sharing notes.
                </p>
              </div>
            ) : (
              myGroups.map((group) => {
                const isExpanded = expandedGroups.has(group.id);
                const gFolders = groupFoldersMap[group.id] || [];
                const isCreator = user?.id === group.creatorId;

                return (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-2xl border border-border overflow-hidden"
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
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-muted-foreground">
                          {group.tag}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {group.members.length} member{group.members.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCreatingFolderInGroup(group.id);
                            setExpandedGroups((prev) => new Set([...prev, group.id]));
                          }}
                          className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                          title="Add folder"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Group Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-3">
                            {/* Pending Requests (creator only) */}
                            {isCreator && group.pendingMembers.length > 0 && (
                              <div className="p-3 rounded-lg border border-border bg-accent/20 space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                  Pending Requests ({group.pendingMembers.length})
                                </p>
                                {group.pendingMembers.map((memberId) => (
                                  <div
                                    key={memberId}
                                    className="flex items-center justify-between py-1"
                                  >
                                    <span className="text-sm">{memberId}</span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => handleAcceptMember(group, memberId)}
                                        className="p-1 rounded hover:bg-green-500/20 transition-colors"
                                        title="Accept"
                                      >
                                        <UserCheck className="w-4 h-4 text-green-500" />
                                      </button>
                                      <button
                                        onClick={() => handleRejectMember(group, memberId)}
                                        className="p-1 rounded hover:bg-destructive/10 transition-colors"
                                        title="Reject"
                                      >
                                        <UserX className="w-4 h-4 text-destructive" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Create Folder Form */}
                            {creatingFolderInGroup === group.id && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="p-3 rounded-lg border border-border bg-accent/20 space-y-2"
                              >
                                <h4 className="text-xs font-semibold">New Folder</h4>
                                <input
                                  type="text"
                                  value={newGroupFolderName}
                                  onChange={(e) => setNewGroupFolderName(e.target.value)}
                                  placeholder="Folder name..."
                                  className="w-full px-3 py-1.5 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 text-sm"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleCreateGroupFolder(group.id);
                                    if (e.key === "Escape") setCreatingFolderInGroup(null);
                                  }}
                                />
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Color</p>
                                  <div className="flex gap-2 flex-wrap">
                                    {FOLDER_COLORS.map((color) => (
                                      <button
                                        key={color}
                                        onClick={() => setNewGroupFolderColor(color)}
                                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                                          newGroupFolderColor === color
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
                                    onClick={() => handleCreateGroupFolder(group.id)}
                                    disabled={!newGroupFolderName.trim()}
                                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Create
                                  </button>
                                  <button
                                    onClick={() => {
                                      setCreatingFolderInGroup(null);
                                      setNewGroupFolderName("");
                                    }}
                                    className="px-3 py-1.5 rounded-lg hover:bg-accent text-sm flex items-center gap-1"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    Cancel
                                  </button>
                                </div>
                              </motion.div>
                            )}

                            {/* Group Folders */}
                            {gFolders.length === 0 && creatingFolderInGroup !== group.id && (
                              <p className="text-sm text-muted-foreground py-2 pl-2">
                                No folders yet. Click + to add one.
                              </p>
                            )}
                            {gFolders.map((gFolder) => {
                              const folderNotes = (groupNotesMap[group.id] || []).filter(
                                (n) => n.folderId === gFolder.id
                              );
                              const isFolderExpanded = expandedGroupFolders.has(gFolder.id);

                              return (
                                <div
                                  key={gFolder.id}
                                  className="rounded-xl border border-border overflow-hidden"
                                >
                                  {/* Folder Header */}
                                  <div
                                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/30 transition-colors"
                                    onClick={() => toggleGroupFolder(gFolder.id)}
                                  >
                                    <div className="flex items-center gap-2">
                                      {isFolderExpanded ? (
                                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                      ) : (
                                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                      )}
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: gFolder.color }}
                                      />
                                      <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
                                      <span className="text-sm font-medium">{gFolder.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        ({folderNotes.length})
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCreatingNoteInGroupFolder(gFolder.id);
                                          setUploadingInGroupFolder(null);
                                          setExpandedGroupFolders((prev) =>
                                            new Set([...prev, gFolder.id])
                                          );
                                        }}
                                        className="p-1 rounded hover:bg-accent transition-colors"
                                        title="Add note"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setUploadingInGroupFolder(gFolder.id);
                                          setCreatingNoteInGroupFolder(null);
                                          setExpandedGroupFolders((prev) =>
                                            new Set([...prev, gFolder.id])
                                          );
                                        }}
                                        className="p-1 rounded hover:bg-accent transition-colors"
                                        title="Upload note from file"
                                      >
                                        <Upload className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteGroupFolder(gFolder.id);
                                        }}
                                        className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors"
                                        title="Delete folder"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Folder Notes */}
                                  <AnimatePresence>
                                    {isFolderExpanded && (
                                      <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: "auto" }}
                                        exit={{ height: 0 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="px-3 pb-3 space-y-2">
                                          {/* Create Note Form */}
                                          {creatingNoteInGroupFolder === gFolder.id && (
                                            <motion.div
                                              initial={{ opacity: 0 }}
                                              animate={{ opacity: 1 }}
                                              className="p-3 rounded-lg border border-border bg-accent/20 space-y-2"
                                            >
                                              <input
                                                type="text"
                                                value={newGroupNoteTitle}
                                                onChange={(e) =>
                                                  setNewGroupNoteTitle(e.target.value)
                                                }
                                                placeholder="Note title..."
                                                className="w-full px-3 py-1.5 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 text-sm"
                                                autoFocus
                                              />
                                              <textarea
                                                value={newGroupNoteContent}
                                                onChange={(e) =>
                                                  setNewGroupNoteContent(e.target.value)
                                                }
                                                placeholder="Note content..."
                                                rows={3}
                                                className="w-full px-3 py-1.5 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 text-sm resize-none"
                                              />
                                              <div className="flex gap-2">
                                                <button
                                                  onClick={() =>
                                                    handleCreateGroupNote(group.id, gFolder.id)
                                                  }
                                                  disabled={!newGroupNoteTitle.trim()}
                                                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                                                >
                                                  <Check className="w-3.5 h-3.5" />
                                                  Save
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setCreatingNoteInGroupFolder(null);
                                                    setNewGroupNoteTitle("");
                                                    setNewGroupNoteContent("");
                                                  }}
                                                  className="px-3 py-1.5 rounded-lg hover:bg-accent text-sm flex items-center gap-1"
                                                >
                                                  <X className="w-3.5 h-3.5" />
                                                  Cancel
                                                </button>
                                              </div>
                                            </motion.div>
                                          )}

                                          {/* Upload Note From File */}
                                          {uploadingInGroupFolder === gFolder.id && (
                                            <motion.div
                                              initial={{ opacity: 0 }}
                                              animate={{ opacity: 1 }}
                                              className="p-3 rounded-lg border border-border bg-accent/20"
                                            >
                                              <h4 className="text-sm font-semibold mb-2">Upload Notes from File</h4>
                                              <NoteFileUpload
                                                onExtracted={(title, content, attachment) =>
                                                  handleGroupFileExtracted(group.id, gFolder.id, title, content, attachment)
                                                }
                                                onCancel={() => setUploadingInGroupFolder(null)}
                                              />
                                            </motion.div>
                                          )}

                                          {/* Notes List */}
                                          {folderNotes.length === 0 &&
                                            creatingNoteInGroupFolder !== gFolder.id &&
                                            uploadingInGroupFolder !== gFolder.id && (
                                              <p className="text-xs text-muted-foreground py-2 pl-2">
                                                No notes yet. Click + to add one or upload a file.
                                              </p>
                                            )}
                                          {folderNotes.map((gNote) => (
                                            <div
                                              key={gNote.id}
                                              className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/30 transition-colors group"
                                            >
                                              <FileText className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                              <div className="flex-1 min-w-0">
                                                <div
                                                  className="cursor-pointer"
                                                  onClick={() => openEditGroupNote(gNote)}
                                                >
                                                  <h4 className="text-sm font-medium truncate">
                                                    {gNote.title}
                                                  </h4>
                                                  {gNote.content && (
                                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                                      {gNote.content}
                                                    </p>
                                                  )}
                                                  <p className="text-xs text-muted-foreground/70 mt-1">
                                                    By {gNote.createdByName} · {formatDate(gNote.updatedAt)}
                                                  </p>
                                                </div>
                                                {/* File attachment download link */}
                                                {gNote.attachment && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      const link = document.createElement("a");
                                                      link.href = gNote.attachment!.dataUrl;
                                                      link.download = gNote.attachment!.fileName;
                                                      document.body.appendChild(link);
                                                      link.click();
                                                      document.body.removeChild(link);
                                                    }}
                                                    className="mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-colors text-xs text-primary font-medium"
                                                    title={`Download ${gNote.attachment.fileName}`}
                                                  >
                                                    <Download className="w-3.5 h-3.5" />
                                                    <span className="truncate max-w-[180px]">{gNote.attachment.fileName}</span>
                                                    <span className="text-muted-foreground/70 flex-shrink-0">
                                                      ({gNote.attachment.fileSize < 1024 * 1024
                                                        ? `${(gNote.attachment.fileSize / 1024).toFixed(1)} KB`
                                                        : `${(gNote.attachment.fileSize / (1024 * 1024)).toFixed(1)} MB`})
                                                    </span>
                                                  </button>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteGroupNote(gNote.id);
                                                  }}
                                                  className="p-1 rounded hover:bg-destructive/10 transition-colors"
                                                  title="Delete note"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        </TabsContent>
      </Tabs>


      {/* Personal Note Edit Modal */}
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
                {/* Attached file download */}
                {editingNote.attachment && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{editingNote.attachment.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {editingNote.attachment.fileSize < 1024 * 1024
                          ? `${(editingNote.attachment.fileSize / 1024).toFixed(1)} KB`
                          : `${(editingNote.attachment.fileSize / (1024 * 1024)).toFixed(1)} MB`}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = editingNote.attachment!.dataUrl;
                        link.download = editingNote.attachment!.fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:shadow-lg transition-all flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                )}
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

      {/* Group Note Edit Modal */}
      <AnimatePresence>
        {editingGroupNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-8"
            onClick={() => setEditingGroupNote(null)}
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
                  value={editGroupNoteTitle}
                  onChange={(e) => setEditGroupNoteTitle(e.target.value)}
                  className="text-xl font-bold w-full bg-transparent border-none outline-none"
                  placeholder="Note title..."
                />
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <textarea
                  value={editGroupNoteContent}
                  onChange={(e) => setEditGroupNoteContent(e.target.value)}
                  className="w-full min-h-[250px] bg-transparent border-none outline-none resize-none text-sm leading-relaxed"
                  placeholder="Write your note content here..."
                />
                {/* Attached file download */}
                {editingGroupNote.attachment && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{editingGroupNote.attachment.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {editingGroupNote.attachment.fileSize < 1024 * 1024
                          ? `${(editingGroupNote.attachment.fileSize / 1024).toFixed(1)} KB`
                          : `${(editingGroupNote.attachment.fileSize / (1024 * 1024)).toFixed(1)} MB`}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = editingGroupNote.attachment!.dataUrl;
                        link.download = editingGroupNote.attachment!.fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:shadow-lg transition-all flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                )}
                <AISummarizeButton
                  noteContent={editGroupNoteContent}
                  existingSummary={undefined}
                  onSummaryGenerated={() => {}}
                />
              </div>
              <div className="p-4 border-t border-border flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  By {editingGroupNote.createdByName} · Last edited: {formatDate(editingGroupNote.updatedAt)}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingGroupNote(null)}
                    className="px-4 py-2 rounded-xl hover:bg-accent transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditGroupNote}
                    disabled={!editGroupNoteTitle.trim()}
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

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreateGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-8"
            onClick={() => setShowCreateGroup(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-2xl border border-border w-full max-w-md p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold">Create Study Group</h2>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group name..."
                className="w-full px-3 py-2 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 text-sm"
                autoFocus
              />
              <input
                type="text"
                value={newGroupTag}
                onChange={(e) => setNewGroupTag(e.target.value)}
                placeholder="Tag (e.g. CS2040-S1)..."
                className="w-full px-3 py-2 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateGroup();
                }}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowCreateGroup(false);
                    setNewGroupName("");
                    setNewGroupTag("");
                  }}
                  className="px-4 py-2 rounded-xl hover:bg-accent transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim() || !newGroupTag.trim()}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:shadow-lg transition-all text-sm font-medium disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Find Groups Modal */}
      <AnimatePresence>
        {showFindGroups && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-8"
            onClick={() => setShowFindGroups(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[70vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border space-y-3">
                <h2 className="text-lg font-bold">Find Groups</h2>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={findGroupSearch}
                    onChange={(e) => setFindGroupSearch(e.target.value)}
                    placeholder="Search by name or tag..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 text-sm"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredFindGroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No groups found.
                  </p>
                ) : (
                  filteredFindGroups.map((group) => {
                    const isMember = user ? group.members.includes(user.id) : false;
                    const isPending = user ? group.pendingMembers.includes(user.id) : false;

                    return (
                      <div
                        key={group.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-accent/30 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium">{group.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {group.tag} · {group.members.length} member{group.members.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        {isMember ? (
                          <span className="text-xs px-2 py-1 rounded-lg bg-green-500/10 text-green-500 font-medium">
                            Joined
                          </span>
                        ) : isPending ? (
                          <span className="text-xs px-2 py-1 rounded-lg bg-yellow-500/10 text-yellow-600 font-medium">
                            Pending
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRequestJoin(group)}
                            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:shadow-lg transition-all flex items-center gap-1"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            Request to Join
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="p-4 border-t border-border flex justify-end">
                <button
                  onClick={() => {
                    setShowFindGroups(false);
                    setFindGroupSearch("");
                  }}
                  className="px-4 py-2 rounded-xl hover:bg-accent transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending Requests Modal */}
      <AnimatePresence>
        {showPendingRequests && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-8"
            onClick={() => setShowPendingRequests(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[70vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border">
                <h2 className="text-lg font-bold">Pending Join Requests</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage requests for groups you created
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {(() => {
                  const myCreatedGroups = groups.filter(
                    (g) => user && g.creatorId === user.id && g.pendingMembers.length > 0
                  );
                  if (myCreatedGroups.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No pending requests.
                      </p>
                    );
                  }
                  return myCreatedGroups.map((group) => (
                    <div key={group.id} className="space-y-2">
                      <p className="text-sm font-semibold">
                        {group.name}{" "}
                        <span className="text-xs text-muted-foreground font-normal">
                          ({group.tag})
                        </span>
                      </p>
                      {group.pendingMembers.map((memberId) => (
                        <div
                          key={memberId}
                          className="flex items-center justify-between p-2 pl-4 rounded-lg border border-border"
                        >
                          <span className="text-sm">{memberId}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleAcceptMember(group, memberId)}
                              className="p-1.5 rounded hover:bg-green-500/20 transition-colors"
                              title="Accept"
                            >
                              <UserCheck className="w-4 h-4 text-green-500" />
                            </button>
                            <button
                              onClick={() => handleRejectMember(group, memberId)}
                              className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                              title="Reject"
                            >
                              <UserX className="w-4 h-4 text-destructive" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
              <div className="p-4 border-t border-border flex justify-end">
                <button
                  onClick={() => setShowPendingRequests(false)}
                  className="px-4 py-2 rounded-xl hover:bg-accent transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- NoteCard Component ---

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
  function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    if (!note.attachment) return;
    const link = document.createElement("a");
    link.href = note.attachment.dataUrl;
    link.download = note.attachment.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/30 transition-colors group">
      <FileText className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="cursor-pointer" onClick={onEdit}>
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
        {/* File attachment download link */}
        {note.attachment && (
          <button
            onClick={handleDownload}
            className="mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-colors text-xs text-primary font-medium"
            title={`Download ${note.attachment.fileName}`}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="truncate max-w-[180px]">{note.attachment.fileName}</span>
            <span className="text-muted-foreground/70 flex-shrink-0">
              ({formatFileSize(note.attachment.fileSize)})
            </span>
          </button>
        )}
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
