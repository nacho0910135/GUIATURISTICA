import { supabase } from '@/lib/supabase';

export type ReportTargetType = 'destination' | 'commercial_service' | 'road' | 'traveler' | 'traveler_post';
export type ReportType = string;
export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';
export type ModerationAction = 'remove_content' | 'restrict_user' | 'remove_and_restrict';

export type InformationReport = {
  id: string;
  target_type: ReportTargetType;
  target_id: string | null;
  target_key: string | null;
  target_label: string;
  report_type: ReportType;
  details: string | null;
  status: ReportStatus;
  resolution_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  moderation_action: ModerationAction | null;
  actioned_at: string | null;
};

export function reportTypeLabel(type: ReportType, language: 'es' | 'en') {
  return type.replaceAll('_', ' ');
}

export async function submitInformationReport(input: {
  targetType: ReportTargetType;
  targetId?: string;
  targetKey?: string;
  targetLabel: string;
  reportType: ReportType;
  details?: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const reporterId = auth.user?.id;
  if (!reporterId) throw new Error('authentication_required');
  const { data, error } = await supabase.from('information_reports').insert({
    reporter_id: reporterId,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    target_key: input.targetKey ?? null,
    target_label: input.targetLabel.trim(),
    report_type: input.reportType,
    details: input.details?.trim() || null,
  }).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function getInformationReportsForAdmin() {
  const { data, error } = await supabase.from('information_reports')
    .select('id,target_type,target_id,target_key,target_label,report_type,details,status,resolution_note,created_at,reviewed_at,moderation_action,actioned_at')
    .in('status', ['open', 'reviewing'])
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as InformationReport[];
}

export async function moderateInformationReport(id: string, action: ModerationAction) {
  const { error } = await supabase.rpc('moderate_information_report', { p_report_id: id, p_action: action });
  if (error) throw error;
}

export async function updateInformationReportStatus(id: string, status: ReportStatus, resolutionNote?: string) {
  const { error } = await supabase.from('information_reports').update({
    status,
    resolution_note: resolutionNote?.trim() || null,
    reviewed_at: status === 'open' ? null : new Date().toISOString(),
  }).eq('id', id);
  if (error) throw error;
}
