import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native';

import { REPORT_TYPES, submitInformationReport, type ReportTargetType, type ReportType } from '@/lib/reports';
import { useApp } from '@/providers/app-provider';

const ALLOWED: Record<ReportTargetType, ReportType[]> = {
  destination: ['incorrect_information', 'destination_closed', 'price_changed', 'hours_outdated'],
  commercial_service: ['incorrect_information', 'price_changed', 'hours_outdated', 'business_closed'],
  road: ['road_affected', 'incorrect_information'],
};

export function InformationReportModal({ open, targetType, targetId, targetKey, targetLabel, language, onClose, onSubmitted }: {
  open: boolean;
  targetType: ReportTargetType;
  targetId?: string;
  targetKey?: string;
  targetLabel: string;
  language: 'es' | 'en';
  onClose: () => void;
  onSubmitted?: () => void;
}) {
  const { requireAuth } = useApp();
  const [reportType, setReportType] = useState<ReportType>(ALLOWED[targetType][0]);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const options = REPORT_TYPES.filter((option) => ALLOWED[targetType].includes(option.id));
  const submit = async () => {
    if (!requireAuth(language === 'es' ? 'Reportar información incorrecta' : 'Report incorrect information')) return;
    setSending(true); setError('');
    try {
      await submitInformationReport({ targetType, targetId, targetKey, targetLabel, reportType, details });
      setSent(true); onSubmitted?.();
    } catch (reason) { setError(reason instanceof Error && reason.message === 'authentication_required' ? (language === 'es' ? 'Iniciá sesión para enviar reportes.' : 'Sign in to send reports.') : (language === 'es' ? 'No pudimos enviar el reporte.' : 'We could not send the report.')); }
    finally { setSending(false); }
  };
  const close = () => { setSent(false); setDetails(''); setError(''); onClose(); };
  return <Modal animationType="slide" onRequestClose={close} transparent visible={open}><View className="flex-1 justify-end bg-black/50"><View className="max-h-[88%] rounded-t-3xl bg-ui-surface p-6 dark:bg-ui-dark-surface"><View className="flex-row items-center"><MaterialCommunityIcons name="flag-outline" size={25} color="#B42318" /><Text className="ml-3 flex-1 text-xl font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Reportar información' : 'Report information'}</Text><Pressable accessibilityLabel={language === 'es' ? 'Cerrar' : 'Close'} onPress={close}><MaterialCommunityIcons name="close" size={25} color="#68737A" /></Pressable></View><Text className="mt-2 text-sm font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{targetLabel}</Text>{sent ? <View className="items-center py-10"><MaterialCommunityIcons name="check-circle-outline" size={52} color="#087443" /><Text className="mt-4 text-center text-lg font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Reporte enviado' : 'Report sent'}</Text><Text className="mt-2 text-center text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Lo revisaremos y actualizaremos la ficha si corresponde.' : 'We will review it and update the listing if needed.'}</Text><Pressable className="mt-6 rounded-2xl bg-ui-primary px-6 py-3" onPress={close}><Text className="font-black text-white">{language === 'es' ? 'Cerrar' : 'Close'}</Text></Pressable></View> : <><Text className="mt-5 text-xs font-black uppercase tracking-wider text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? '¿Qué cambió?' : 'What changed?'}</Text><View className="mt-2 gap-2">{options.map((option) => <Pressable key={option.id} className={reportType === option.id ? 'rounded-2xl bg-ui-primary-soft p-3 dark:bg-ui-dark-primary-soft' : 'rounded-2xl border border-ui-border p-3 dark:border-ui-dark-border'} onPress={() => setReportType(option.id)}><Text className={reportType === option.id ? 'font-black text-ui-primary dark:text-ui-dark-primary' : 'font-bold text-ui-text dark:text-ui-dark-text'}>{option[language]}</Text></Pressable>)}</View><TextInput value={details} onChangeText={setDetails} maxLength={2000} multiline placeholder={language === 'es' ? 'Detalles, fecha o fuente (opcional)' : 'Details, date or source (optional)'} className="mt-3 min-h-20 rounded-2xl border border-ui-border px-4 py-3 text-ui-text dark:border-ui-dark-border dark:text-ui-dark-text" textAlignVertical="top" />{error ? <Text className="mt-2 text-xs font-semibold text-red-600">{error}</Text> : null}<View className="mt-4 flex-row gap-3"><Pressable className="flex-1 rounded-2xl border border-ui-border py-3 dark:border-ui-dark-border" onPress={close}><Text className="text-center font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Cancelar' : 'Cancel'}</Text></Pressable><Pressable className="flex-1 items-center justify-center rounded-2xl bg-ui-primary py-3" disabled={sending} onPress={() => void submit()}>{sending ? <ActivityIndicator color="white" /> : <Text className="text-center font-black text-white">{language === 'es' ? 'Enviar reporte' : 'Send report'}</Text>}</Pressable></View></>}</View></View></Modal>;
}
