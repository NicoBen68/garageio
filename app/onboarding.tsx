import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Dimensions, AccessibilityInfo,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOnboardingStore } from '../store/onboardingStore';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    emoji: '🚗',
    title: 'Bienvenue sur GarageIO',
    subtitle: 'Ton carnet d\'entretien intelligent.\nZéro saisie manuelle.',
    bg: '#0F172A',
    accent: '#3B82F6',
  },
  {
    id: '2',
    emoji: '🔍',
    title: 'Ajoute ton véhicule\nen quelques secondes',
    subtitle: 'Saisis ta plaque d\'immatriculation et on récupère automatiquement la marque, le modèle et l\'année.',
    bg: '#0F1A2E',
    accent: '#6366F1',
  },
  {
    id: '3',
    emoji: '🔔',
    title: 'Ne rate plus\naucun entretien',
    subtitle: 'Rappels intelligents par date ET kilométrage. Le premier atteint te prévient.',
    bg: '#0A1A14',
    accent: '#22C55E',
  },
  {
    id: '4',
    emoji: '📸',
    title: 'Scanne tes factures\nautomatiquement',
    subtitle: 'Prends une photo de ta facture. GarageIO extrait la date, le montant et le garage pour toi.',
    bg: '#1A0F1A',
    accent: '#A855F7',
  },
];

export default function OnboardingScreen() {
  const router  = useRouter();
  const flatRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { setOnboardingDone } = useOnboardingStore();

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('onboarding_done', 'true');
    setOnboardingDone(true);
  };

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      flatRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
      // Annonce VoiceOver du nouveau slide
      AccessibilityInfo.announceForAccessibility(
        `Slide ${next + 1} sur ${SLIDES.length} : ${SLIDES[next].title}`
      );
    } else {
      await completeOnboarding();
    }
  };

  const handleSkip = async () => {
    await completeOnboarding();
  };

  const slide = SLIDES[currentIndex];
  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: slide.bg }]}>
      {/* Skip */}
      {!isLast && (
        <TouchableOpacity
          style={styles.skip}
          onPress={handleSkip}
          accessibilityRole="button"
          accessibilityLabel="Passer l'introduction"
        >
          <Text style={styles.skipText} maxFontSizeMultiplier={1.3}>Passer</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        accessible={false}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View
              style={[styles.emojiContainer, { backgroundColor: item.accent + '20', borderColor: item.accent + '40' }]}
              accessibilityElementsHidden
            >
              <Text style={styles.emoji}>{item.emoji}</Text>
            </View>
            <Text
              style={styles.title}
              maxFontSizeMultiplier={1.3}
              accessibilityRole="header"
            >
              {item.title}
            </Text>
            <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>{item.subtitle}</Text>
          </View>
        )}
      />

      {/* Dots */}
      <View
        style={styles.dots}
        accessibilityLabel={`Étape ${currentIndex + 1} sur ${SLIDES.length}`}
        accessibilityRole="progressbar"
        accessibilityValue={{ now: currentIndex + 1, min: 1, max: SLIDES.length }}
      >
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentIndex
                ? [styles.dotActive, { backgroundColor: slide.accent }]
                : styles.dotInactive,
            ]}
            accessibilityElementsHidden
          />
        ))}
      </View>

      {/* Bouton */}
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: slide.accent }]}
        onPress={handleNext}
        accessibilityRole="button"
        accessibilityLabel={isLast ? 'Commencer GarageIO' : 'Slide suivant'}
      >
        <Text style={styles.btnText} maxFontSizeMultiplier={1.3}>
          {isLast ? 'Commencer 🚀' : 'Suivant →'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  skip:           { position: 'absolute', top: 60, right: 24, zIndex: 10, minHeight: 44, justifyContent: 'center' },
  skipText:       { color: '#64748B', fontSize: 15 },
  slide:          { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 24 },
  emojiContainer: { width: 160, height: 160, borderRadius: 80, justifyContent: 'center', alignItems: 'center', borderWidth: 2, marginBottom: 16 },
  emoji:          { fontSize: 72 },
  title:          { fontSize: 28, fontWeight: '800', color: '#F8FAFC', textAlign: 'center', lineHeight: 36 },
  subtitle:       { fontSize: 16, color: '#94A3B8', textAlign: 'center', lineHeight: 24 },
  dots:           { flexDirection: 'row', gap: 8, marginBottom: 32 },
  dot:            { height: 8, borderRadius: 4 },
  dotActive:      { width: 24 },
  dotInactive:    { width: 8, backgroundColor: '#334155' },
  btn:            { paddingHorizontal: 48, paddingVertical: 16, borderRadius: 16, marginHorizontal: 24, minHeight: 44 },
  btnText:        { color: '#fff', fontSize: 17, fontWeight: '700' },
});
