// Message catalogue for user-friendly, secure error presentation keyed by error code

export const ERROR_MESSAGES: Record<string, string> = {
  insufficient_role: "You do not have permission to perform this action. Contact an administrator if you need access.",
  self_approval: "Separation of duties: you created this proposal and cannot approve or reject it.",
  not_demo_environment: "Demo controls are only available in a dedicated demo environment.",
  schedule_conflict: "The proposed interview time clashes with existing room, interviewer, or student bookings.",
  stale_base: "The published schedule changed after this draft or proposal began. Please reload the latest schedule.",
  stale_version: "This record was updated by another user. Reloading latest state.",
  already_decided: "This proposal has already been decided by another officer.",
  draft_exists: "An open draft already exists. You can continue editing the existing draft.",
  network_error: "We could not connect to the operations server. Please check your network connection.",
  unexpected_data: "We received data in an unexpected format. Try again, and quote reference {ref} to support if it continues.",
  generic_error: "Something went wrong while processing your request. Please try again with reference {ref}."
};

export function getErrorMessage(code: string, requestId?: string): string {
  const template = ERROR_MESSAGES[code] || ERROR_MESSAGES.generic_error!;
  return template.replace('{ref}', requestId || 'REQ-' + Math.random().toString(36).substring(2, 8).toUpperCase());
}
