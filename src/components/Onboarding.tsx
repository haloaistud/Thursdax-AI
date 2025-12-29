import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, ArrowRight, Check } from 'lucide-react';

interface VoicePersona {
  id: string;
  name: string;
  description: string;
  accent: string;
  traits: string[];
  emoji: string;
}

const VOICE_PERSONAS: VoicePersona[] = [
  {
    id: 'professional',
    name: 'Professional',
    description: 'Clear, articulate, and business-focused',
    accent: 'American',
    traits: ['formal', 'confident', 'efficient'],
    emoji: '💼',
  },
  {
    id: 'friendly',
    name: 'Friendly',
    description: 'Warm, approachable, and conversational',
    accent: 'British',
    traits: ['warm', 'helpful', 'engaging'],
    emoji: '😊',
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Expressive, energetic, and imaginative',
    accent: 'Australian',
    traits: ['expressive', 'fun', 'artistic'],
    emoji: '🎨',
  },
  {
    id: 'analytical',
    name: 'Analytical',
    description: 'Precise, detail-oriented, and logical',
    accent: 'Neutral',
    traits: ['precise', 'thoughtful', 'methodical'],
    emoji: '🧠',
  },
];

interface OnboardingProps {
  onComplete?: (selectedPersona: string) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<'welcome' | 'selection' | 'confirmation'>('welcome');
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [isAnimatingText, setIsAnimatingText] = useState(true);

  const handlePersonaSelect = (personaId: string) => {
    setSelectedPersona(personaId);
  };

  const handleStartClick = () => {
    if (currentStep === 'welcome') {
      setCurrentStep('selection');
    } else if (selectedPersona && currentStep === 'selection') {
      setCurrentStep('confirmation');
      setTimeout(() => {
        onComplete?.(selectedPersona);
      }, 2000);
    }
  };

