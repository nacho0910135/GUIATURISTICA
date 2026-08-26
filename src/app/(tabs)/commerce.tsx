import { FeatureScreen } from '@/components/feature-screen';

export default function CommerceScreen() {
  return <FeatureScreen titleKey="commerceTitle" bodyKey="commerceBody" icon="storefront-outline" accent="#e9574d" rows={[
    { label: 'verified', detail: { es: 'Distintivos CST e inscripción ICT visibles', en: 'Visible CST badges and ICT registration' }, icon: 'shield-check-outline' },
    { label: 'nearby', detail: { es: 'Hospedaje, gastronomía, tours y bienestar', en: 'Lodging, food, tours and wellness' }, icon: 'map-marker-distance' },
    { label: 'save', detail: { es: 'Creá tu lista para el próximo viaje', en: 'Build a list for your next trip' }, icon: 'bookmark-outline', protected: true },
  ]} />;
}
