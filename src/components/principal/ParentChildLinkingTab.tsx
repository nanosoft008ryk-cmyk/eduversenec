import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Link2, Pencil, Plus, Search, Trash2, UserCheck, Users, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Guardian {
  id: string;
  student_id: string;
  user_id: string | null;
  full_name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  student_first_name?: string;
  student_last_name?: string;
  class_name?: string;
  section_name?: string;
}

interface StudentOption {
  id: string;
  first_name: string;
  last_name: string | null;
  profile_id: string | null;
  class_name?: string;
  section_name?: string;
}

interface ParentUser {
  user_id: string;
  email: string;
  full_name: string;
}

interface StudentUser {
  user_id: string;
  email: string;
  full_name: string;
}

interface ClassOption {
  id: string;
  name: string;
}

interface SectionOption {
  id: string;
  name: string;
  class_id: string;
}

interface Props {
  schoolId: string;
}

export function ParentChildLinkingTab({ schoolId }: Props) {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [parentUsers, setParentUsers] = useState<ParentUser[]>([]);
  const [studentUsers, setStudentUsers] = useState<StudentUser[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState<string>("__all");
  const [filterSection, setFilterSection] = useState<string>("__all");
  const [filterLinked, setFilterLinked] = useState<string>("__all");
  const [showAdd, setShowAdd] = useState(false);
  const [showLinkStudent, setShowLinkStudent] = useState(false);
  const [showEditGuardian, setShowEditGuardian] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState<Guardian | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    student_id: "",
    full_name: "",
    relationship: "father",
    phone: "",
    email: "",
    user_id: "",
    is_primary: true,
  });

  const [editForm, setEditForm] = useState({
    full_name: "",
    relationship: "father",
    phone: "",
    email: "",
    user_id: "",
  });

  const [linkStudentId, setLinkStudentId] = useState("");
  const [linkStudentUserId, setLinkStudentUserId] = useState("");

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const loadData = async () => {
    setLoading(true);

    const [
      guardianRes,
      studentRes,
      classRes,
      sectionRes,
      enrollmentRes,
      directoryRes,
      rolesRes,
    ] = await Promise.all([
      (supabase as any).from("student_guardians").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
      (supabase as any).from("students").select("id, first_name, last_name, profile_id").eq("school_id", schoolId).order("first_name"),
      supabase.from("academic_classes").select("id, name").eq("school_id", schoolId).order("name"),
      supabase.from("class_sections").select("id, name, class_id").eq("school_id", schoolId).order("name"),
      (supabase as any).from("student_enrollments").select("student_id, class_section_id, school_id").eq("school_id", schoolId).is("end_date", null),
      supabase.from("school_user_directory").select("user_id, display_name, email").eq("school_id", schoolId),
      (supabase as any).from("user_roles").select("user_id, role").eq("school_id", schoolId).in("role", ["parent", "student"]),
    ]);

    // Log errors for debugging
    if (guardianRes.error) console.error("[ParentChildLinking] guardians error:", guardianRes.error);
    if (studentRes.error) console.error("[ParentChildLinking] students error:", studentRes.error);
    if (classRes.error) console.error("[ParentChildLinking] classes error:", classRes.error);
    if (sectionRes.error) console.error("[ParentChildLinking] sections error:", sectionRes.error);
    if (enrollmentRes.error) console.error("[ParentChildLinking] enrollments error:", enrollmentRes.error);
    if (directoryRes.error) console.error("[ParentChildLinking] directory error:", directoryRes.error);
    if (rolesRes.error) console.error("[ParentChildLinking] roles error:", rolesRes.error);

    const guardianData = guardianRes.data || [];
    const studentData = studentRes.data || [];
    const classData = classRes.data || [];
    const sectionData = sectionRes.data || [];
    const enrollmentData = enrollmentRes.data || [];
    const directoryData = directoryRes.data || [];
    const rolesData = rolesRes.data || [];

    console.log("[ParentChildLinking] students fetched:", studentData.length, "enrollments:", enrollmentData.length, "directory:", directoryData.length, "classes:", classData.length, "sections:", sectionData.length);

    const enrollMap = new Map<string, string>();
    enrollmentData.forEach((e: any) => enrollMap.set(e.student_id, e.class_section_id));

    const sectionMap = new Map<string, { name: string; class_id: string }>();
    sectionData.forEach((s: any) => sectionMap.set(s.id, { name: s.name, class_id: s.class_id }));

    const classMap = new Map<string, string>();
    classData.forEach((c: any) => classMap.set(c.id, c.name));

    const dirMap = new Map<string, { display_name: string; email: string }>();
    directoryData.forEach((d: any) => dirMap.set(d.user_id, { display_name: d.display_name || "", email: d.email || "" }));

    const parentUserIds = new Set<string>();
    const studentUserIds = new Set<string>();
    rolesData.forEach((r: any) => {
      if (r.role === "parent") parentUserIds.add(r.user_id);
      if (r.role === "student") studentUserIds.add(r.user_id);
    });

    const enrichedStudents: StudentOption[] = studentData.map((s: any) => {
      const secId = enrollMap.get(s.id);
      const sec = secId ? sectionMap.get(secId) : null;
      return {
        ...s,
        class_name: sec ? classMap.get(sec.class_id) || null : null,
        section_name: sec?.name || null,
      };
    });

    const studentMap = new Map(enrichedStudents.map((s) => [s.id, s]));

    const enriched: Guardian[] = guardianData.map((g: any) => {
      const student = studentMap.get(g.student_id);
      return {
        ...g,
        student_first_name: student?.first_name || "Unknown",
        student_last_name: student?.last_name || "",
        class_name: student?.class_name || null,
        section_name: student?.section_name || null,
      };
    });

    // Build parent user list from directory
    const parentList: ParentUser[] = [];
    directoryData.forEach((d: any) => {
      parentList.push({
        user_id: d.user_id,
        email: d.email || "",
        full_name: d.display_name || d.email || "User",
      });
    });

    // Build student user list from directory
    const studentUserList: StudentUser[] = [];
    directoryData.forEach((d: any) => {
      studentUserList.push({
        user_id: d.user_id,
        email: d.email || "",
        full_name: d.display_name || d.email || "User",
      });
    });

    setGuardians(enriched);
    setStudents(enrichedStudents);
    setParentUsers(parentList);
    setStudentUsers(studentUserList);
    setClasses(classData as ClassOption[]);
    setSections(sectionData as SectionOption[]);
    setLoading(false);
  };
  const handleSave = async () => {
    if (!form.student_id || !form.full_name.trim()) {
      toast.error("Student and guardian name are required");
      return;
    }

    // Check for duplicate guardian link (same student + same user_id)
    if (form.user_id) {
      const duplicate = guardians.find(
        (g) => g.student_id === form.student_id && g.user_id === form.user_id
      );
      if (duplicate) {
        toast.error("This parent account is already linked to this student.");
        return;
      }
    }

    setSaving(true);
    const { error } = await (supabase as any)
      .from("student_guardians")
      .insert({
        student_id: form.student_id,
        full_name: form.full_name.trim(),
        relationship: form.relationship || null,
        phone: form.phone || null,
        email: form.email || null,
        user_id: form.user_id || null,
        is_primary: form.is_primary,
        school_id: schoolId,
      });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Guardian linked to student successfully!");
      setShowAdd(false);
      setForm({ student_id: "", full_name: "", relationship: "father", phone: "", email: "", user_id: "", is_primary: true });
      loadData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any)
      .from("student_guardians")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Guardian link removed");
      loadData();
    }
  };

  const handleLinkParentUser = async (guardianId: string, userId: string) => {
    const { error } = await (supabase as any)
      .from("student_guardians")
      .update({ user_id: userId })
      .eq("id", guardianId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Parent account linked!");
      loadData();
    }
  };

  const handleLinkStudentUser = async () => {
    if (!linkStudentId || !linkStudentUserId) {
      toast.error("Select both a student and a user account");
      return;
    }

    // Check if this user account is already linked to another student
    const alreadyLinked = students.find(
      (s) => s.profile_id === linkStudentUserId && s.id !== linkStudentId
    );
    if (alreadyLinked) {
      toast.error(`This account is already linked to ${alreadyLinked.first_name} ${alreadyLinked.last_name || ""}. Unlink it first.`);
      return;
    }

    setSaving(true);
    const { error } = await (supabase as any)
      .from("students")
      .update({ profile_id: linkStudentUserId })
      .eq("id", linkStudentId)
      .eq("school_id", schoolId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Student account linked!");
      setShowLinkStudent(false);
      setLinkStudentId("");
      setLinkStudentUserId("");
      loadData();
    }
    setSaving(false);
  };

  const openEditGuardian = (g: Guardian) => {
    setEditingGuardian(g);
    setEditForm({
      full_name: g.full_name,
      relationship: g.relationship || "father",
      phone: g.phone || "",
      email: g.email || "",
      user_id: g.user_id || "",
    });
    setShowEditGuardian(true);
  };

  const handleUpdateGuardian = async () => {
    if (!editingGuardian) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("student_guardians")
      .update({
        full_name: editForm.full_name.trim(),
        relationship: editForm.relationship || null,
        phone: editForm.phone || null,
        email: editForm.email || null,
        user_id: editForm.user_id || null,
      })
      .eq("id", editingGuardian.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Guardian updated!");
      setShowEditGuardian(false);
      setEditingGuardian(null);
      loadData();
    }
    setSaving(false);
  };

  const filteredSections = filterClass !== "__all"
    ? sections.filter((s) => s.class_id === filterClass)
    : sections;

  const filtered = guardians.filter((g) => {
    if (search) {
      const q = search.toLowerCase();
      const matches =
        g.full_name?.toLowerCase().includes(q) ||
        g.student_first_name?.toLowerCase().includes(q) ||
        g.student_last_name?.toLowerCase().includes(q) ||
        g.email?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (filterClass !== "__all") {
      if (g.class_name !== classes.find((c) => c.id === filterClass)?.name) return false;
    }
    if (filterSection !== "__all") {
      const sec = sections.find((s) => s.id === filterSection);
      if (g.section_name !== sec?.name) return false;
    }
    if (filterLinked === "linked" && !g.user_id) return false;
    if (filterLinked === "unlinked" && g.user_id) return false;
    return true;
  });

  const unlinkedStudents = students.filter((s) => !s.profile_id);

  // Build a lookup for parent user names by user_id
  const parentUserMap = new Map(parentUsers.map((p) => [p.user_id, p]));

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-surface-2 p-3">
          <p className="text-xs text-muted-foreground">Total Links</p>
          <p className="mt-1 font-display text-lg font-semibold">{guardians.length}</p>
        </div>
        <div className="rounded-xl border bg-surface-2 p-3">
          <p className="text-xs text-muted-foreground">Parent Accounts Linked</p>
          <p className="mt-1 font-display text-lg font-semibold text-primary">
            {guardians.filter((g) => g.user_id).length}
          </p>
        </div>
        <div className="rounded-xl border bg-surface-2 p-3">
          <p className="text-xs text-muted-foreground">Student Accounts Linked</p>
          <p className="mt-1 font-display text-lg font-semibold text-primary">
            {students.filter((s) => s.profile_id).length}
          </p>
        </div>
        <div className="rounded-xl border bg-surface-2 p-3">
          <p className="text-xs text-muted-foreground">Unlinked Students</p>
          <p className="mt-1 font-display text-lg font-semibold text-destructive">
            {unlinkedStudents.length}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Parent-Student Linking
              </CardTitle>
              <CardDescription>
                Link parent & student user accounts for synchronized panel access
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
              </Button>

              <Dialog open={showLinkStudent} onOpenChange={setShowLinkStudent}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <UserCheck className="h-4 w-4 mr-1" /> Link Student Account
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Link Student User Account</DialogTitle>
                    <DialogDescription>
                      Connect a student record to a user login so they can access the Student Panel
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Student Record *</Label>
                      <Select value={linkStudentId} onValueChange={setLinkStudentId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select student" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.length === 0 && (
                            <div className="px-2 py-4 text-sm text-muted-foreground text-center">No students found in database</div>
                          )}
                          {students.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.first_name} {s.last_name || ""} {s.class_name ? `(${s.class_name} - ${s.section_name})` : ""} {s.profile_id ? "✓" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Student User Account *</Label>
                      <Select value={linkStudentUserId} onValueChange={setLinkStudentUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select student account" />
                        </SelectTrigger>
                        <SelectContent>
                          {studentUsers.map((u) => (
                            <SelectItem key={u.user_id} value={u.user_id}>
                              {u.full_name} ({u.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowLinkStudent(false)}>Cancel</Button>
                    <Button onClick={handleLinkStudentUser} disabled={saving}>
                      {saving ? "Linking..." : "Link Student"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-1" /> Link Parent
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Link Parent to Student</DialogTitle>
                    <DialogDescription>
                      Create a guardian record and optionally link to a parent user account
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Student *</Label>
                      <Select value={form.student_id} onValueChange={(v) => setForm((p) => ({ ...p, student_id: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select student" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.length === 0 && (
                            <div className="px-2 py-4 text-sm text-muted-foreground text-center">No students found in database</div>
                          )}
                          {students.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.first_name} {s.last_name || ""} {s.class_name ? `(${s.class_name} - ${s.section_name})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Guardian Full Name *</Label>
                      <Input
                        value={form.full_name}
                        onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                        placeholder="e.g., Ahmad Khan"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Relationship</Label>
                        <Select value={form.relationship} onValueChange={(v) => setForm((p) => ({ ...p, relationship: v }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="father">Father</SelectItem>
                            <SelectItem value="mother">Mother</SelectItem>
                            <SelectItem value="guardian">Guardian</SelectItem>
                            <SelectItem value="sibling">Sibling</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          value={form.phone}
                          onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                          placeholder="+92..."
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        placeholder="parent@email.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Link to Parent Account (for panel access)</Label>
                      <Select value={form.user_id} onValueChange={(v) => setForm((p) => ({ ...p, user_id: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent account (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {parentUsers.map((p) => (
                            <SelectItem key={p.user_id} value={p.user_id}>
                              {p.full_name} ({p.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Linked parents can see this student's data in their Parent Panel
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? "Saving..." : "Link Parent"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search parent, student, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-48 sm:w-64"
              />
            </div>
            <Select value={filterClass} onValueChange={(v) => { setFilterClass(v); setFilterSection("__all"); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All Classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSection} onValueChange={setFilterSection}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All Sections</SelectItem>
                {filteredSections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterLinked} onValueChange={setFilterLinked}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All Status</SelectItem>
                <SelectItem value="linked">Linked</SelectItem>
                <SelectItem value="unlinked">Not Linked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Link2 className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No parent-student links found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click "Link Parent" to connect a parent account to a student profile
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parent/Guardian</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Class / Section</TableHead>
                    <TableHead>Relationship</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Parent Account</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((g) => {
                    const linkedParent = g.user_id ? parentUserMap.get(g.user_id) : null;
                    return (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">{g.full_name}</TableCell>
                        <TableCell>{g.student_first_name} {g.student_last_name}</TableCell>
                        <TableCell>
                          {g.class_name ? (
                            <span className="text-xs">{g.class_name} — {g.section_name}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not enrolled</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {g.relationship || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            {g.phone && <p>{g.phone}</p>}
                            {g.email && <p className="text-muted-foreground">{g.email}</p>}
                            {!g.phone && !g.email && <span className="text-muted-foreground">—</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {g.user_id ? (
                            <Badge className="bg-primary/10 text-primary border-primary/20">
                              <UserCheck className="h-3 w-3 mr-1" />
                              {linkedParent?.full_name || "Linked"}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Not linked</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditGuardian(g)}
                              className="h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(g.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Guardian Dialog */}
      <Dialog open={showEditGuardian} onOpenChange={setShowEditGuardian}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Guardian</DialogTitle>
            <DialogDescription>
              Update guardian details and link/unlink parent account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Guardian Full Name *</Label>
              <Input
                value={editForm.full_name}
                onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Relationship</Label>
                <Select value={editForm.relationship} onValueChange={(v) => setEditForm((p) => ({ ...p, relationship: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="father">Father</SelectItem>
                    <SelectItem value="mother">Mother</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                    <SelectItem value="sibling">Sibling</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Link to Parent Panel Account</Label>
              <Select
                value={editForm.user_id || "__none"}
                onValueChange={(v) => setEditForm((p) => ({ ...p, user_id: v === "__none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— No account linked —</SelectItem>
                  {parentUsers.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {p.full_name} ({p.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Link a parent panel user account so they can access the student's data
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditGuardian(false)}>Cancel</Button>
            <Button onClick={handleUpdateGuardian} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