  const handleBack = () => {
    if (currentStep === 'selection') {
      setCurrentStep('welcome');
      setSelectedPersona(null);
    } else if (currentStep === 'confirmation') {
      setCurrentStep('selection');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center p-4 overflow-hidden">
      {/* Animated background elements */}
      <motion.div
        className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-3xl opacity-20"
        animate={{
          x: [0, 50, -50, 0],
          y: [0, -50, 50, 0],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-0 right-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
        animate={{
          x: [0, -50, 50, 0],
          y: [0, 50, -50, 0],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      {/* Main content container */}
      <div className="relative z-10 max-w-2xl w-full">
        <AnimatePresence mode="wait">
          {/* Welcome Screen */}
          {currentStep === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              {/* Logo/Header */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 100, delay: 0.2 }}
                className="mb-8"
              >
                <div className="w-24 h-24 mx-auto bg-white bg-opacity-20 backdrop-blur-lg rounded-3xl flex items-center justify-center border border-white border-opacity-30">
                  <Volume2 className="w-12 h-12 text-white" />
                </div>
              </motion.div>

              {/* Main heading with animated greeting */}
              <motion.h1
                className="text-5xl md:text-6xl font-bold text-white mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                Welcome to
              </motion.h1>

              <motion.h2
                className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-yellow-200 to-pink-200 bg-clip-text text-transparent mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
              >
                Thursdax AI
              </motion.h2>

              {/* Subtitle */}
              <motion.p
                className="text-xl text-white text-opacity-90 mb-12 max-w-lg mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.8 }}
              >
                Your intelligent voice companion powered by advanced AI technology
              </motion.p>

              {/* Animated features list */}
              <motion.div
                className="space-y-4 mb-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.8 }}
              >
                {['Intelligent Conversations', 'Voice Recognition', 'Personalized Experience'].map(
                  (feature, index) => (
                    <motion.div
                      key={feature}
                      className="flex items-center justify-center text-white text-opacity-80"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.1 + index * 0.1, duration: 0.5 }}
                    >
                      <Check className="w-5 h-5 mr-3 text-yellow-300" />
                      {feature}
                    </motion.div>
                  )
                )}
              </motion.div>

              {/* Start button */}
              <motion.button
                onClick={handleStartClick}
                className="px-8 py-4 bg-white text-purple-600 rounded-full font-bold text-lg flex items-center justify-center gap-3 mx-auto hover:bg-yellow-200 transition-colors shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3, duration: 0.6 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}

          {/* Voice Persona Selection */}
          {currentStep === 'selection' && (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
            >
              {/* Header */}
              <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-3">
                  Choose Your Voice Persona
                </h2>
                <p className="text-white text-opacity-80 text-lg">
                  Select the voice assistant that resonates with you
                </p>
              </motion.div>

              {/* Persona cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {VOICE_PERSONAS.map((persona, index) => (
                  <motion.div
                    key={persona.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: 0.3 + index * 0.1,
                      type: 'spring',
                      stiffness: 100,
                    }}
                  >
                    <motion.button
                      onClick={() => handlePersonaSelect(persona.id)}
                      className={`w-full p-6 rounded-2xl border-2 transition-all backdrop-blur-lg ${
                        selectedPersona === persona.id
                          ? 'border-yellow-300 bg-white bg-opacity-25'
                          : 'border-white border-opacity-30 bg-white bg-opacity-10 hover:bg-opacity-20 hover:border-opacity-50'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Persona content */}
                      <div className="text-left">
                        {/* Header with emoji and selection indicator */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-4xl">{persona.emoji}</span>
                            <h3 className="text-2xl font-bold text-white">
                              {persona.name}
                            </h3>
                          </div>
                          {selectedPersona === persona.id && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-6 h-6 bg-yellow-300 rounded-full flex items-center justify-center"
                            >
                              <Check className="w-4 h-4 text-purple-600" />
                            </motion.div>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-white text-opacity-80 mb-3">
                          {persona.description}
                        </p>

                        {/* Accent */}
                        <p className="text-sm text-white text-opacity-60 mb-3">
                          <span className="font-semibold">Accent:</span> {persona.accent}
                        </p>

                        {/* Traits */}
                        <div className="flex flex-wrap gap-2">
                          {persona.traits.map((trait) => (
                            <span
                              key={trait}
                              className="px-3 py-1 bg-white bg-opacity-20 text-white text-sm rounded-full text-opacity-80"
                            >
                              {trait}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.button>
                  </motion.div>
                ))}
              </div>

              {/* Action buttons */}
              <motion.div
                className="flex gap-4 justify-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                <motion.button
                  onClick={handleBack}
                  className="px-8 py-3 bg-white bg-opacity-20 text-white rounded-full font-bold border border-white border-opacity-30 hover:bg-opacity-30 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Back
                </motion.button>
                <motion.button
                  onClick={handleStartClick}
                  disabled={!selectedPersona}
                  className={`px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-all ${
                    selectedPersona
                      ? 'bg-white text-purple-600 hover:bg-yellow-200 cursor-pointer'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-50'
                  }`}
                  whileHover={selectedPersona ? { scale: 1.05 } : {}}
                  whileTap={selectedPersona ? { scale: 0.95 } : {}}
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </motion.div>
            </motion.div>
          )}

          {/* Confirmation Screen */}
          {currentStep === 'confirmation' && selectedPersona && (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              {/* Success icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 100,
                  delay: 0.2,
                }}
                className="mb-8"
              >
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Check className="w-16 h-16 text-white" />
                  </motion.div>
                </div>
              </motion.div>

              {/* Confirmation message */}
              <motion.h2
                className="text-4xl font-bold text-white mb-4"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                Perfect!
              </motion.h2>

              <motion.p
                className="text-xl text-white text-opacity-80 mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                You've selected the{' '}
                <span className="font-bold">
                  {VOICE_PERSONAS.find((p) => p.id === selectedPersona)?.name}
                </span>{' '}
                voice persona
              </motion.p>

              <motion.p
                className="text-lg text-white text-opacity-70 mb-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.5 }}
              >
                Get ready to experience intelligent conversations like never before
              </motion.p>

              {/* Loading indicator */}
              <motion.div
                className="flex justify-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.5 }}
              >
                {[0, 1, 2].map((index) => (
                  <motion.div
                    key={index}
                    className="w-3 h-3 bg-white rounded-full"
                    animate={{ y: [0, -10, 0] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: index * 0.1,
                    }}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Onboarding;
