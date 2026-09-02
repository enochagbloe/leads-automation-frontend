import type { AppointmentAssigneeOption } from "@/types/appointment";
import type { BusinessMemberOption } from "@/types/auth";

export function businessMemberId(member: BusinessMemberOption) {
  return member.membershipId || member.id;
}

export function businessMemberName(member: BusinessMemberOption) {
  return [member.user.firstName, member.user.lastName].filter(Boolean).join(" ") || member.user.email || "Team member";
}

export function isAssignableBusinessMember(member: BusinessMemberOption) {
  return member.status === "ACTIVE" && member.canReceiveAssignedWork === true;
}

export function assignableBusinessMembers(members: BusinessMemberOption[] = []) {
  return members.filter(isAssignableBusinessMember);
}

export function businessMemberDescription(member: BusinessMemberOption) {
  return [member.positionTitle, member.user.email, member.role].filter(Boolean).join(" · ");
}

export function businessMemberSelectOption(member: BusinessMemberOption) {
  return {
    value: businessMemberId(member),
    label: businessMemberName(member),
    description: businessMemberDescription(member),
  };
}

export function appointmentAssigneeOptions(members: BusinessMemberOption[] = []): AppointmentAssigneeOption[] {
  return assignableBusinessMembers(members).map((member) => ({
    id: businessMemberId(member),
    name: businessMemberName(member),
    email: member.user.email,
    role: member.role,
  }));
}
