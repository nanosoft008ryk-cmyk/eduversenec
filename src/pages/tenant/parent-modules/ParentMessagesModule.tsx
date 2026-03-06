import { useMemo } from "react";
import { ChildInfo } from "@/hooks/useMyChildren";
import { MessagesModule } from "@/pages/tenant/modules/MessagesModule";

interface ParentMessagesModuleProps {
  child: ChildInfo | null;
  schoolId: string | null;
}

const ParentMessagesModule = ({ child, schoolId }: ParentMessagesModuleProps) => {
  if (!schoolId) {
    return (
      <div className="text-center text-muted-foreground py-12">
        Loading...
      </div>
    );
  }

  return <MessagesModule schoolId={schoolId} isStudentPortal={false} />;
};

export default ParentMessagesModule;
