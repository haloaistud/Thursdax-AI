import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Volume2, Mic, Check } from 'lucide-react';

interface PersonalityTrait {
  id: string;
  label: string;
}

interface VoicePersona {
  id: string;
  name: string;
  description: string;
  personalityTraits: PersonalityTrait[];
  voiceType: 'natural' | 'synthetic' | 'enhanced';
  tone: 'professional' | 'casual' | 'friendly' | 'analytical' | 'creative';
  audioSampleUrl: string;
  isPlaying?: boolean;
}

interface PersonaPanelProps {
  personas?: VoicePersona[];
  selectedPersonaId?: string;
  onSelectPersona?: (personaId: string) => void;
}

const DEFAULT_PERSONAS: VoicePersona[] = [
  {
    id: 'persona-1',
    name: 'Alex',
    description: 'Professional and articulate AI assistant with clear communication',
    personalityTraits: [
      { id: 'trait-1', label: 'Professional' },
      { id: 'trait-2', label: 'Articulate' },
      { id: 'trait-3', label: 'Confident' },
    ],
    voiceType: 'natural',
    tone: 'professional',
    audioSampleUrl: '/audio/persona-alex.mp3',
  },
  {
    id: 'persona-2',
    name: 'Jordan',
    description: 'Friendly and approachable assistant perfect for casual conversations',
    personalityTraits: [
      { id: 'trait-4', label: 'Friendly' },
      { id: 'trait-5', label: 'Approachable' },
      { id: 'trait-6', label: 'Warm' },
    ],
    voiceType: 'natural',
    tone: 'friendly',
    audioSampleUrl: '/audio/persona-jordan.mp3',
  },
  {
    id: 'persona-3',
    name: 'Casey',
    description: 'Analytical and detail-oriented assistant for technical discussions',
    personalityTraits: [
      { id: 'trait-7', label: 'Analytical' },
      { id: 'trait-8', label: 'Precise' },
      { id: 'trait-9', label: 'Intelligent' },
    ],
    voiceType: 'enhanced',
    tone: 'analytical',
    audioSampleUrl: '/audio/persona-casey.mp3',
  },
  {
    id: 'persona-4',
    name: 'Riley',
    description: 'Creative and expressive assistant for brainstorming and ideation',
    personalityTraits: [
      { id: 'trait-10', label: 'Creative' },
      { id: 'trait-11', label: 'Expressive' },
      { id: 'trait-12', label: 'Imaginative' },
    ],
    voiceType: 'enhanced',
    tone: 'creative',
    audioSampleUrl: '/audio/persona-riley.mp3',
  },
  {
    id: 'persona-5',
    name: 'Morgan',
    description: 'Casual and laid-back assistant for relaxed interactions',
    personalityTraits: [
      { id: 'trait-13', label: 'Casual' },
      { id: 'trait-14', label: 'Relaxed' },
      { id: 'trait-15', label: 'Humorous' },
    ],
    voiceType: 'synthetic',
    tone: 'casual',
    audioSampleUrl: '/audio/persona-morgan.mp3',
  },
];

const VOICE_TYPE_COLORS: Record<string, string> = {
  natural: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  synthetic: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  enhanced: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const TONE_COLORS: Record<string, string> = {
  professional:
    'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  casual:
    'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  friendly: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  analytical: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  creative: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
};

const PersonaCard: React.FC<{
  persona: VoicePersona;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onPlayAudio: (id: string) => void;
  isPlaying: boolean;
}> = ({ persona, isSelected, onSelect, onPlayAudio, isPlaying }) => {
  return (
    <Card
      className={`cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'ring-2 ring-blue-500 shadow-lg dark:ring-blue-400'
          : 'hover:shadow-md'
      }`}
      onClick={() => onSelect(persona.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {persona.name}
              {isSelected && (
                <Check className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              )}
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              {persona.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Personality Traits */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Personality Traits
          </p>
          <div className="flex flex-wrap gap-2">
            {persona.personalityTraits.map((trait) => (
              <Badge
                key={trait.id}
                variant="secondary"
                className="text-xs font-medium"
              >
                {trait.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Voice Type and Tone Indicators */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <Mic className="w-3 h-3" />
              Voice Type
            </p>
            <Badge
              className={`text-xs font-medium capitalize ${
                VOICE_TYPE_COLORS[persona.voiceType] || VOICE_TYPE_COLORS.natural
              }`}
              variant="outline"
            >
              {persona.voiceType}
            </Badge>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Tone
            </p>
            <Badge
              className={`text-xs font-medium capitalize ${
                TONE_COLORS[persona.tone] || TONE_COLORS.professional
              }`}
              variant="outline"
            >
              {persona.tone}
            </Badge>
          </div>
        </div>

        {/* Audio Sample Button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onPlayAudio(persona.id);
          }}
          variant={isPlaying ? 'default' : 'outline'}
          size="sm"
          className="w-full gap-2"
        >
          <Volume2 className="w-4 h-4" />
          {isPlaying ? 'Playing Sample...' : 'Play Audio Sample'}
        </Button>

        {/* Selection Button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(persona.id);
          }}
          variant={isSelected ? 'default' : 'secondary'}
          size="sm"
          className="w-full"
        >
          {isSelected ? 'Selected' : 'Select Persona'}
        </Button>
      </CardContent>
    </Card>
  );
};

export const PersonaPanel: React.FC<PersonaPanelProps> = ({
  personas = DEFAULT_PERSONAS,
  selectedPersonaId = '',
  onSelectPersona = () => {},
}) => {
  const [playingPersonaId, setPlayingPersonaId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null
  );

  const handlePlayAudio = (personaId: string) => {
    // Stop currently playing audio
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }

    const persona = personas.find((p) => p.id === personaId);
    if (!persona) return;

    // Create and play new audio
    const audio = new Audio(persona.audioSampleUrl);
    setAudioElement(audio);
    setPlayingPersonaId(personaId);

    audio.play().catch((error) => {
      console.error('Failed to play audio sample:', error);
      setPlayingPersonaId(null);
    });

    audio.onended = () => {
      setPlayingPersonaId(null);
      setAudioElement(null);
    };

    audio.onerror = () => {
      console.error('Audio playback error for persona:', personaId);
      setPlayingPersonaId(null);
      setAudioElement(null);
    };
  };

  const handleSelectPersona = (personaId: string) => {
    onSelectPersona(personaId);
  };

  return (
    <div className="w-full space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          AI Voice Personas
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Select your preferred AI personality and voice style for personalized
          interactions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {personas.map((persona) => (
          <PersonaCard
            key={persona.id}
            persona={persona}
            isSelected={selectedPersonaId === persona.id}
            onSelect={handleSelectPersona}
            onPlayAudio={handlePlayAudio}
            isPlaying={playingPersonaId === persona.id}
          />
        ))}
      </div>

      {selectedPersonaId && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              ✓ Selected Persona:{' '}
              <span className="font-semibold">
                {personas.find((p) => p.id === selectedPersonaId)?.name}
              </span>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PersonaPanel;
