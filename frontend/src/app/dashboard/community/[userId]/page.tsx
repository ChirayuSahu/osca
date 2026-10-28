"use client";

import { useParams } from "next/navigation";
import { ProfileView } from "@/components/profile/profile-view";

// Another contributor's profile, opened from a Community card
export default function ContributorProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  return <ProfileView userId={userId} />;
}
