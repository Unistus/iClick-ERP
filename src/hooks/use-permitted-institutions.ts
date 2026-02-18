'use client';

import { useMemo } from "react";
import { collection, doc } from "firebase/firestore";
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";

/**
 * Enterprise hook to retrieve institutions the current user is authorized to access.
 * Super Admins see all; regular users see only their memberships.
 */
export function usePermittedInstitutions() {
  const db = useFirestore();
  const { user } = useUser();

  const isHardcodedAdmin = user?.email === 'enquiry@unistus.co.ke';

  // 1. Check for Super Admin status in registry
  const adminRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, 'system_admins', user.uid);
  }, [db, user]);
  const { data: adminDoc } = useDoc(adminRef);

  const isSuperAdmin = isHardcodedAdmin || (!!adminDoc && adminDoc.isActive !== false);

  // 2. Fetch global list (For Super Admins)
  const allInstRef = useMemoFirebase(() => {
    if (!isSuperAdmin) return null;
    return collection(db, 'institutions');
  }, [db, isSuperAdmin]);
  const { data: allInstitutions, isLoading: allLoading } = useCollection(allInstRef);

  // 3. Fetch user memberships (For standard users)
  const membershipRef = useMemoFirebase(() => {
    if (isSuperAdmin || !user) return null;
    return collection(db, 'user_institutions', user.uid, 'memberships');
  }, [db, user, isSuperAdmin]);
  const { data: memberships, isLoading: memLoading } = useCollection(membershipRef);

  const institutions = useMemo(() => {
    if (isSuperAdmin) {
      return allInstitutions || [];
    }
    // Map membership records to institution-like objects
    return memberships?.map(m => ({
      id: m.institutionId,
      name: m.institutionName,
      role: m.role,
      joinedAt: m.joinedAt
    })) || [];
  }, [isSuperAdmin, allInstitutions, memberships]);

  return {
    institutions,
    isLoading: isSuperAdmin ? allLoading : memLoading,
    isSuperAdmin,
    hasAccess: institutions.length > 0
  };
}
