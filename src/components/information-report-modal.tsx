import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Flag, X } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';

import { Button as UiButton } from '@/components/ui/button';
import { PremiumSheetBackground, SheetHandle, SheetSurface } from '@/components/ui/sheet-surface';
import { getAppOptions } from '@/lib/app-options';
import { haptic } from '@/lib/haptics';
import { submitInformationReport, type ReportTargetType, type ReportType } from '@/lib/reports';
import { useApp } from '@/providers/app-provider';

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
  const sheet = useRef<BottomSheet>(null);
  const [reportType, setReportType] = useState<ReportType>('');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const catalog = useQuery({ queryKey: ['app-options', 'report_type'], queryFn: () => getAppOptions('report_type'), staleTime: Infinity });
  const options = (catalog.data ?? []).filter((option) => option.allowed_targets?.includes(targetType));
  const selectedType = options.some((option) => option.id === reportType) ? reportType : options[0]?.id ?? '';

  const resetAndClose = useCallback(() => {
    setSent(false);
    setDetails('');
    setError('');
    onClose();
  }, [onClose]);

  const submit = async () => {
    if (sending || !requireAuth(language === 'es' ? 'Reportar información incorrecta' : 'Report incorrect information')) return;
    setSending(true);
    setError('');
    try {
      if (!selectedType) return;
      await submitInformationReport({ targetType, targetId, targetKey, targetLabel, reportType: selectedType, details });
      setSent(true);
      void haptic('success');
      onSubmitted?.();
    } catch (reason) {
      void haptic('error');
      setError(reason instanceof Error && reason.message === 'authentication_required' ? (language === 'es' ? 'Iniciá sesión para enviar reportes.' : 'Sign in to send reports.') : language === 'es' ? 'No pudimos enviar el reporte. Revisá tu conexión e intentá de nuevo.' : 'We could not send the report. Check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal animationType="fade" onRequestClose={() => sheet.current?.close()} transparent visible={open}>
      <View className="flex-1">
        <BottomSheet
          backdropComponent={(props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} opacity={0.42} pressBehavior="close" />}
          backgroundComponent={PremiumSheetBackground}
          enableDynamicSizing={false}
          enablePanDownToClose
          handleComponent={SheetHandle}
          index={0}
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
          onClose={resetAndClose}
          ref={sheet}
          snapPoints={['74%', '92%']}
        >
          <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <SheetSurface>
          <View className="flex-row items-start">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/30"><Flag color="#B42318" size={21} strokeWidth={1.9} /></View>
            <View className="ml-3 flex-1"><Text className="font-display text-xl tracking-tight text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Reportar información' : 'Report information'}</Text><Text className="mt-1 font-sans text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{targetLabel}</Text></View>
            <Pressable accessibilityLabel={language === 'es' ? 'Cerrar' : 'Close'} accessibilityRole="button" className="h-11 w-11 items-center justify-center rounded-full bg-ui-muted dark:bg-ui-dark-muted" onPress={() => sheet.current?.close()}><X color="#68737A" size={20} /></Pressable>
          </View>

          {sent ? (
            <View className="items-center px-5 py-12">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-ui-primary-soft dark:bg-ui-dark-primary-soft"><CheckCircle2 color="#087443" size={42} strokeWidth={1.7} /></View>
              <Text className="mt-5 font-display text-center text-xl text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Reporte enviado' : 'Report sent'}</Text>
              <Text className="mt-2 max-w-sm text-center font-sans leading-6 text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Revisaremos la información y actualizaremos la ficha cuando corresponda.' : 'We will review the information and update the listing when appropriate.'}</Text>
              <UiButton className="mt-7 self-stretch" label={language === 'es' ? 'Cerrar' : 'Close'} onPress={() => sheet.current?.close()} />
            </View>
          ) : (
            <View className="mt-7">
              {catalog.isError ? (
                <UiButton emphasis="outline" label={language === 'es' ? 'Reintentar cargar opciones' : 'Retry loading options'} onPress={() => void catalog.refetch()} />
              ) : (
                <>
                  <Text className="font-sans text-xs font-bold uppercase tracking-widest text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? '¿Qué cambió?' : 'What changed?'}</Text>
                  <View className="mt-3 gap-2">
                    {options.map((option) => {
                      const selected = selectedType === option.id;
                      return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} className={selected ? 'min-h-12 justify-center rounded-control border border-ui-primary bg-ui-primary-soft px-4 dark:border-ui-dark-primary dark:bg-ui-dark-primary-soft' : 'min-h-12 justify-center rounded-control border border-ui-border px-4 dark:border-ui-dark-border'} key={option.id} onPress={() => { setReportType(option.id); void haptic('selection'); }}><Text className={selected ? 'font-sans font-bold text-ui-primary dark:text-ui-dark-primary' : 'font-sans font-semibold text-ui-text dark:text-ui-dark-text'}>{language === 'es' ? option.label_es : option.label_en}</Text></Pressable>;
                    })}
                  </View>
                </>
              )}
              <Text className="mb-2 mt-5 font-sans text-xs font-bold uppercase tracking-widest text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Detalles opcionales' : 'Optional details'}</Text>
              <TextInput accessibilityLabel={language === 'es' ? 'Detalles del reporte' : 'Report details'} className="min-h-28 rounded-control border border-ui-border bg-ui-muted px-4 py-3 font-sans text-ui-text dark:border-ui-dark-border dark:bg-ui-dark-muted dark:text-ui-dark-text" maxLength={2000} multiline onChangeText={setDetails} placeholder={language === 'es' ? 'Fecha, fuente o contexto útil' : 'Date, source or useful context'} placeholderTextColor="#68737A" textAlignVertical="top" value={details} />
              {error ? <Text accessibilityRole="alert" className="mt-3 font-sans text-sm font-semibold text-ui-danger dark:text-ui-dark-danger">{error}</Text> : null}
              <View className="mt-5 flex-row gap-3"><UiButton className="flex-1" emphasis="outline" intent="neutral" label={language === 'es' ? 'Cancelar' : 'Cancel'} onPress={() => sheet.current?.close()} /><UiButton className="flex-1" busy={sending} disabled={!selectedType} label={language === 'es' ? 'Enviar reporte' : 'Send report'} onPress={() => void submit()} /></View>
            </View>
          )}
            </SheetSurface>
          </BottomSheetScrollView>
        </BottomSheet>
      </View>
    </Modal>
  );
}
