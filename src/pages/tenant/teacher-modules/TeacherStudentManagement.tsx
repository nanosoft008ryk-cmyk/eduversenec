import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useTenantOptimized } from "@/hooks/useTenantOptimized";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Users, Link2, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function TeacherStudentManagement() {
  const { schoolSlug } = useParams();
  const tenant = useTenantOptimized(schoolSlug);
  const { user } = useSession();
  const qc = useQueryClient();

  const schoolId = tenant.status === "ready" ? tenant.schoolId : null;

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showLinkPortal, setShowLinkPortal] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // New student fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [rollNumber, setRollNumber] = useState("");

  // Link portal fields
  const [linkStudentId, setLinkStudentId] = useState<string | null>(null);
  const [linkEmail, setLinkEmail] = useState("");
  const [linkType, setLinkType] = useState<"student" | "parent">("student");

  // Teacher's assigned sections
  const { data: teacherSections } = useQuery({
    queryKey: ["teacher_assigned_sections", schoolId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("teacher_subject_assignments")
        .select("class_section_id, class_sections(id, name, academic_classes(name))")
        .eq("school_id", schoolId!)
        .eq("teacher_user_id", user!.id);
      // Deduplicate sections
      const sectionMap = new Map<string, any>();
      (data || []).forEach((d: any) => {
        if (d.class_sections && !sectionMap.has(d.class_section_id)) {
          sectionMap.set(d.class_section_id, d.class_sections);
        }
      });
      return Array.from(sectionMap.entries()).map(([id, s]) => ({ id, ...s }));
    },
    enabled: !!schoolId && !!user,
  });

  // Students in selected section
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ["teacher_section_students", schoolId, selectedSection],
    queryFn: async () => {
      const { data } = await supabase
        .from("student_enrollments")
        .select("student_id, roll_number, students(id, first_name, last_name, parent_name, parent_phone, profile_id)")
        .eq("school_id", schoolId!)
        .eq("class_section_id", selectedSection!)
        .is("end_date", null)
        .order("roll_number");
      return data || [];
    },
    enabled: !!schoolId && !!selectedSection,
  });

  const filteredStudents = (students || []).filter((s: any) => {
    if (!searchTerm) return true;
    const name = `${(s.students as any)?.first_name} ${(s.students as any)?.last_name}`.toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  const addStudentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSection || !schoolId) throw new Error("No section selected");
      
      // Create student record
      const { data: student, error: studentErr } = await supabase
        .from("students")
        .insert({
          school_id: schoolId,
          first_name: firstName,
          last_name: lastName || null,
          parent_name: parentName || null,
          parent_phone: parentPhone || null,
          status: "active",
        })
        .select("id")
        .single();
      if (studentErr) throw studentErr;

      // Create enrollment
      const { error: enrollErr } = await supabase
        .from("student_enrollments")
        .insert({
          school_id: schoolId,
          student_id: student.id,
          class_section_id: selectedSection,
          roll_number: rollNumber ? parseInt(rollNumber) : null,
          start_date: new Date().toISOString().split("T")[0],
        });
      if (enrollErr) throw enrollErr;
    },
    onSuccess: () => {
      toast.success("Student added successfully");
      qc.invalidateQueries({ queryKey: ["teacher_section_students"] });
      setShowAddStudent(false);
      setFirstName(""); setLastName(""); setParentName(""); setParentPhone(""); setRollNumber("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const linkPortalMutation = useMutation({
    mutationFn: async () => {
      if (!linkStudentId || !linkEmail || !schoolId) throw new Error("Missing data");

      // Find user by email in profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", linkEmail)
        .maybeSingle();
      
      if (!profile) throw new Error("No user found with this email. They must sign up first.");

      if (linkType === "student") {
        // Link student profile
        const { error } = await supabase
          .from("students")
          .update({ profile_id: profile.id })
          .eq("id", linkStudentId)
          .eq("school_id", schoolId);
        if (error) throw error;

        // Add student role
        const { error: roleErr } = await supabase
          .from("user_roles")
          .upsert({
            school_id: schoolId,
            user_id: profile.id,
            role: "student",
          }, { onConflict: "school_id,user_id,role" });
        if (roleErr) throw roleErr;
      } else {
        // Link parent
        const { error } = await supabase
          .from("parent_student_links")
          .insert({
            school_id: schoolId,
            parent_user_id: profile.id,
            student_id: linkStudentId,
          });
        if (error) throw error;

        // Add parent role
        const { error: roleErr } = await supabase
          .from("user_roles")
          .upsert({
            school_id: schoolId,
            user_id: profile.id,
            role: "parent",
          }, { onConflict: "school_id,user_id,role" });
        if (roleErr) throw roleErr;
      }
    },
    onSuccess: () => {
      toast.success(`${linkType === "student" ? "Student" : "Parent"} portal linked!`);
      qc.invalidateQueries({ queryKey: ["teacher_section_students"] });
      setShowLinkPortal(false);
      setLinkEmail(""); setLinkStudentId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!schoolId) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 p-2.5">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">Student Management</h2>
            <p className="text-sm text-muted-foreground">Add students, link portals for your assigned classes</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Select value={selectedSection || "__none"} onValueChange={(v) => setSelectedSection(v === "__none" ? null : v)}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select your class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">Select Class</SelectItem>
            {teacherSections?.map((s: any) => (
              <SelectItem key={s.id} value={s.id}>
                {s.academic_classes?.name} - {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedSection && (
          <>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setShowAddStudent(true)} className="gap-2">
              <UserPlus className="h-4 w-4" /> Add Student
            </Button>
          </>
        )}
      </div>

      {selectedSection && (
        studentsLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading students...</div>
        ) : filteredStudents.length > 0 ? (
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Portal</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((e: any) => {
                  const s = e.students as any;
                  return (
                    <TableRow key={e.student_id}>
                      <TableCell>{e.roll_number || "—"}</TableCell>
                      <TableCell className="font-medium">{s?.first_name} {s?.last_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s?.parent_name || "—"}</TableCell>
                      <TableCell>
                        {s?.profile_id ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px]">Linked</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Not linked</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => {
                            setLinkStudentId(e.student_id);
                            setShowLinkPortal(true);
                          }}
                        >
                          <Link2 className="h-3 w-3" /> Link Portal
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 font-semibold">No Students</h3>
              <p className="mt-2 text-sm text-muted-foreground">Add students to this class section.</p>
              <Button className="mt-4" onClick={() => setShowAddStudent(true)}>
                <UserPlus className="mr-2 h-4 w-4" /> Add Student
              </Button>
            </CardContent>
          </Card>
        )
      )}

      {!selectedSection && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold">Select a Class</h3>
            <p className="mt-2 text-sm text-muted-foreground">Choose one of your assigned classes to manage students.</p>
          </CardContent>
        </Card>
      )}

      {/* Add Student Dialog */}
      <Dialog open={showAddStudent} onOpenChange={setShowAddStudent}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Student</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input placeholder="First Name *" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <Input placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <Input placeholder="Roll Number" type="number" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} />
            <Input placeholder="Parent/Guardian Name" value={parentName} onChange={(e) => setParentName(e.target.value)} />
            <Input placeholder="Parent Phone" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStudent(false)}>Cancel</Button>
            <Button onClick={() => addStudentMutation.mutate()} disabled={!firstName || addStudentMutation.isPending}>
              {addStudentMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Add Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Portal Dialog */}
      <Dialog open={showLinkPortal} onOpenChange={setShowLinkPortal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Link Portal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={linkType} onValueChange={(v: any) => setLinkType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student Portal</SelectItem>
                <SelectItem value="parent">Parent Portal</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="User's email address"
              type="email"
              value={linkEmail}
              onChange={(e) => setLinkEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The user must have already signed up. This will link their account to the {linkType === "student" ? "student record" : "student as their child"}.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkPortal(false)}>Cancel</Button>
            <Button onClick={() => linkPortalMutation.mutate()} disabled={!linkEmail || linkPortalMutation.isPending}>
              {linkPortalMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
              Link {linkType === "student" ? "Student" : "Parent"} Portal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
