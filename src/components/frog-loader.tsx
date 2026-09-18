import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@/theme/theme-provider';

type FrogLoaderProps = {
  accessibilityLabel?: string;
  branded?: boolean;
  className?: string;
  color?: string;
  size?: 'small' | 'large' | number;
  style?: StyleProp<ViewStyle>;
};

const frogOpen = require('@/assets/brand/frog1.png');
const frogBlink = require('@/assets/brand/frog2.png');
// Asegúrate de que esta ruta sea correcta en tu proyecto
const Panel = require('@/assets/brand/panel.png');

export function FrogLoader(props: FrogLoaderProps) {
  if (!props.branded) return null;
  return <BrandedFrogLoader {...props} />;
}

function BrandedFrogLoader({
  accessibilityLabel = 'Cargando',
  className,
  size = 'small',
  style,
}: FrogLoaderProps) {
  const { colors } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const blinkOpacity = useSharedValue(0);

  // **AJUSTE DE TAMAÑO DEL PANEL**
  // El panel necesita ser más grande que las ranas para que se vea.
  // Definimos una relación de aspecto o un multiplicador.
  // Supongamos que el panel debe ser 2.5 veces más ancho que el icono de la rana.
  const baseDimension = typeof size === 'number' ? size : size === 'large' ? 224 : 48;
  const frogContainerSize = baseDimension;
  const panelWidth = frogContainerSize * 2.5; // CAMBIO AQUÍ: El panel es más ancho
  const panelHeight = panelWidth * 0.75; // CAMBIO AQUÍ: Altura proporcional (ajusta según tu imagen)

  useEffect(() => {
    if (reducedMotion) {
      blinkOpacity.value = 0;
      return;
    }

    blinkOpacity.value = withRepeat(
      withSequence(
        withDelay(650, withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) })),
        withTiming(0, { duration: 110, easing: Easing.in(Easing.quad) }),
        withDelay(850, withTiming(0, { duration: 1 })),
      ),
      -1,
    );
  }, [blinkOpacity, reducedMotion]);

  const blinkStyle = useAnimatedStyle(() => ({ opacity: blinkOpacity.value }));

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      className={className}
      style={[
        styles.container,
        style,
      ]}
    >
      {/* **CONTENEDOR GRUPO (Rana + Panel)**
          Este View agrupa las ranas y el panel para posicionarlos juntos */}
      <View style={styles.graphicGroup}> {/* CAMBIO AQUÍ: Nuevo contenedor */}
        {/* **El Panel** (se renderiza primero para quedar detrás)
            Usamos position: 'absolute' para colocarlo bajo la rana */}
        <Image
          contentFit="contain"
          source={Panel}
          style={[
             StyleSheet.absoluteFill, // Lo estira al tamaño del contenedor padre (graphicGroup)
             {
               width: panelWidth,
               height: panelHeight,
               // Centramos el panel horizontalmente dentro de graphicGroup
               left: (frogContainerSize * 2.5 / 2) * -0.2, // Esto es complejo, mejor centrar graphicGroup
               // Ajuste vertical para que la base de la rana coincida con el panel
               top: frogContainerSize * 0.1,
               opacity: 0.9, // Un poco de transparencia para el efecto
             }
          ]}
        />

        {/* **El Contenedor de las Ranas** */}
        <View style={{ height: frogContainerSize, width: frogContainerSize }}>
          <Image contentFit="contain" source={frogOpen} style={StyleSheet.absoluteFill} />
          <Animated.View style={[StyleSheet.absoluteFill, blinkStyle]}>
            <Image contentFit="contain" source={frogBlink} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>

      </View> {/* FIN CAMBIO AQUÍ */}

      <View style={styles.wordmark}>
        <Text style={[styles.title, { color: colors.text }]}>Descubre <Text style={styles.country}>CR</Text></Text>
        <Text style={[styles.tagline, { color: colors.textMuted }]}>EXPLORÁ DISTINTO 🇨🇷</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'center',
    flex: 1,
    justifyContent: 'center',
    // Eliminamos el translateY global de -48 para centrar mejor todo el bloque
    width: '100%',
  },
  // **NUEVO ESTILO**
  graphicGroup: {
    alignItems: 'center', // Centra horizontalmente la rana y el panel dentro de este bloque
    justifyContent: 'center',
    width: '100%',
    height: 300, // Definimos una altura fija para este grupo para dar espacio al panel
    marginBottom: -50, // Subimos el texto un poco para compensar el tamaño del panel
  },
  country: {
    color: '#EF4B45',
  },
  tagline: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    letterSpacing: 2.2,
    marginTop: 4,
  },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 23,
    letterSpacing: -0.7,
  },
  wordmark: {
    alignItems: 'center',
    // Eliminamos el marginTop: 2, ya que el marginBottom negativo en graphicGroup lo controla
  },
});
